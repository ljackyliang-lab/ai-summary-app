import React, { useState, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  url: string;
  onPageChange?: (pageNumber: number) => void;
}

export interface PDFViewerHandle {
  getCurrentPageText: () => Promise<string>;
}

const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ url, onPageChange }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [scale, setScale] = useState(1.0);

  // Report initial page on mount
  useEffect(() => {
    if (onPageChange) onPageChange(pageNumber);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages);
    setPdfDocument(pdf);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = Math.min(Math.max(1, prevPageNumber + offset), numPages || 1);
      if (onPageChange) onPageChange(newPage);
      return newPage;
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  useImperativeHandle(ref, () => ({
    getCurrentPageText: async () => {
      if (!pdfDocument) return '';
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return textContent.items.map((item: any) => item.str).join(' ');
      } catch (error) {
        console.error('Error extracting text:', error);
        return '';
      }
    }
  }));

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="p-1 rounded hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
              title="Previous Page"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-600 px-2 min-w-[3rem] text-center">
              {pageNumber} / {numPages || '--'}
            </span>
            <button
              onClick={nextPage}
              disabled={numPages === null || pageNumber >= numPages}
              className="p-1 rounded hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
              title="Next Page"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-200"></div>
          
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="p-1 rounded hover:bg-white hover:shadow-sm transition-all"
              title="Zoom Out"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-600 px-2 min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
              className="p-1 rounded hover:bg-white hover:shadow-sm transition-all"
              title="Zoom In"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          className="bg-white shadow-lg"
          loading={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            className="shadow-md"
            renderTextLayer={true}
            renderAnnotationLayer={false}
            renderForms={false}
          />
        </Document>
      </div>
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;
