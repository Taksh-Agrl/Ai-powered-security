import { scanFiles } from "../services/scanner.service.js";
import { getRepositoryFiles } from "../services/repo.service.js";
import { enrichFindingsWithGroq } from "../services/groq.service.js";
import { inferLanguageFromName } from "../utils/language.js";
import { buildSummary } from "../utils/risk.js";

export async function scanCode(req, res, next) {
  try {
    const useAI = String(req.body.useAI ?? "true") !== "false";
    let files = [];

    if (req.body.repoUrl) {
      files = await getRepositoryFiles(req.body.repoUrl);
    } else if (req.file) {
      const fileName = req.file.originalname || "uploaded.txt";
      files = [{
        fileName,
        language: req.body.language || inferLanguageFromName(fileName),
        content: req.file.buffer.toString("utf8")
      }];
    } else if (req.body.code) {
      const fileName = req.body.fileName || "snippet.js";
      files = [{
        fileName,
        language: req.body.language || inferLanguageFromName(fileName),
        content: req.body.code
      }];
    }

    if (!files.length) {
      return res.status(400).json({ message: "Provide code, a file upload, or a public GitHub repository URL." });
    }

    const localReport = scanFiles(files);
    const findings = useAI
      ? await enrichFindingsWithGroq(localReport.findings, files)
      : localReport.findings;

    res.json({
      ...localReport,
      findings,
      summary: buildSummary(findings),
      ai: {
        requested: useAI,
        enabled: findings.some((finding) => finding.aiEnhanced)
      }
    });
  } catch (error) {
    next(error);
  }
}
