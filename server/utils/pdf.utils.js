/**
 * PDF Utility Functions
 *
 * This module provides functions for extracting text from PDF files.
 * It uses a fallback approach to handle PDF parsing more reliably.
 */

/**
 * Extract text content from a PDF file using a direct buffer approach
 * @param {Buffer} fileBuffer - The PDF file buffer
 * @returns {Promise<string>} - The extracted text content
 */
export const extractTextFromPDF = async (fileBuffer) => {
  try {
    // Simple text extraction from PDF buffer
    // This is a basic implementation that extracts text by looking for text markers in the PDF
    const pdfText = fileBuffer.toString("utf8");

    // Extract text between text markers
    let extractedText = "";
    const textMarkers = [
      "/Text",
      "BT",
      "ET",
      "/Contents",
      "/Title",
      "/Subject",
      "/Keywords",
      "/Author",
    ];

    // Look for text content between PDF markers
    for (let i = 0; i < pdfText.length; i++) {
      // Find potential text content
      if (pdfText[i] === "(" && pdfText[i + 1] !== "\\") {
        let j = i + 1;
        let textChunk = "";
        let depth = 1;

        // Extract text until closing parenthesis, handling nested parentheses
        while (j < pdfText.length && depth > 0) {
          if (pdfText[j] === "(" && pdfText[j - 1] !== "\\") {
            depth++;
          } else if (pdfText[j] === ")" && pdfText[j - 1] !== "\\") {
            depth--;
            if (depth === 0) break;
          }

          if (depth > 0) textChunk += pdfText[j];
          j++;
        }

        // Add non-empty text chunks that look like actual text (not binary data)
        if (textChunk.length > 1 && /[a-zA-Z0-9\s.,;:!?]/.test(textChunk)) {
          extractedText += textChunk + "\n";
        }

        i = j;
      }
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\\(\d{3})/g, (match, octal) =>
        String.fromCharCode(parseInt(octal, 8))
      );

    return extractedText || "No text content could be extracted from this PDF.";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return "Error extracting text from PDF. The file may be corrupted, password-protected, or in an unsupported format.";
  }
};

/**
 * Process PDF files from an array of file objects
 * @param {Array} files - Array of file objects with buffer property
 * @returns {Promise<string>} - Concatenated content string with file names as headers
 */
export const processPDFFiles = async (files) => {
  const pdfFiles = files.filter((file) => file.mimetype === "application/pdf");

  if (pdfFiles.length === 0) {
    return "";
  }

  let combinedContent = "";

  for (const file of pdfFiles) {
    try {
      const content = await extractTextFromPDF(file.buffer);
      // Add file name as header and then the content
      combinedContent += `\n\n=== ${file.originalname} ===\n\n`;
      combinedContent +=
        content || "No text content could be extracted from this PDF.";
    } catch (error) {
      console.error(`Error processing PDF ${file.originalname}:`, error);
      combinedContent += `\n\n=== ${file.originalname} ===\n\n`;
      combinedContent +=
        "Failed to process PDF. The file may be corrupted or in an unsupported format.";
    }
  }

  return combinedContent.trim();
};
