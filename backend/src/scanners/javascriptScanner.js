import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { makeFinding } from "../utils/findings.js";
import { scanTextRules } from "./textScanner.js";

const traverse = traverseModule.default;
const SQL_WORDS = /\b(select|insert|update|delete|from|where|join|values)\b/i;
const HTML_SINKS = new Set(["innerHTML", "outerHTML"]);

export function scanJavaScript(file) {
  const findings = [...scanTextRules(file)];

  try {
    const ast = parse(file.content, {
      sourceType: "unambiguous",
      plugins: ["jsx", "typescript", "classProperties", "decorators-legacy"],
      errorRecovery: true
    });

    traverse(ast, {
      BinaryExpression(path) {
        if (path.node.operator === "+" && containsSql(path.node)) {
          findings.push(makeFinding({
            fileName: file.fileName,
            line: path.node.loc?.start?.line,
            type: "SQL Injection",
            severity: 92,
            evidence: sourceAt(file.content, path.node.loc?.start?.line),
            explanation: "SQL text is assembled through string concatenation, which can mix user-controlled input with executable query text.",
            exploitScenario: "An attacker can pass input such as 1 OR 1=1 to change the query logic.",
            fix: "Use parameterized queries or prepared statements instead of concatenating values into SQL.",
            bestPractice: "Keep SQL structure and user data separate."
          }));
        }

        if (["==", "===", "!=", "!=="].includes(path.node.operator) && comparesPassword(path.node)) {
          findings.push(makeFinding({
            fileName: file.fileName,
            line: path.node.loc?.start?.line,
            type: "Weak Authentication",
            severity: 74,
            evidence: sourceAt(file.content, path.node.loc?.start?.line),
            explanation: "Password-like values appear to be compared directly.",
            exploitScenario: "Plain-text password handling increases damage if logs, memory, or storage are exposed.",
            fix: "Store salted password hashes and verify with bcrypt, argon2, or a managed identity provider.",
            bestPractice: "Never store or compare raw passwords after registration."
          }));
        }
      },
      TemplateLiteral(path) {
        const rawText = path.node.quasis.map((quasi) => quasi.value.raw).join(" ");
        if (SQL_WORDS.test(rawText) && path.node.expressions.length > 0) {
          findings.push(makeFinding({
            fileName: file.fileName,
            line: path.node.loc?.start?.line,
            type: "SQL Injection",
            severity: 88,
            evidence: sourceAt(file.content, path.node.loc?.start?.line),
            explanation: "A SQL template literal includes dynamic expressions inside the query.",
            exploitScenario: "If any expression contains user input, an attacker may inject SQL fragments.",
            fix: "Use placeholders such as ? or $1 with a values array.",
            bestPractice: "Avoid interpolating variables directly into SQL strings."
          }));
        }
      },
      AssignmentExpression(path) {
        const property = path.node.left?.property?.name || path.node.left?.property?.value;
        if (HTML_SINKS.has(property)) {
          findings.push(makeFinding({
            fileName: file.fileName,
            line: path.node.loc?.start?.line,
            type: "Cross-Site Scripting",
            severity: 84,
            evidence: sourceAt(file.content, path.node.loc?.start?.line),
            explanation: `${property} renders raw HTML and can execute attacker-controlled scripts.`,
            exploitScenario: "A malicious value containing a script tag or event handler can run in a user's browser.",
            fix: "Use textContent for plain text or sanitize HTML with a trusted sanitizer before rendering.",
            bestPractice: "Prefer safe rendering APIs over raw HTML sinks."
          }));
        }
      },
      CallExpression(path) {
        const calleeName = getCalleeName(path.node.callee);
        if (["document.write", "insertAdjacentHTML"].some((sink) => calleeName.endsWith(sink))) {
          findings.push(makeFinding({
            fileName: file.fileName,
            line: path.node.loc?.start?.line,
            type: "Cross-Site Scripting",
            severity: 82,
            evidence: sourceAt(file.content, path.node.loc?.start?.line),
            explanation: `${calleeName} injects HTML directly into the DOM.`,
            exploitScenario: "Untrusted input passed here can become executable JavaScript.",
            fix: "Render text safely or sanitize HTML before insertion.",
            bestPractice: "Centralize HTML sanitization in one utility."
          }));
        }
      },
      JSXAttribute(path) {
        if (path.node.name?.name === "dangerouslySetInnerHTML") {
          findings.push(makeFinding({
            fileName: file.fileName,
            line: path.node.loc?.start?.line,
            type: "Cross-Site Scripting",
            severity: 86,
            evidence: sourceAt(file.content, path.node.loc?.start?.line),
            explanation: "React dangerouslySetInnerHTML bypasses React's default escaping.",
            exploitScenario: "User-provided HTML can execute script payloads in the browser.",
            fix: "Avoid raw HTML rendering or sanitize with a proven library before use.",
            bestPractice: "Only allow trusted, sanitized HTML in UI components."
          }));
        }
      },
      VariableDeclarator(path) {
        const name = path.node.id?.name || "";
        const value = literalValue(path.node.init);
        if (isSensitiveName(name) && isSuspiciousLiteral(value)) {
          findings.push(makeFinding({
            fileName: file.fileName,
            line: path.node.loc?.start?.line,
            type: "Secrets Exposure",
            severity: 78,
            evidence: sourceAt(file.content, path.node.loc?.start?.line),
            explanation: "A sensitive-looking variable is assigned a hardcoded value.",
            exploitScenario: "Secrets committed to source control can be copied and abused long after removal.",
            fix: "Move secrets to environment variables or a managed secret vault.",
            bestPractice: "Rotate exposed credentials immediately."
          }));
        }
      }
    });
  } catch (error) {
    findings.push(makeFinding({
      fileName: file.fileName,
      line: 1,
      type: "Parser Warning",
      severity: 20,
      evidence: error.message,
      explanation: "The JavaScript parser could not fully parse this file, so only text-based checks were applied.",
      exploitScenario: "Incomplete parsing can hide issues in complex syntax.",
      fix: "Check that the file has valid JavaScript or TypeScript syntax.",
      bestPractice: "Keep scanner language settings aligned with the codebase."
    }));
  }

  return dedupe(findings);
}

function containsSql(node) {
  const text = collectStringParts(node).join(" ");
  return SQL_WORDS.test(text);
}

function collectStringParts(node) {
  if (!node) return [];
  if (node.type === "StringLiteral") return [node.value];
  if (node.type === "TemplateLiteral") return node.quasis.map((quasi) => quasi.value.raw);
  if (node.type === "BinaryExpression") {
    return [...collectStringParts(node.left), ...collectStringParts(node.right)];
  }
  return [];
}

function getCalleeName(callee) {
  if (!callee) return "";
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression") {
    const object = getCalleeName(callee.object);
    const property = callee.property?.name || callee.property?.value || "";
    return object ? `${object}.${property}` : property;
  }
  return "";
}

function literalValue(node) {
  if (!node) return "";
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.raw).join("");
  }
  return "";
}

function isSensitiveName(name) {
  return /(api[_-]?key|secret|token|password|passwd|pwd|private[_-]?key)/i.test(name);
}

function isSuspiciousLiteral(value) {
  return typeof value === "string" && value.length >= 8 && !value.startsWith("process.env");
}

function comparesPassword(node) {
  const left = JSON.stringify(node.left || {});
  const right = JSON.stringify(node.right || {});
  return /password|passwd|pwd/i.test(`${left} ${right}`);
}

function sourceAt(content, line = 1) {
  return content.split(/\r?\n/)[Math.max(0, line - 1)]?.trim() || "";
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.fileName}:${finding.line}:${finding.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
