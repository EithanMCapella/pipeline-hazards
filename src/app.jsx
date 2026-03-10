import React, { useState, useCallback } from "react";

// ── constants ────────────────────────────────────────────────────────────────
const STAGES = ["IF", "ID", "EX", "MEM", "WB"];
const STAGE_COLORS = {
  IF:   { bg: "#1e3a5f", text: "#93c5fd" },
  ID:   { bg: "#1d4e3f", text: "#6ee7b7" },
  EX:   { bg: "#4a1942", text: "#f0abfc" },
  MEM:  { bg: "#7a2d00", text: "#fdba74" },
  WB:   { bg: "#14532d", text: "#86efac" },
  IDLE: { bg: "#1e293b", text: "#475569" },
  CANCEL:{ bg: "#450a0a", text: "#f87171" },
};
const HAZARD_COLORS = {
  DATA:       "#ef4444",
  CONTROL:    "#8b5cf6",
  STRUCTURAL: "#0891b2",
};
const CELL_TYPES = ["IF","ID","EX","MEM","WB","IDLE","CANCEL"];
const MAX_CYCLES = 20;

// ── helpers ──────────────────────────────────────────────────────────────────
function parseInstructions(raw) {
  return raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith(";") && !l.startsWith("//"));
}

function buildDefaultPipeline(instructions) {
  // naive in-order pipeline: each instruction starts 1 cycle after previous
  return instructions.map((_, i) => {
    const row = {};
    STAGES.forEach((s, si) => { row[i + 1 + si] = s; });
    return row;
  });
}

// ── sub-components ───────────────────────────────────────────────────────────
function CellBadge({ type, size = "normal" }) {
  if (!type) return <td style={{ padding: "3px 2px", minWidth: 36 }} />;
  const c = STAGE_COLORS[type] || STAGE_COLORS.IF;
  const small = size === "small";
  return (
    <td style={{ padding: "3px 2px", textAlign: "center", minWidth: 36 }}>
      <span style={{
        display: "inline-block",
        padding: small ? "1px 3px" : "2px 5px",
        borderRadius: 3,
        background: c.bg,
        color: c.text,
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        border: `1px solid ${c.text}22`,
        userSelect: "none",
      }}>{type === "CANCEL" ? "✕" : type === "IDLE" ? "—" : type}</span>
    </td>
  );
}

function PipelineTable({ instructions, pipeline, highlightedRows, onCellClick, editMode }) {
  const maxCycle = Math.max(
    MAX_CYCLES,
    ...pipeline.flatMap(row => Object.keys(row).map(Number))
  );
  const cycles = Array.from({ length: maxCycle }, (_, i) => i + 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 12px", color: "#475569", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", minWidth: 200 }}>
              Instruction
            </th>
            {cycles.map(c => (
              <th key={c} style={{ padding: "5px 2px", color: "#475569", borderBottom: "1px solid #1e293b", textAlign: "center", minWidth: 36, fontSize: 10 }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {instructions.map((instr, idx) => {
            const isHighlighted = highlightedRows.includes(idx);
            const row = pipeline[idx] || {};
            return (
              <tr key={idx} style={{
                background: isHighlighted ? "#1e293b" : "transparent",
                borderLeft: isHighlighted ? "3px solid #f97316" : "3px solid transparent",
                transition: "background 0.15s",
              }}>
                <td style={{
                  padding: "5px 12px", borderBottom: "1px solid #0f172a",
                  color: isHighlighted ? "#f1f5f9" : "#94a3b8",
                  fontWeight: isHighlighted ? 700 : 400,
                  whiteSpace: "nowrap", fontSize: 11,
                }}>
                  {idx + 1}. {instr}
                </td>
                {cycles.map(c => {
                  const cellType = row[c];
                  if (editMode && onCellClick) {
                    return (
                      <td key={c} style={{ padding: "3px 2px", textAlign: "center", minWidth: 36, cursor: "pointer" }}
                        onClick={() => onCellClick(idx, c)}>
                        {cellType ? (
                          <span style={{
                            display: "inline-block",
                            padding: "2px 5px",
                            borderRadius: 3,
                            background: (STAGE_COLORS[cellType] || STAGE_COLORS.IF).bg,
                            color: (STAGE_COLORS[cellType] || STAGE_COLORS.IF).text,
                            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                            border: `1px solid ${(STAGE_COLORS[cellType] || STAGE_COLORS.IF).text}44`,
                            cursor: "pointer",
                          }}>{cellType === "CANCEL" ? "✕" : cellType === "IDLE" ? "—" : cellType}</span>
                        ) : (
                          <span style={{
                            display: "inline-block", width: 28, height: 18,
                            borderRadius: 3, border: "1px dashed #1e293b",
                          }} />
                        )}
                      </td>
                    );
                  }
                  return <CellBadge key={c} type={cellType} />;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── TAB 1: Analyze ───────────────────────────────────────────────────────────
function AnalyzeTab() {
  const [code, setCode] = useState(
`MOV R5, #52
LDR R7, [R5, #0]
LDRB R2, [R5, #4]
LDRB R1, [R5, #5]
MOVS R10, R1
BPL POS
SUB R6, R3, R2
NOP
NOP
B SAVE
POS ADD R6, R3, R2
SAVE STRB R6, [R5, #6]
END B END`
  );
  const [instructions, setInstructions] = useState(() => parseInstructions(
`MOV R5, #52
LDR R7, [R5, #0]
LDRB R2, [R5, #4]
LDRB R1, [R5, #5]
MOVS R10, R1
BPL POS
SUB R6, R3, R2
NOP
NOP
B SAVE
POS ADD R6, R3, R2
SAVE STRB R6, [R5, #6]
END B END`
  ));
  const [pipeline, setPipeline] = useState(() =>
    buildDefaultPipeline(parseInstructions(
`MOV R5, #52
LDR R7, [R5, #0]
LDRB R2, [R5, #4]
LDRB R1, [R5, #5]
MOVS R10, R1
BPL POS
SUB R6, R3, R2
NOP
NOP
B SAVE
POS ADD R6, R3, R2
SAVE STRB R6, [R5, #6]
END B END`
    ))
  );
  const [hazards, setHazards] = useState([]);
  const [activeHazard, setActiveHazard] = useState(null);
  const [showAddHazard, setShowAddHazard] = useState(false);
  const [newHazard, setNewHazard] = useState({ type: "DATA", instructions: "", title: "", detail: "" });
  const [parsed, setParsed] = useState(true);

  const handleParse = () => {
    const instrs = parseInstructions(code);
    setInstructions(instrs);
    setPipeline(buildDefaultPipeline(instrs));
    setHazards([]);
    setActiveHazard(null);
    setParsed(true);
  };

  const addHazard = () => {
    const rows = newHazard.instructions
      .split(",")
      .map(s => parseInt(s.trim()) - 1)
      .filter(n => !isNaN(n));
    setHazards(prev => [...prev, { ...newHazard, rows }]);
    setNewHazard({ type: "DATA", instructions: "", title: "", detail: "" });
    setShowAddHazard(false);
  };

  const removeHazard = (i) => {
    setHazards(prev => prev.filter((_, idx) => idx !== i));
    if (activeHazard === i) setActiveHazard(null);
  };

  const highlightedRows = activeHazard !== null ? hazards[activeHazard].rows : [];

  const counts = { DATA: 0, CONTROL: 0, STRUCTURAL: 0 };
  hazards.forEach(h => { if (counts[h.type] !== undefined) counts[h.type]++; });

  return (
    <div>
      {/* Code input */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 8 }}>ASSEMBLY CODE</div>
        <textarea
          value={code}
          onChange={e => { setCode(e.target.value); setParsed(false); }}
          style={{
            width: "100%", height: 180, background: "#0a1628", border: "1px solid #1e293b",
            borderRadius: 6, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12, padding: 12, resize: "vertical", boxSizing: "border-box", outline: "none",
          }}
        />
        <button onClick={handleParse} style={{
          marginTop: 8, padding: "7px 20px", background: parsed ? "#1e293b" : "#0f4c75",
          color: parsed ? "#475569" : "#93c5fd", border: `1px solid ${parsed ? "#1e293b" : "#0369a1"}`,
          borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700, letterSpacing: 1,
        }}>
          {parsed ? "✓ PARSED" : "▶ PARSE & BUILD TRACE"}
        </button>
      </div>

      {/* Pipeline table */}
      {instructions.length > 0 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 8 }}>PIPELINE TRACE</div>
          <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, padding: 12, marginBottom: 24 }}>
            <PipelineTable
              instructions={instructions}
              pipeline={pipeline}
              highlightedRows={highlightedRows}
            />
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {STAGES.map(s => {
              const c = STAGE_COLORS[s];
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 3, background: c.bg, color: c.text, fontSize: 10, fontWeight: 700 }}>{s}</span>
                  <span style={{ fontSize: 10, color: "#475569" }}>{{ IF:"Fetch", ID:"Decode", EX:"Execute", MEM:"Memory", WB:"Write Back" }[s]}</span>
                </div>
              );
            })}
          </div>

          {/* Hazards */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569" }}>HAZARD ANNOTATIONS</div>
            <button onClick={() => setShowAddHazard(v => !v)} style={{
              padding: "4px 14px", background: "#0f2d1a", color: "#4ade80",
              border: "1px solid #166534", borderRadius: 4, cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", fontWeight: 700,
            }}>+ ADD HAZARD</button>
          </div>

          {showAddHazard && (
            <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>TYPE</div>
                  <select value={newHazard.type} onChange={e => setNewHazard(p => ({ ...p, type: e.target.value }))}
                    style={{ width: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11 }}>
                    <option>DATA</option>
                    <option>CONTROL</option>
                    <option>STRUCTURAL</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>INSTRUCTION NUMBERS (comma separated, e.g. 1,2)</div>
                  <input value={newHazard.instructions} onChange={e => setNewHazard(p => ({ ...p, instructions: e.target.value }))}
                    placeholder="1, 2"
                    style={{ width: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>TITLE</div>
                <input value={newHazard.title} onChange={e => setNewHazard(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. RAW Hazard: MOV → LDR"
                  style={{ width: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>EXPLANATION</div>
                <textarea value={newHazard.detail} onChange={e => setNewHazard(p => ({ ...p, detail: e.target.value }))}
                  placeholder="Describe the hazard..."
                  style={{ width: "100%", height: 80, background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11, resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addHazard} style={{ padding: "6px 16px", background: "#14532d", color: "#86efac", border: "1px solid #166534", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700 }}>SAVE HAZARD</button>
                <button onClick={() => setShowAddHazard(false)} style={{ padding: "6px 16px", background: "#1e293b", color: "#64748b", border: "1px solid #1e293b", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>CANCEL</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
            {hazards.length === 0 && (
              <div style={{ color: "#334155", fontSize: 11, fontStyle: "italic", padding: "12px 0" }}>No hazards annotated yet. Click + ADD HAZARD to mark one.</div>
            )}
            {hazards.map((h, i) => {
              const color = HAZARD_COLORS[h.type] || "#64748b";
              const isActive = activeHazard === i;
              return (
                <div key={i} onClick={() => setActiveHazard(isActive ? null : i)} style={{
                  background: isActive ? "#1e293b" : "#0a1628",
                  border: `1px solid ${isActive ? color : "#1e293b"}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 6, padding: "10px 14px", cursor: "pointer", transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: color, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 3, letterSpacing: 1 }}>{h.type}</span>
                    <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 12, flex: 1 }}>{h.title || "(untitled)"}</span>
                    <span style={{ color: "#475569", fontSize: 11 }}>instrs: {(h.rows || []).map(r => r + 1).join(", ")}</span>
                    <button onClick={e => { e.stopPropagation(); removeHazard(i); }} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, padding: "0 4px" }}>✕</button>
                    <span style={{ color: "#475569", fontSize: 12 }}>{isActive ? "▲" : "▼"}</span>
                  </div>
                  {isActive && h.detail && (
                    <pre style={{ margin: "10px 0 0", color: "#94a3b8", fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap", borderTop: "1px solid #1e293b", paddingTop: 10 }}>{h.detail}</pre>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {hazards.length > 0 && (
            <div style={{ padding: 16, background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 12 }}>SUMMARY</div>
              <div style={{ display: "flex", gap: 32 }}>
                {Object.entries(counts).map(([type, count]) => (
                  <div key={type} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: HAZARD_COLORS[type] }}>{count}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── TAB 2: Simulate (with IDLE/CANCEL) ──────────────────────────────────────
function SimulateTab() {
  const [code, setCode] = useState(
`MOV R5, #52
LDR R7, [R5, #0]
LDRB R2, [R5, #4]
LDRB R1, [R5, #5]
MOVS R10, R1
BPL POS
SUB R6, R3, R2
NOP
NOP
B SAVE
POS ADD R6, R3, R2
SAVE STRB R6, [R5, #6]
END B END`
  );
  const [instructions, setInstructions] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [parsed, setParsed] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // {row, cycle}
  const [activeTool, setActiveTool] = useState("IDLE");

  const handleParse = () => {
    const instrs = parseInstructions(code);
    setInstructions(instrs);
    setPipeline(buildDefaultPipeline(instrs));
    setParsed(true);
    setSelectedCell(null);
  };

  const handleCellClick = useCallback((rowIdx, cycle) => {
    setPipeline(prev => {
      const next = prev.map(r => ({ ...r }));
      const current = next[rowIdx][cycle];
      if (activeTool === "CLEAR") {
        delete next[rowIdx][cycle];
      } else if (current === activeTool) {
        delete next[rowIdx][cycle];
      } else {
        next[rowIdx][cycle] = activeTool;
      }
      return next;
    });
  }, [activeTool]);

  const handleAddRow = () => {
    setInstructions(prev => [...prev, "NOP"]);
    setPipeline(prev => [...prev, {}]);
  };

  const tools = [
    ...CELL_TYPES.map(t => ({ label: t === "CANCEL" ? "✕ CANCEL" : t === "IDLE" ? "— IDLE" : t, value: t, color: (STAGE_COLORS[t] || STAGE_COLORS.IF).bg, textColor: (STAGE_COLORS[t] || STAGE_COLORS.IF).text })),
    { label: "⌫ CLEAR", value: "CLEAR", color: "#1e293b", textColor: "#64748b" },
  ];

  return (
    <div>
      {/* Code input */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 8 }}>ASSEMBLY CODE</div>
        <textarea
          value={code}
          onChange={e => { setCode(e.target.value); setParsed(false); }}
          style={{
            width: "100%", height: 140, background: "#0a1628", border: "1px solid #1e293b",
            borderRadius: 6, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12, padding: 12, resize: "vertical", boxSizing: "border-box", outline: "none",
          }}
        />
        <button onClick={handleParse} style={{
          marginTop: 8, padding: "7px 20px",
          background: parsed ? "#1e293b" : "#0f4c75",
          color: parsed ? "#475569" : "#93c5fd",
          border: `1px solid ${parsed ? "#1e293b" : "#0369a1"}`,
          borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700, letterSpacing: 1,
        }}>
          {parsed ? "✓ PARSED" : "▶ PARSE & BUILD TRACE"}
        </button>
      </div>

      {parsed && instructions.length > 0 && (
        <>
          {/* Toolbar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 8 }}>PAINT TOOL — click cells to apply</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {tools.map(t => (
                <button key={t.value} onClick={() => setActiveTool(t.value)} style={{
                  padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                  background: activeTool === t.value ? t.color : "#0a1628",
                  color: activeTool === t.value ? t.textColor : "#475569",
                  border: `2px solid ${activeTool === t.value ? t.textColor + "66" : "#1e293b"}`,
                  fontSize: 10, fontWeight: 700, fontFamily: "inherit", letterSpacing: 0.5,
                  transition: "all 0.1s",
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>
              Click a cell to paint it with the selected tool. Click same cell again to clear it.
            </div>
          </div>

          {/* Editable pipeline table */}
          <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <PipelineTable
              instructions={instructions}
              pipeline={pipeline}
              highlightedRows={[]}
              onCellClick={handleCellClick}
              editMode={true}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button onClick={handleAddRow} style={{
              padding: "6px 14px", background: "#0f2d1a", color: "#4ade80",
              border: "1px solid #166534", borderRadius: 4, cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", fontWeight: 700,
            }}>+ ADD ROW</button>
            <button onClick={() => setPipeline(buildDefaultPipeline(instructions))} style={{
              padding: "6px 14px", background: "#1e293b", color: "#94a3b8",
              border: "1px solid #1e293b", borderRadius: 4, cursor: "pointer",
              fontSize: 11, fontFamily: "inherit",
            }}>↺ RESET TRACE</button>
          </div>

          {/* Legend */}
          <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, padding: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 10 }}>LEGEND</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[...STAGES, "IDLE", "CANCEL"].map(s => {
                const c = STAGE_COLORS[s];
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 3, background: c.bg, color: c.text, fontSize: 10, fontWeight: 700 }}>
                      {s === "CANCEL" ? "✕" : s === "IDLE" ? "—" : s}
                    </span>
                    <span style={{ fontSize: 10, color: "#475569" }}>
                      {{ IF:"Fetch", ID:"Decode", EX:"Execute", MEM:"Memory", WB:"Write Back", IDLE:"Stall/Bubble", CANCEL:"Squashed" }[s]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!parsed && (
        <div style={{ color: "#334155", fontSize: 12, fontStyle: "italic", padding: "24px 0", textAlign: "center" }}>
          Paste your assembly code above and click PARSE to build an editable trace.
        </div>
      )}
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("analyze");

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      background: "#0f172a", minHeight: "100vh", color: "#e2e8f0",
    }}>
      {/* Top bar */}
      <div style={{ background: "#080f1e", borderBottom: "1px solid #1e293b", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ padding: "14px 0", marginRight: 32 }}>
            <span style={{ fontSize: 10, letterSpacing: 4, color: "#475569" }}>ARM </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", letterSpacing: 1 }}>PIPELINE TOOL</span>
          </div>
          {[
            { id: "analyze", label: "① ANALYZE — identify hazards" },
            { id: "simulate", label: "② SIMULATE — add stalls & cancels" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "14px 20px", background: "none", cursor: "pointer",
              border: "none", borderBottom: `2px solid ${tab === t.id ? "#38bdf8" : "transparent"}`,
              color: tab === t.id ? "#38bdf8" : "#475569",
              fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
              fontFamily: "inherit", letterSpacing: 0.5, transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        {tab === "analyze" ? <AnalyzeTab /> : <SimulateTab />}
      </div>
    </div>
  );
}