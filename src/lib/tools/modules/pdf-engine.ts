import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface PdfEngineResult {
  pdfDataUri: string;
  byteLength: number;
  pageCount: number;
  fileName: string;
}

/**
 * Creates a valid PDF from text/markdown content with automatic line wrapping and pagination
 */
export async function createPdfFromText(
  title: string,
  content: string,
  fileName: string = "document.pdf"
): Promise<PdfEngineResult> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2 - 40) / lineHeight);

  // Wrap text into lines
  const lines: { text: string; isHeader?: boolean }[] = [];
  const rawParagraphs = content.split("\n");

  for (const rawPara of rawParagraphs) {
    const trimmed = rawPara.trimEnd();
    if (!trimmed) {
      lines.push({ text: "" });
      continue;
    }

    const isH1 = trimmed.startsWith("# ");
    const isH2 = trimmed.startsWith("## ");
    const isH3 = trimmed.startsWith("### ");
    const cleanText = trimmed.replace(/^#{1,3}\s+/, "");

    // Simple word wrapping
    const words = cleanText.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const lineWidth = (isH1 ? 16 : isH2 ? 14 : 10) * (testLine.length * 0.5); // Approx char width

      if (lineWidth > contentWidth && currentLine) {
        lines.push({ text: currentLine, isHeader: isH1 || isH2 || isH3 });
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push({ text: currentLine, isHeader: isH1 || isH2 || isH3 });
    }
  }

  // Paginate lines
  let currentLineIndex = 0;
  while (currentLineIndex < lines.length || currentLineIndex === 0) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Draw document title on page 1
    if (pdfDoc.getPageCount() === 1 && title) {
      page.drawText(title, {
        x: margin,
        y: y - 10,
        size: 18,
        font: fontBold,
        color: rgb(0.04, 0.08, 0.18),
      });
      // Header divider line
      page.drawLine({
        start: { x: margin, y: y - 20 },
        end: { x: pageWidth - margin, y: y - 20 },
        thickness: 1,
        color: rgb(0.2, 0.6, 0.9),
      });
      y -= 45;
    }

    // Draw lines for this page
    let linesOnPage = 0;
    while (currentLineIndex < lines.length && linesOnPage < maxLinesPerPage) {
      const line = lines[currentLineIndex];
      if (line.text) {
        page.drawText(line.text, {
          x: margin,
          y,
          size: line.isHeader ? 12 : 10,
          font: line.isHeader ? fontBold : fontRegular,
          color: line.isHeader ? rgb(0.05, 0.2, 0.4) : rgb(0.15, 0.15, 0.15),
        });
      }
      y -= lineHeight;
      linesOnPage++;
      currentLineIndex++;
    }

    // Footer page number
    page.drawText(`Halaman ${pdfDoc.getPageCount()}`, {
      x: pageWidth - margin - 60,
      y: margin / 2,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    if (currentLineIndex >= lines.length) break;
  }

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const pdfDataUri = `data:application/pdf;base64,${base64}`;

  return {
    pdfDataUri,
    byteLength: pdfBytes.length,
    pageCount: pdfDoc.getPageCount(),
    fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
  };
}

/**
 * Creates a valid PDF from an array of images (PNG or JPEG)
 */
export async function createPdfFromImages(
  images: { buffer: Uint8Array; mime?: string }[],
  fileName: string = "manga_volume.pdf"
): Promise<PdfEngineResult> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    try {
      let embeddedImage;
      const isPng =
        img.mime === "image/png" ||
        (img.buffer[0] === 0x89 && img.buffer[1] === 0x50 && img.buffer[2] === 0x4e && img.buffer[3] === 0x47);

      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(img.buffer);
      } else {
        embeddedImage = await pdfDoc.embedJpg(img.buffer);
      }

      const { width, height } = embeddedImage;
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    } catch {
      // If embedding a single image fails, skip or add fallback page
      continue;
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    // Add default cover page if no images could be embedded
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText("Dokumen PDF Void Verse (Tidak ada gambar yang valid)", {
      x: 50,
      y: 800,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const pdfDataUri = `data:application/pdf;base64,${base64}`;

  return {
    pdfDataUri,
    byteLength: pdfBytes.length,
    pageCount: pdfDoc.getPageCount(),
    fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
  };
}

/**
 * Merges multiple PDF buffers into a single unified PDF
 */
export async function mergePdfBuffers(
  buffers: Uint8Array[],
  fileName: string = "merged_document.pdf"
): Promise<PdfEngineResult> {
  const mergedPdf = await PDFDocument.create();

  for (const buf of buffers) {
    try {
      const srcPdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch {
      continue;
    }
  }

  if (mergedPdf.getPageCount() === 0) {
    const page = mergedPdf.addPage([595.28, 841.89]);
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    page.drawText("Penggabungan PDF Kosong", { x: 50, y: 800, size: 14, font, color: rgb(0, 0, 0) });
  }

  const pdfBytes = await mergedPdf.save({ useObjectStreams: true });
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const pdfDataUri = `data:application/pdf;base64,${base64}`;

  return {
    pdfDataUri,
    byteLength: pdfBytes.length,
    pageCount: mergedPdf.getPageCount(),
    fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
  };
}

/**
 * Splits a PDF buffer by extracting requested page ranges
 */
export async function splitPdfBuffer(
  buffer: Uint8Array,
  pageIndices: number[],
  fileName: string = "split_pages.pdf"
): Promise<PdfEngineResult> {
  const srcPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const splitPdf = await PDFDocument.create();

  const validIndices = pageIndices.filter((idx) => idx >= 0 && idx < srcPdf.getPageCount());
  if (validIndices.length > 0) {
    const copiedPages = await splitPdf.copyPages(srcPdf, validIndices);
    copiedPages.forEach((page) => splitPdf.addPage(page));
  } else {
    // Fallback: extract page 0
    const copied = await splitPdf.copyPages(srcPdf, [0]);
    splitPdf.addPage(copied[0]);
  }

  const pdfBytes = await splitPdf.save({ useObjectStreams: true });
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const pdfDataUri = `data:application/pdf;base64,${base64}`;

  return {
    pdfDataUri,
    byteLength: pdfBytes.length,
    pageCount: splitPdf.getPageCount(),
    fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
  };
}

/**
 * Compresses a PDF buffer using object stream compression
 */
export async function compressPdfBuffer(
  buffer: Uint8Array,
  fileName: string = "compressed_document.pdf"
): Promise<{
  originalBytes: number;
  compressedBytes: number;
  savedPercentage: number;
  pdfDataUri: string;
  pageCount: number;
  fileName: string;
}> {
  const originalBytes = buffer.length;
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const compressedBytesArray = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  const compressedBytes = compressedBytesArray.length;

  const saved = Math.max(0, originalBytes - compressedBytes);
  const savedPercentage = originalBytes > 0 ? Math.round((saved / originalBytes) * 100) : 0;
  const base64 = Buffer.from(compressedBytesArray).toString("base64");
  const pdfDataUri = `data:application/pdf;base64,${base64}`;

  return {
    originalBytes,
    compressedBytes,
    savedPercentage,
    pdfDataUri,
    pageCount: pdfDoc.getPageCount(),
    fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
  };
}
