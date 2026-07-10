import fs from 'fs';
import pdfParse from 'pdf-parse';

interface PageData {
  pageNum: number;
  text: string;
}

export async function processPDF(filePath: string): Promise<PageData[]> {
  const buffer = fs.readFileSync(filePath);

  const data = await pdfParse(buffer, {
    pagerender: (pageData: any) => {
      return pageData.getTextContent().then((textContent: any) => {
        return textContent.items.map((item: any) => item.str).join(' ');
      });
    },
  });

  const fullText = data.text;
  const numPages = data.numpages;

  const pages: PageData[] = [];
  if (numPages <= 1) {
    pages.push({ pageNum: 1, text: fullText.trim() });
  } else {
    const pageSplit = fullText.split(/\f/);
    if (pageSplit.length > 1) {
      pageSplit.forEach((text, i) => {
        if (text.trim()) pages.push({ pageNum: i + 1, text: text.trim() });
      });
    } else {
      const charsPerPage = Math.ceil(fullText.length / numPages);
      for (let i = 0; i < numPages; i++) {
        const text = fullText.slice(i * charsPerPage, (i + 1) * charsPerPage).trim();
        if (text) pages.push({ pageNum: i + 1, text });
      }
    }
  }

  return pages;
}
