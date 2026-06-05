import AdmZip from "adm-zip";
import { env } from "../config/env.js";
import { inferLanguageFromName, isSupportedSourceFile } from "../utils/language.js";

export async function getRepositoryFiles(repoUrl) {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    const error = new Error("Only public GitHub repository URLs are supported.");
    error.status = 400;
    throw error;
  }

  const metaResponse = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
    headers: { "User-Agent": "ai-security-vulnerability-scanner" }
  });

  if (!metaResponse.ok) {
    const error = new Error("Could not read the public GitHub repository.");
    error.status = metaResponse.status;
    throw error;
  }

  const metadata = await metaResponse.json();
  const branch = metadata.default_branch || "main";
  const zipResponse = await fetch(`https://codeload.github.com/${parsed.owner}/${parsed.repo}/zip/refs/heads/${branch}`);

  if (!zipResponse.ok) {
    const error = new Error("Could not download repository archive.");
    error.status = zipResponse.status;
    throw error;
  }

  const archive = Buffer.from(await zipResponse.arrayBuffer());
  const zip = new AdmZip(archive);

  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      entry,
      relativePath: entry.entryName.split("/").slice(1).join("/")
    }))
    .filter(({ relativePath }) => isSupportedSourceFile(relativePath))
    .slice(0, env.maxRepoFiles)
    .map(({ entry, relativePath }) => {
      const contentBuffer = entry.getData();
      const content = contentBuffer.length > env.maxFileBytes
        ? contentBuffer.subarray(0, env.maxFileBytes).toString("utf8")
        : contentBuffer.toString("utf8");

      return {
        fileName: relativePath,
        language: inferLanguageFromName(relativePath),
        content
      };
    });
}

function parseGitHubUrl(repoUrl) {
  try {
    const url = new URL(repoUrl);
    const [owner, repo] = url.pathname.replace(/^\/|\/$/g, "").split("/");
    if (!owner || !repo || !url.hostname.includes("github.com")) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}
