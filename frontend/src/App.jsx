import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileCode2,
  Github,
  Lock,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2
} from "lucide-react";
import { scanPayload } from "./api/scanner.js";

const DEMO_CODE = `const express = require("express");
const app = express();

app.get("/user", async (req, res) => {
  const userId = req.query.id;
  const query = "SELECT * FROM users WHERE id = " + userId;
  const user = await db.query(query);
  res.send("<div>" + user.name + "</div>");
});

function renderProfile(profileHtml) {
  document.querySelector("#profile").innerHTML = profileHtml;
}

const apiKey = "sk_live_1234567890abcdef";

function login(inputPassword, savedPassword) {
  if (inputPassword === savedPassword) {
    return true;
  }
}`;

const languageOptions = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" }
];

export default function App() {
  const [mode, setMode] = useState("code");
  const [code, setCode] = useState(DEMO_CODE);
  const [language, setLanguage] = useState("javascript");
  const [repoUrl, setRepoUrl] = useState("");
  const [file, setFile] = useState(null);
  const [useAI, setUseAI] = useState(true);
  const [report, setReport] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedFinding = useMemo(() => {
    if (!report?.findings?.length) return null;
    return report.findings.find((finding) => finding.id === selectedFindingId) || report.findings[0];
  }, [report, selectedFindingId]);

  async function handleScan() {
    setLoading(true);
    setError("");

    try {
      const data = await scanPayload({
        code: mode === "code" ? code : undefined,
        language,
        fileName: `snippet.${language === "python" ? "py" : "js"}`,
        repoUrl: mode === "repo" ? repoUrl : undefined,
        file: mode === "file" ? file : null,
        useAI
      });
      setReport(data);
      setSelectedFindingId(data.findings?.[0]?.id || "");
    } catch (scanError) {
      setError(scanError.response?.data?.message || scanError.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-ink">
      <section className="border-b border-white/70 bg-[radial-gradient(circle_at_top_left,#dff8ee_0,#f5f7fb_34%,#eef1f7_100%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="flex min-h-[360px] flex-col justify-between">
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white shadow-soft">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ember">AI Security Scanner</p>
                  <h1 className="text-3xl font-black tracking-normal text-ink sm:text-5xl">Find risky code before attackers do.</h1>
                </div>
              </div>
            </nav>

            <div className="mt-8 max-w-2xl">
              <p className="text-lg leading-8 text-slate-650">
                Scan code, files, or public GitHub repositories for SQL injection, XSS, exposed secrets, and weak authentication. Local rules catch the signal fast; Groq can add senior-reviewer style reasoning.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Metric label="Focus areas" value="4" />
                <Metric label="Risk score" value="0-100" />
                <Metric label="Stack" value="JS" />
              </div>
            </div>
          </div>

          <div className="grid content-end gap-4">
            <div className="grid grid-cols-2 gap-4">
              <SignalCard icon={<Lock />} title="Secrets" copy="API keys, tokens, and private material." />
              <SignalCard icon={<ShieldAlert />} title="Injection" copy="SQL and browser injection sinks." />
            </div>
            <div className="rounded-lg border border-white bg-white/78 p-4 shadow-soft backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Groq reasoning layer</p>
                  <p className="text-xl font-bold text-ink">Configurable AI explanations</p>
                </div>
                <button
                  className={`relative h-8 w-14 rounded-full transition ${useAI ? "bg-mint" : "bg-slate-300"}`}
                  onClick={() => setUseAI((value) => !value)}
                  aria-label="Toggle Groq reasoning"
                  title="Toggle Groq reasoning"
                >
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${useAI ? "left-7" : "left-1"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div className="flex rounded-lg bg-slate-100 p-1">
              <ModeButton active={mode === "code"} icon={<FileCode2 size={17} />} label="Code" onClick={() => setMode("code")} />
              <ModeButton active={mode === "file"} icon={<Upload size={17} />} label="File" onClick={() => setMode("file")} />
              <ModeButton active={mode === "repo"} icon={<Github size={17} />} label="Repo" onClick={() => setMode("repo")} />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                aria-label="Language"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-bold text-white shadow transition hover:bg-[#d34f34] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleScan}
                disabled={loading || (mode === "file" && !file) || (mode === "repo" && !repoUrl)}
              >
                {loading ? <Wand2 className="animate-spin" size={18} /> : <Play size={18} />}
                {loading ? "Scanning" : "Scan"}
              </button>
            </div>
          </div>

          <div className="h-[560px] p-4">
            {mode === "code" && (
              <Editor
                height="100%"
                defaultLanguage="javascript"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false
                }}
              />
            )}

            {mode === "file" && (
              <label className="grid h-full cursor-pointer place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-mint hover:bg-[#f0fbf7]">
                <input
                  type="file"
                  className="hidden"
                  accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.php,.txt"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <span className="grid max-w-md gap-3">
                  <Upload className="mx-auto text-mint" size={42} />
                  <span className="text-2xl font-black">{file ? file.name : "Drop in a source file"}</span>
                  <span className="text-sm leading-6 text-slate-500">Supported files include JS, TS, Python, Java, Go, and PHP. The backend scans uploaded content in memory.</span>
                </span>
              </label>
            )}

            {mode === "repo" && (
              <div className="grid h-full place-items-center rounded-lg bg-slate-50 p-6">
                <div className="w-full max-w-xl">
                  <Github className="mb-5 text-ink" size={44} />
                  <label className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Public GitHub repository</label>
                  <input
                    className="mt-3 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-mint focus:ring-4 focus:ring-mint/15"
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                  />
                  <p className="mt-3 text-sm leading-6 text-slate-500">The API downloads the default branch archive and scans supported source files with size limits.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5">
          <ReportHeader report={report} error={error} />
          <FindingsList
            findings={report?.findings || []}
            selectedFindingId={selectedFinding?.id}
            onSelect={setSelectedFindingId}
          />
          <FindingDetail finding={selectedFinding} />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white bg-white/70 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function SignalCard({ icon, title, copy }) {
  return (
    <div className="rounded-lg border border-white bg-white/72 p-4 shadow-soft backdrop-blur">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-[#fff2ed] text-ember">{icon}</div>
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{copy}</p>
    </div>
  );
}

function ModeButton({ active, icon, label, onClick }) {
  return (
    <button
      className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold transition ${active ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function ReportHeader({ report, error }) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
        <div className="flex items-center gap-2 font-bold"><AlertTriangle size={19} /> Scan error</div>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  const summary = report?.summary;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Security report</p>
          <h2 className="mt-1 text-3xl font-black text-ink">{summary ? summary.riskLabel : "Ready"}</h2>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-lg bg-ink text-2xl font-black text-white">
          {summary?.riskScore || 0}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat label="Issues" value={summary?.total || 0} />
        <MiniStat label="Critical" value={summary?.bySeverity?.critical || 0} />
        <MiniStat label="Files" value={report?.filesScanned || 0} />
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
        {report?.ai?.enabled ? <Bot size={17} className="text-mint" /> : <Sparkles size={17} className="text-gold" />}
        {report ? (report.ai?.enabled ? "Groq enriched this report" : "Local scanner report") : "Run a scan to generate findings"}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function FindingsList({ findings, selectedFindingId, onSelect }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-ink">Issues Found</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{findings.length} total</span>
      </div>
      <div className="grid max-h-64 gap-3 overflow-auto pr-1">
        {findings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-500">
            <CheckCircle2 className="mx-auto mb-2 text-mint" />
            No findings yet.
          </div>
        ) : findings.map((finding) => (
          <button
            key={finding.id}
            className={`rounded-lg border p-4 text-left transition hover:border-mint hover:bg-[#f6fffb] ${selectedFindingId === finding.id ? "border-mint bg-[#f6fffb] ring-4 ring-mint/10" : "border-slate-200 bg-white"}`}
            onClick={() => onSelect(finding.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-ink">{finding.type}</p>
                <p className="mt-1 text-sm text-slate-500">{finding.fileName}:{finding.line}</p>
              </div>
              <SeverityBadge label={finding.severityLabel} score={finding.severity} />
            </div>
            <code className="mt-3 block overflow-hidden text-ellipsis rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">{finding.evidence || "No evidence captured"}</code>
          </button>
        ))}
      </div>
    </div>
  );
}

function SeverityBadge({ label, score }) {
  const tone = label === "Critical"
    ? "bg-red-100 text-red-700"
    : label === "Medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{label} {score}</span>;
}

function FindingDetail({ finding }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Detailed explanation</p>
          <h2 className="mt-1 text-xl font-black text-ink">{finding ? finding.type : "Select an issue"}</h2>
        </div>
        {finding && <SeverityBadge label={finding.severityLabel} score={finding.severity} />}
      </div>
      {finding ? (
        <div className="mt-5 grid gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Location</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{finding.fileName}:{finding.line}</p>
            <code className="mt-3 block rounded-md bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-100">{finding.evidence || "No evidence captured"}</code>
          </div>

          <DetailBlock title="Why it matters" copy={finding.explanation} />
          <DetailBlock title="Root cause" copy={finding.rootCause} />
          <DetailBlock title="Exploit scenario" copy={finding.exploitScenario} />
          <DetailBlock title="Fix suggestion" copy={finding.fix} />

          {finding.remediationSteps?.length > 0 && (
            <div className="border-l-4 border-ember pl-4">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Remediation steps</p>
              <ol className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
                {finding.remediationSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ember text-xs font-black text-white">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {finding.secureExample && (
            <div className="rounded-lg border border-slate-200 bg-[#101827] p-4">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-300">Secure example</p>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap text-sm leading-6 text-[#b7f7d8]"><code>{finding.secureExample}</code></pre>
            </div>
          )}

          <DetailBlock title="Best practice" copy={finding.bestPractice} />
          <DetailBlock title="Developer note" copy={finding.developerNote} />

          {finding.references?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {finding.references.map((reference) => (
                <span key={reference} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{reference}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">Detected issues will appear here with root cause analysis, exploit context, remediation steps, and secure code guidance.</p>
      )}
    </div>
  );
}

function DetailBlock({ title, copy }) {
  if (!copy) return null;

  return (
    <div className="border-l-4 border-mint pl-4">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{copy}</p>
    </div>
  );
}
