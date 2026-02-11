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

    const { fileUrl, fileType, language, customPrompt } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    console.log(`Downloading file from: ${fileUrl}`);

    // Download the file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentToSummarize = '';

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

    if (!contentToSummarize || contentToSummarize.trim().length === 0) {
      return NextResponse.json({ summary: "Could not extract text from this document." });
    }

    // Limit content length to avoid token limits (basic truncation)
    // GitHub Models (e.g. GPT-4o) have large context, but let's be safe
    const maxLength = 50000; 
    if (contentToSummarize.length > maxLength) {
      contentToSummarize = contentToSummarize.substring(0, maxLength) + '... (truncated)';
    }

    console.log(`Sending content to GitHub Models (length: ${contentToSummarize.length})`);

    let systemPrompt = "You are a professional document summary analyst. Your task is to read the document content provided by the user and output a concise, professional, and actionable summary.\n\n" +
      "Requirements:\n" +
      "- Retain only key facts and conclusions; avoid redundancy and colloquialisms.\n" +
      "- Prioritize summarizing: purpose/background, core points, important data or conclusions, impacts and recommendations (if mentioned).\n" +
      "- Do not add information not mentioned in the document; do not make unfounded speculations.\n" +
      "- If the information is insufficient to form a summary, list the missing information first.\n\n";

    if (customPrompt && customPrompt.trim().length > 0) {
      systemPrompt += `Additional User Instructions (Please prioritize these):\n${customPrompt}\n\n`;
    }

    if (language && language !== 'English') {
      systemPrompt += `Language Requirement:\nPlease output the summary strictly in ${language}.\n\n`;
    }

    systemPrompt += "Format Requirements:\n" +
      "Please output in JSON format with the following structure:\n" +
      "{\n" +
      "  \"summary\": \"The markdown formatted summary content including Title, Executive Summary, Key Points, Conclusion...\",\n" +
      "  \"keywords\": [\"Keyword1\", \"Keyword2\", \"Keyword3\", \"Keyword4\", \"Keyword5\"]\n" +
      "}\n" +
      "Ensure the 'summary' field contains the full markdown summary as previously requested.";

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
      max_tokens: 1500,
      top_p: 1
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    const summary = result.summary;
    const keywords = result.keywords || [];

    return NextResponse.json({ summary, keywords });

  } catch (error: unknown) {
    console.error('Summarization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
