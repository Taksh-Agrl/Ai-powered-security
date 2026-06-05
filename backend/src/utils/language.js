const LANGUAGE_BY_EXTENSION = {
  ".js": "javascript",
  ".jsx": "jsx",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".java": "java",
  ".go": "go",
  ".php": "php"
};

const IGNORED_SEGMENTS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  "vendor"
];

export function inferLanguageFromName(fileName = "") {
  const lowerName = fileName.toLowerCase();
  const extension = Object.keys(LANGUAGE_BY_EXTENSION).find((ext) => lowerName.endsWith(ext));
  return LANGUAGE_BY_EXTENSION[extension] || "text";
}

export function isSupportedSourceFile(fileName = "") {
  const normalized = fileName.replace(/\\/g, "/");
  if (IGNORED_SEGMENTS.some((segment) => normalized.includes(`/${segment}/`) || normalized.startsWith(`${segment}/`))) {
    return false;
  }
  return inferLanguageFromName(fileName) !== "text";
}
