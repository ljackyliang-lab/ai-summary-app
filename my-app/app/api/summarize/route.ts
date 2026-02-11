import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require("pdf2json");

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_MODELS_API_KEY,
});

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GITHUB_MODELS_API_KEY;
    if (!apiKey) {
      console.error('Error: GITHUB_MODELS_API_KEY is missing in environment variables');
      return NextResponse.json({ error: 'Server configuration error: API Key missing' }, { status: 500 });
    }
    console.log(`API Key loaded (first 4 chars): ${apiKey.substring(0, 4)}***`);

    const { fileUrl, fileType, language, customPrompt, content, mode } = await req.json();

    let contentToSummarize = '';

    // If direct content is provided (e.g. from a specific page), use it
    if (content) {
      console.log('Using provided direct content for summary');
      contentToSummarize = content;
    } 
    else if (fileUrl) {
      console.log(`Downloading file from: ${fileUrl}`);

      // Download the file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileType === 'pdf' || fileUrl.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfParser = new PDFParser();
  
          contentToSummarize = await new Promise((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: { parserError: Error }) => reject(errData.parserError));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
              // Debug: Print structure to help troubleshoot
              // console.log('PDF Data Structure Keys:', Object.keys(pdfData));
              
              // Handle different structure variations
              const root = pdfData.formImage || pdfData;
              
              if (!root || !root.Pages) {
                console.error('Unexpected PDF JSON structure:', JSON.stringify(pdfData).substring(0, 200));
                reject(new Error('Unexpected PDF parsed structure: Pages not found'));
                return;
              }
  
              // Extract text from the parsed JSON structure
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const text = root.Pages.map((page: any) => 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                page.Texts.map((t: any) => {
                  try {
                    return decodeURIComponent(t.R[0].T);
                  } catch (e) {
                    // If decoding fails, return the raw text or a placeholder
                    return t.R[0].T;
                  }
                }).join(" ")
              ).join("\n");
              
              resolve(text);
            });
  
            // Parse the buffer directly
            pdfParser.parseBuffer(buffer);
          });
        } catch (e) {
          console.error('PDF Parse Error:', e);
          throw new Error('Failed to parse PDF content');
        }
      } else {
        // Assume text or try to read as text
        contentToSummarize = buffer.toString('utf-8');
      }
    } else {
       return NextResponse.json({ error: 'Either fileUrl or content is required' }, { status: 400 });
    }

    if (!contentToSummarize || contentToSummarize.trim().length === 0) {
      return NextResponse.json({ summary: "Could not extract text from this document." });
    }

    // Limit content length to avoid token limits (basic truncation)
    // GitHub Models (e.g. GPT-4o) have large context, but let's be safe
    const maxLength = 50000; 
    if (contentToSummarize.length > maxLength) {
      contentToSummarize = contentToSummarize.substring(0, maxLength) + '... (truncated)';
    }

    console.log(`Sending content to GitHub Models (length: ${contentToSummarize.length}, mode: ${mode})`);

    let systemPrompt = "";

    if (mode === 'qa') {
      systemPrompt = "You are a concise and professional document assistant. Your task is to answer the user's specific question based STRICTLY on the provided document content.\n\n" +
        "Requirements:\n" +
        "- Be direct and concise.\n" +
        "- Use professional tone.\n" +
        "- Only answer based on the provided text. If the answer is not in the text, state that clearly.\n" +
        "- Do NOT provide a summary unless explicitly asked.\n\n";
    } else {
      systemPrompt = "You are a professional document summary analyst. Your task is to read the document content provided by the user and output a comprehensive, detailed, and structured summary.\n\n" +
        "Requirements:\n" +
        "- Provide a thorough analysis of the document content.\n" +
        "- Structure the summary with clear headings (Executive Summary, Key Findings, Detailed Analysis, Conclusion).\n" +
        "- Capture all important details, data points, and arguments.\n" +
        "- Prioritize depth over brevity, but maintain clarity.\n" +
        "- Do not add information not mentioned in the document; do not make unfounded speculations.\n" +
        "- Extract 5-10 key concepts or topics from the document as 'keywords'.\n\n";
    }

    if (customPrompt && customPrompt.trim().length > 0) {
      systemPrompt += `User Instructions/Question (Please prioritize these):\n${customPrompt}\n\n`;
    }

    if (language && language !== 'English') {
      systemPrompt += `Language Requirement:\nPlease output the result strictly in ${language}.\n\n`;
    }

    systemPrompt += "Format Requirements:\n" +
      "Please output in JSON format with the following structure:\n" +
      "{\n" +
      "  \"summary\": \"The markdown formatted content (either the summary or the answer to the question)\",\n" +
      "  \"keywords\": [\"Keyword1\", \"Keyword2\"] (Required list of 5-10 extracted keywords strings)\n" +
      "}\n";

    const completion = await client.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { role: "user", content: contentToSummarize }
      ],
      model: "gpt-4o-mini", 
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 3000,
      top_p: 1
    });

    const rawContent = completion.choices[0].message.content || "{}";
    let result;
    
    try {
      result = JSON.parse(rawContent);
    } catch (parseError) {
      console.warn('JSON Parse failed, attempting to recover truncated JSON:', parseError);
      // Fallback: try to manually extract content if JSON is malformed/truncated
      result = extractContentFromMalformedJson(rawContent);
    }

    const summary = result.summary || "Summary generation failed (could not parse output).";
    let keywords = result.keywords || [];

    // Sanitize keywords: flatten and split if necessary
    if (Array.isArray(keywords)) {
      keywords = keywords.flatMap((k: string) => {
        if (typeof k === 'string' && k.includes(',')) {
          return k.split(',').map(s => s.trim());
        }
        return k;
      });
    } else if (typeof keywords === 'string') {
      // If AI returns a single string instead of an array
      keywords = (keywords as string).split(',').map(s => s.trim());
    }

    console.log('AI Response Keywords (Sanitized):', keywords);

    return NextResponse.json({ summary, keywords });

  } catch (error: unknown) {
    console.error('Summarization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper to rescue malformed/truncated JSON
function extractContentFromMalformedJson(raw: string): { summary: string, keywords: string[] } {
  let summary = "";
  let keywords: string[] = [];

  try {
    // 1. Try to extract "summary": "..."
    // This is a basic regex that looks for the summary field. 
    // It assumes the summary value starts with " and captures until the next field or end of string.
    // We try to handle escaped quotes roughly.
    const summaryMatch = raw.match(/"summary"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"keywords"|"\s*}$|$)/);
    
    if (summaryMatch) {
      summary = summaryMatch[1];
    } else {
      // Fallback: if we can't find the structure, strip the JSON braces if they exist
      // and assume the rest is the summary.
      // Remove opening {"summary": " and closing "}
      summary = raw
        .replace(/^\s*\{\s*"summary"\s*:\s*"/, '')
        .replace(/"\s*}\s*$/, '')
        .replace(/"\s*,\s*"keywords".*$/, ''); // Remove keywords part if it exists at the end
    }

    // 2. Try to extract keywords
    const keywordsMatch = raw.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    if (keywordsMatch) {
      const keywordsString = keywordsMatch[1];
      // Basic CSV split for "key1", "key2"
      keywords = keywordsString
        .split(',')
        .map(k => k.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''))
        .filter(k => k.length > 0);
    }

    // Clean up summary string (replace escaped newlines/quotes if it was partially parsed)
    // JSON strings have escaped chars like \n, \", etc.
    // If we extracted via Regex, we might still have them.
    try {
      // Try to decode it as a JSON string if it's wrapped in quotes
      // But if it's truncated, JSON.parse(`"${summary}"`) might fail.
      // So we do manual unescaping for common chars.
      summary = summary
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t');
    } catch (e) {
      // ignore
    }

    if (summary.length === 0 && raw.length > 0) {
        summary = raw; // Ultimate fallback
    }
    
    // Append a note that it might be truncated
    summary += "\n\n*(Note: The generated summary may be incomplete due to length limits.)*";

  } catch (e) {
    console.error('Failed to extract content from malformed JSON:', e);
    summary = "Error parsing generated summary.";
  }

  return { summary, keywords };
}
