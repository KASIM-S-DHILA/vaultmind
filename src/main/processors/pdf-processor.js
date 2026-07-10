const fs = require('fs');
const pdfParse = require('pdf-parse');

async function processPDF(filePath) {
  const buffer = fs.readFileSync(filePath);

  const data = await pdfParse(buffer, {
    // Page-by-page rendering for accurate citation
    pagerender: (pageData) => {
      return pageData.getTextContent().then((textContent) => {
        return textContent.items.map(item => item.str).join(' ');
      });
    },
  });

  // Split by page — pdf-parse gives us full text; we estimate pages by dividing
  const fullText = data.text;
  const numPages = data.numpages;

  // Try to split into roughly equal page chunks for citation accuracy
  const pages = [];
  if (numPages <= 1) {
    pages.push({ pageNum: 1, text: fullText.trim() });
  } else {
    // Split on form-feed character (PDF page breaks) if present
    const pageSplit = fullText.split(/\f/);
    if (pageSplit.length > 1) {
      pageSplit.forEach((text, i) => {
        if (text.trim()) pages.push({ pageNum: i + 1, text: text.trim() });
      });
    } else {
      // Rough split by character count
      const charsPerPage = Math.ceil(fullText.length / numPages);
      for (let i = 0; i < numPages; i++) {
        const text = fullText.slice(i * charsPerPage, (i + 1) * charsPerPage).trim();
        if (text) pages.push({ pageNum: i + 1, text });
      }
    }
  }

  return pages;
}

module.exports = { processPDF };
