/// <reference types="vite/client" />

declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }
  interface PDFOptions {
    pagerender?: (pageData: any) => Promise<string>;
    max?: number;
  }
  function pdfParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export default pdfParse;
}

import 'react';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: string;
  }
}
