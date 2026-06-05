import { scanJavaScript } from "../scanners/javascriptScanner.js";
import { scanTextRules } from "../scanners/textScanner.js";
import { buildSummary } from "../utils/risk.js";

export function scanFiles(files) {
  const findings = files.flatMap((file) => scanSingleFile(file));

  return {
    scannedAt: new Date().toISOString(),
    filesScanned: files.length,
    supportedFiles: files.map((file) => file.fileName),
    summary: buildSummary(findings),
    findings
  };
}

function scanSingleFile(file) {
  const normalized = {
    fileName: file.fileName || "snippet",
    language: (file.language || "").toLowerCase(),
    content: file.content || ""
  };

  if (["javascript", "typescript", "jsx", "tsx", "js", "ts"].includes(normalized.language)) {
    return scanJavaScript(normalized);
  }

  return scanTextRules(normalized);
}
