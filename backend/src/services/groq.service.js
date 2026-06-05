import Groq from "groq-sdk";
import { env } from "../config/env.js";

const groq = env.groqApiKey ? new Groq({ apiKey: env.groqApiKey }) : null;

export async function enrichFindingsWithGroq(findings, files) {
  if (!groq || !findings.length) {
    return findings;
  }

  try {
    const prompt = buildPrompt(findings, files);
    const completion = await groq.chat.completions.create({
      model: env.groqModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a senior application security engineer. Return strict JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) return findings;

    const parsed = JSON.parse(content);
    const enriched = Array.isArray(parsed.findings) ? parsed.findings : [];

    return findings.map((finding) => {
      const update = enriched.find((item) => item.id === finding.id);
      if (!update) return finding;

      return {
        ...finding,
        explanation: update.explanation || finding.explanation,
        rootCause: update.rootCause || finding.rootCause,
        exploitScenario: update.exploitScenario || finding.exploitScenario,
        fix: update.fix || finding.fix,
        bestPractice: update.bestPractice || finding.bestPractice,
        remediationSteps: Array.isArray(update.remediationSteps) && update.remediationSteps.length
          ? update.remediationSteps
          : finding.remediationSteps,
        secureExample: update.secureExample || finding.secureExample,
        developerNote: update.developerNote || finding.developerNote,
        aiEnhanced: true
      };
    });
  } catch (error) {
    console.warn("Groq enrichment failed:", error.message);
    return findings;
  }
}

function buildPrompt(findings, files) {
  const codeContext = files
    .slice(0, 8)
    .map((file) => `FILE: ${file.fileName}\nLANGUAGE: ${file.language}\n${truncate(file.content, 3500)}`)
    .join("\n\n---\n\n");

  return `Analyze these detected security findings and improve each explanation/fix.

Return JSON with this shape:
{
  "findings": [
    {
      "id": "same id",
      "explanation": "plain-language risk",
      "rootCause": "technical root cause in 1-2 sentences",
      "exploitScenario": "concrete attacker scenario",
      "fix": "secure fix recommendation",
      "bestPractice": "one best practice",
      "remediationSteps": ["specific step 1", "specific step 2", "specific step 3"],
      "secureExample": "short secure code example when possible",
      "developerNote": "practical implementation caveat"
    }
  ]
}

Detected findings:
${JSON.stringify(findings, null, 2)}

Code context:
${codeContext}`;
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max)}\n/* truncated */` : value;
}
