import { X, Upload, FileText, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { useState, useRef, useCallback } from "react";

type Step = "upload" | "mapping" | "importing" | "done" | "error";

const SYSTEM_FIELDS = [
  { value: "email", label: "Email *" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "phone", label: "Phone" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
  { value: "tags", label: "Tags (comma-separated)" },
  { value: "skip", label: "— Skip this column —" },
];

interface ImportCsvModalProps {
  onClose: () => void;
  context?: "customers" | "list";
  listName?: string;
  onImported?: () => void;
}

function splitLine(line: string): string[] {
  return line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
}

/** Rebuild the CSV using the user's column mapping → canonical system-field headers the API understands. */
function remapCsv(text: string, headers: string[], mapping: Record<string, string>): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length === 0) return "";
  const keep: number[] = [];
  const newHeaders: string[] = [];
  headers.forEach((h, i) => {
    const m = mapping[h];
    if (m && m !== "skip") { keep.push(i); newHeaders.push(m); }
  });
  const out = [newHeaders.join(",")];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitLine(lines[r]);
    out.push(keep.map((i) => (cells[i] ?? "").replace(/,/g, " ")).join(","));
  }
  return out.join("\n");
}

function parseCsvHeaders(text: string): string[] {
  const firstLine = text.split("\n")[0];
  return firstLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
}

function countRows(text: string): number {
  return Math.max(0, text.split("\n").filter((l) => l.trim()).length - 1);
}

function autoMap(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (h === "email" || h === "emailaddress") return "email";
  if (h === "firstname" || h === "fname" || h === "first") return "first_name";
  if (h === "lastname" || h === "lname" || h === "last") return "last_name";
  if (h === "phone" || h === "mobile" || h === "tel") return "phone";
  if (h === "city" || h === "town") return "city";
  if (h === "country") return "country";
  if (h === "tag" || h === "tags") return "tags";
  return "skip";
}

export function ImportCsvModal({ onClose, context = "customers", listName, onImported }: ImportCsvModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rowCount, setRowCount] = useState(0);
  const [csvText, setCsvText] = useState("");
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [errorRows, setErrorRows] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const [dupOption, setDupOption] = useState<"update" | "skip">("update");
  const inputRef = useRef<HTMLInputElement>(null);
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      alert("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const hdrs = parseCsvHeaders(text);
      const rows = countRows(text);
      setCsvText(text);
      setHeaders(hdrs);
      setRowCount(rows);
      const autoMapped: Record<string, string> = {};
      hdrs.forEach((h) => { autoMapped[h] = autoMap(h); });
      setMapping(autoMapped);
      setStep("mapping");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const startImport = async () => {
    setStep("importing");
    setProgress(35);
    const remapped = remapCsv(csvText, headers, mapping);
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: remapped }),
      });
      const data = await res.json().catch(() => ({}));
      setProgress(100);
      if (!res.ok) { setErrMsg(data.error || "Import failed. Please check your file and try again."); setStep("error"); return; }
      setImportedCount(data.imported ?? 0);
      setUpdatedCount(data.updated ?? 0);
      setErrorRows((data.skipped ?? 0) + (Array.isArray(data.errors) ? data.errors.length : 0));
      setStep("done");
      onImported?.();
    } catch {
      setErrMsg("Network error during import.");
      setStep("error");
    }
  };

  const emailMapped = Object.values(mapping).includes("email");
  const mappedCols = Object.values(mapping).filter((v) => v !== "skip").length;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: step === "mapping" ? 560 : 440,
        background: "#FFFFFF", borderRadius: 12, zIndex: 201,
        border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
        fontFamily: font, display: "flex", flexDirection: "column", maxHeight: "90vh",
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Import CSV</h3>
            <p style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>
              {context === "list" && listName ? `Add contacts to "${listName}"` : "Import contacts into your account"}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "#94A3B8", padding: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        {(step === "upload" || step === "mapping") && (
          <div className="flex items-center px-6 py-3 gap-2" style={{ borderBottom: "1px solid #F8FAFC", flexShrink: 0 }}>
            {(["upload", "mapping"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div style={{ width: 24, height: 1, background: "#E2E8F0" }} />}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center justify-center rounded-full"
                    style={{
                      width: 18, height: 18, fontSize: 10, fontWeight: 600,
                      background: step === s ? "#2563EB" : s === "upload" && step === "mapping" ? "#F0FDF4" : "#F1F5F9",
                      color: step === s ? "#FFFFFF" : s === "upload" && step === "mapping" ? "#16A34A" : "#94A3B8",
                    }}>
                    {s === "upload" && step === "mapping" ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: step === s ? "#0F172A" : "#94A3B8" }}>
                    {s === "upload" ? "Upload file" : "Map columns"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {step === "upload" && (
            <div className="p-6 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl cursor-pointer"
                style={{
                  height: 180, border: `2px dashed ${dragging ? "#2563EB" : "#CBD5E1"}`,
                  background: dragging ? "#EFF6FF" : "#F8FAFC",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <div className="flex items-center justify-center rounded-full mb-3"
                  style={{ width: 44, height: 44, background: dragging ? "#DBEAFE" : "#E2E8F0" }}>
                  <Upload size={18} color={dragging ? "#2563EB" : "#94A3B8"} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                  {dragging ? "Drop to upload" : "Drag & drop your CSV here"}
                </p>
                <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>or click to browse files</p>
                <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleInputChange} style={{ display: "none" }} />
              </div>

              {/* Template download hint */}
              <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <FileText size={13} color="#2563EB" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#1D4ED8" }}>Need a template?</p>
                  <p style={{ fontSize: 11, color: "#3B82F6", marginTop: 1 }}>
                    Your CSV must include an <strong>email</strong> column. Additional columns: first_name, last_name, phone, city, country, tags.
                  </p>
                  <button style={{ fontSize: 11, color: "#2563EB", marginTop: 4, textDecoration: "underline" }}>
                    Download sample CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "mapping" && (
            <div className="p-6 space-y-4">
              {/* File info banner */}
              <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                <FileText size={16} color="#64748B" />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }} className="truncate">{fileName}</p>
                  <p style={{ fontSize: 11, color: "#64748B" }}>{rowCount.toLocaleString()} rows detected</p>
                </div>
                <button onClick={() => setStep("upload")} style={{ fontSize: 11, color: "#2563EB" }}>Change file</button>
              </div>

              {/* Column mapping */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 10 }}>
                  MAP COLUMNS ({mappedCols} of {headers.length} mapped)
                </p>
                <div className="space-y-2">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center gap-3">
                      <div className="flex-1 rounded-lg px-3 py-2" style={{ background: "#F8FAFC", border: "1px solid var(--border)", fontSize: 12, color: "#374151", fontFamily: "JetBrains Mono, monospace" }}>
                        {h}
                      </div>
                      <span style={{ fontSize: 11, color: "#CBD5E1" }}>→</span>
                      <div style={{ flex: 1, position: "relative" }}>
                        <select
                          value={mapping[h] || "skip"}
                          onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                          style={{
                            width: "100%", fontSize: 12, padding: "8px 28px 8px 10px",
                            border: `1px solid ${mapping[h] && mapping[h] !== "skip" ? "#2563EB" : "var(--border)"}`,
                            borderRadius: 6, color: mapping[h] && mapping[h] !== "skip" ? "#0F172A" : "#94A3B8",
                            background: mapping[h] && mapping[h] !== "skip" ? "#EFF6FF" : "#FFFFFF",
                            outline: "none", appearance: "none", fontFamily: font,
                          }}
                        >
                          {SYSTEM_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} color="#94A3B8" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate handling */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 8 }}>DUPLICATE HANDLING</p>
                <div className="flex gap-2">
                  {([["update", "Update existing contacts"], ["skip", "Skip duplicates"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setDupOption(val)}
                      className="flex-1 rounded-lg py-2 px-3 text-left"
                      style={{
                        fontSize: 12, border: `1px solid ${dupOption === val ? "#2563EB" : "var(--border)"}`,
                        background: dupOption === val ? "#EFF6FF" : "#FFFFFF",
                        color: dupOption === val ? "#1D4ED8" : "#374151",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="rounded-full flex items-center justify-center"
                          style={{ width: 14, height: 14, border: `2px solid ${dupOption === val ? "#2563EB" : "#CBD5E1"}`, background: dupOption === val ? "#2563EB" : "transparent", flexShrink: 0 }}>
                          {dupOption === val && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFFFFF" }} />}
                        </div>
                        {label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {!emailMapped && (
                <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: "#FFF1F2", border: "1px solid #FECDD3" }}>
                  <AlertCircle size={13} color="#BE123C" />
                  <p style={{ fontSize: 11, color: "#BE123C" }}>Map a column to <strong>Email</strong> to continue — it's required.</p>
                </div>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="p-8 flex flex-col items-center justify-center" style={{ minHeight: 240 }}>
              <div className="rounded-full flex items-center justify-center mb-4"
                style={{ width: 52, height: 52, background: "#EFF6FF" }}>
                <Upload size={22} color="#2563EB" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Importing contacts…</p>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 20 }}>
                Processing {rowCount.toLocaleString()} rows from {fileName}
              </p>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "#E2E8F0" }}>
                <div className="rounded-full transition-all" style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: "#2563EB", transition: "width 0.1s ease" }} />
              </div>
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>{Math.min(Math.round(progress), 100)}% complete</p>
            </div>
          )}

          {step === "done" && (
            <div className="p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: 240 }}>
              <div className="rounded-full flex items-center justify-center mb-4"
                style={{ width: 52, height: 52, background: "#F0FDF4" }}>
                <CheckCircle2 size={24} color="#16A34A" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Import complete!</p>
              <p style={{ fontSize: 12, color: "#64748B", marginBottom: 20 }}>
                {importedCount.toLocaleString()} added{updatedCount > 0 ? `, ${updatedCount.toLocaleString()} updated` : ""}{context === "list" && listName ? ` in "${listName}"` : ""}.
                {errorRows > 0 ? ` ${errorRows} rows skipped (invalid email or missing data).` : ""}
              </p>
              <div className="w-full rounded-lg p-4 space-y-2 text-left" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                {[
                  { label: "Total rows processed", value: rowCount.toLocaleString() },
                  { label: "New contacts", value: importedCount.toLocaleString(), color: "#16A34A" },
                  { label: "Updated", value: updatedCount.toLocaleString(), color: "#2563EB" },
                  { label: "Rows skipped", value: String(errorRows), color: errorRows > 0 ? "#DC2626" : "#64748B" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span style={{ fontSize: 12, color: "#64748B" }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: row.color || "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: 240 }}>
              <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 52, height: 52, background: "#FFF1F2" }}>
                <AlertCircle size={24} color="#BE123C" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Import failed</p>
              <p style={{ fontSize: 12, color: "#64748B", maxWidth: 320 }}>{errMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          {step === "done" ? (
            <button onClick={onClose} className="w-full rounded-lg py-2"
              style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", border: "none", cursor: "pointer", fontFamily: font }}>
              Done
            </button>
          ) : (
            <>
              <button onClick={step === "mapping" ? () => setStep("upload") : onClose}
                style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: font }}>
                {step === "mapping" ? "← Back" : "Cancel"}
              </button>
              {step === "mapping" && (
                <button
                  disabled={!emailMapped || step !== "mapping"}
                  onClick={startImport}
                  style={{
                    fontSize: 12, fontWeight: 500, color: "#FFFFFF",
                    background: emailMapped ? "#2563EB" : "#CBD5E1",
                    border: "none", padding: "8px 22px", borderRadius: 6,
                    cursor: emailMapped ? "pointer" : "not-allowed", fontFamily: font,
                  }}
                >
                  Import {rowCount.toLocaleString()} contacts →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
