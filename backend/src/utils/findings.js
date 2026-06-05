import crypto from "node:crypto";

export function makeFinding(input) {
  const severity = Number(input.severity || 0);
  const details = DETAILS_BY_TYPE[input.type] || {};
  const id = crypto
    .createHash("sha1")
    .update(`${input.fileName}:${input.line}:${input.type}:${input.evidence}`)
    .digest("hex")
    .slice(0, 12);

  return {
    id,
    fileName: input.fileName,
    line: input.line || 1,
    type: input.type,
    severity,
    severityLabel: labelSeverity(severity),
    evidence: input.evidence || "",
    explanation: input.explanation,
    rootCause: input.rootCause || details.rootCause || "",
    exploitScenario: input.exploitScenario,
    fix: input.fix,
    bestPractice: input.bestPractice,
    remediationSteps: input.remediationSteps || details.remediationSteps || [],
    secureExample: input.secureExample || details.secureExample || "",
    references: input.references || details.references || [],
    developerNote: input.developerNote || details.developerNote || "",
    aiEnhanced: false
  };
}

function labelSeverity(score) {
  if (score >= 71) return "Critical";
  if (score >= 31) return "Medium";
  return "Low";
}

const DETAILS_BY_TYPE = {
  "SQL Injection": {
    rootCause: "The code allows executable SQL text and runtime values to be assembled in the same string. When a user-controlled value reaches that string, the database can interpret part of the value as SQL syntax instead of plain data.",
    remediationSteps: [
      "Identify every variable that flows into the query and treat it as untrusted until validated.",
      "Replace string concatenation or template interpolation with placeholders provided by the database driver.",
      "Pass user values as a separate parameters array/object so the driver can escape and bind them safely.",
      "Add tests with inputs such as 1 OR 1=1, quotes, comments, and unexpected types to confirm the query still behaves correctly."
    ],
    secureExample: "db.query(\"SELECT * FROM users WHERE id = ?\", [userId]);",
    references: ["OWASP SQL Injection Prevention Cheat Sheet", "OWASP Top 10: Injection"],
    developerNote: "Validation is useful, but it is not a replacement for parameterized queries. The database boundary should still receive values separately from query text."
  },
  "Cross-Site Scripting": {
    rootCause: "The code writes content into a browser HTML sink that parses strings as markup. If the value contains attacker-controlled HTML, script tags, event handlers, or dangerous URLs can become executable browser code.",
    remediationSteps: [
      "Use textContent or framework interpolation when the value should be displayed as text.",
      "If HTML is truly required, sanitize it with a maintained sanitizer and a restrictive allowlist before rendering.",
      "Avoid passing raw request, query, profile, comment, or CMS values directly into HTML sinks.",
      "Add tests with payloads such as image onerror handlers and script-like markup to verify they render harmlessly."
    ],
    secureExample: "element.textContent = userProvidedValue;",
    references: ["OWASP Cross Site Scripting Prevention Cheat Sheet", "OWASP Top 10: XSS"],
    developerNote: "React escapes normal JSX text by default, but APIs like dangerouslySetInnerHTML and direct DOM writes bypass that protection."
  },
  "Secrets Exposure": {
    rootCause: "A credential-like value appears in source code. Once committed, copied, logged, or pushed to GitHub, it can be recovered from history even if the visible line is later removed.",
    remediationSteps: [
      "Remove the secret from source and load it from an environment variable or secret manager.",
      "Rotate the exposed credential immediately because it may already be compromised.",
      "Purge or rewrite repository history only when policy requires it, but do not rely on deletion alone.",
      "Enable secret scanning in GitHub and add local pre-commit checks for future changes."
    ],
    secureExample: "const apiKey = process.env.API_KEY;",
    references: ["GitHub Secret Scanning", "OWASP Secrets Management Cheat Sheet"],
    developerNote: "The safest response is remove, rotate, and monitor. A committed credential should be considered exposed."
  },
  "Weak Authentication": {
    rootCause: "The code appears to compare password-like values directly or rely on weak hashing. This usually means raw passwords or fast hashes may be present in memory, storage, logs, or code paths.",
    remediationSteps: [
      "Store only salted password hashes created with bcrypt, argon2, or scrypt.",
      "Use the password library's verify function instead of direct equality checks.",
      "Apply rate limiting, account lockout or step-up verification, and generic login error messages.",
      "Review registration, reset, and login flows together so the same password policy is enforced consistently."
    ],
    secureExample: "const ok = await bcrypt.compare(inputPassword, user.passwordHash);",
    references: ["OWASP Authentication Cheat Sheet", "NIST Digital Identity Guidelines"],
    developerNote: "Fast hashes such as MD5 and SHA-1 are not password hashing algorithms. They are designed to be fast, which helps attackers."
  },
  "Parser Warning": {
    rootCause: "The scanner could not parse the file as JavaScript or TypeScript, so it could not inspect AST-level structure.",
    remediationSteps: [
      "Confirm the selected language matches the uploaded file.",
      "Fix syntax errors and run the scan again.",
      "Keep text-rule findings, but treat the report as incomplete until parsing succeeds."
    ],
    references: ["Babel parser documentation"],
    developerNote: "Text scanning still runs, but AST-only detections may be missing."
  }
};
