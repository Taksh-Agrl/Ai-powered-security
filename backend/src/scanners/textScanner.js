import { makeFinding } from "../utils/findings.js";

const SECRET_PATTERNS = [
  { label: "AWS access key", regex: /AKIA[0-9A-Z]{16}/ },
  { label: "JWT token", regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { label: "private key", regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "hardcoded secret", regex: /(api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i }
];

const SQL_CONCAT = /(select|insert|update|delete).*(\+|\$\{|\%s|\.format\()/i;
const XSS_SINK = /(innerHTML|outerHTML|document\.write|insertAdjacentHTML|dangerouslySetInnerHTML)/;
const WEAK_AUTH = /(password|passwd|pwd)\s*(==|===|!=|!==)\s*|md5\s*\(|sha1\s*\(/i;

export function scanTextRules(file) {
  const findings = [];
  const lines = (file.content || "").split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const line = index + 1;

    if (SQL_CONCAT.test(lineText)) {
      findings.push(makeFinding({
        fileName: file.fileName,
        line,
        type: "SQL Injection",
        severity: 86,
        evidence: lineText.trim(),
        explanation: "The line appears to build a SQL query with dynamic string interpolation or concatenation.",
        exploitScenario: "User-controlled values could alter the SQL command and access or modify data.",
        fix: "Replace dynamic query construction with parameterized queries.",
        bestPractice: "Use your database driver's prepared statement API."
      }));
    }

    if (XSS_SINK.test(lineText)) {
      findings.push(makeFinding({
        fileName: file.fileName,
        line,
        type: "Cross-Site Scripting",
        severity: 80,
        evidence: lineText.trim(),
        explanation: "The line uses a raw HTML injection sink.",
        exploitScenario: "A script payload stored in user input can execute in another user's browser.",
        fix: "Use safe text APIs or sanitize HTML before rendering it.",
        bestPractice: "Treat all browser-rendered user input as untrusted."
      }));
    }

    SECRET_PATTERNS.forEach((pattern) => {
      if (pattern.regex.test(lineText)) {
        findings.push(makeFinding({
          fileName: file.fileName,
          line,
          type: "Secrets Exposure",
          severity: 90,
          evidence: redact(lineText.trim()),
          explanation: `The line looks like it contains a ${pattern.label}.`,
          exploitScenario: "An exposed credential can be used to access private systems or cloud resources.",
          fix: "Remove the value, rotate the credential, and load it from environment variables or a secret manager.",
          bestPractice: "Use secret scanning in CI and pre-commit hooks."
        }));
      }
    });

    if (WEAK_AUTH.test(lineText)) {
      findings.push(makeFinding({
        fileName: file.fileName,
        line,
        type: "Weak Authentication",
        severity: 72,
        evidence: lineText.trim(),
        explanation: "The line suggests weak password verification or obsolete hashing.",
        exploitScenario: "Attackers can crack weak hashes or exploit plain-text password handling.",
        fix: "Use bcrypt, argon2, scrypt, or a trusted authentication provider.",
        bestPractice: "Hash passwords with a slow, salted password hashing algorithm."
      }));
    }
  });

  return findings;
}

function redact(value) {
  return value.replace(/(["'])[A-Za-z0-9_./+=-]{8,}(["'])/g, "$1***redacted***$2");
}
