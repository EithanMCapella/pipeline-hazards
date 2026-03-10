import React, { useState, useCallback } from "react";

// ── constants ────────────────────────────────────────────────────────────────
const STAGES = ["IF", "ID", "EX", "MEM", "WB"];
const STAGE_COLORS = {
  IF:     { bg: "#1e3a5f", text: "#93c5fd" },
  ID:     { bg: "#1d4e3f", text: "#6ee7b7" },
  EX:     { bg: "#4a1942", text: "#f0abfc" },
  MEM:    { bg: "#7a2d00", text: "#fdba74" },
  WB:     { bg: "#14532d", text: "#86efac" },
  IDLE:   { bg: "#1e293b", text: "#475569" },
  CANCEL: { bg: "#450a0a", text: "#f87171" },
};
const HAZARD_COLORS = {
  DATA:       "#ef4444",
  CONTROL:    "#8b5cf6",
  STRUCTURAL: "#0891b2",
};
const CELL_TYPES = ["IF","ID","EX","MEM","WB","IDLE","CANCEL"];
const DEFAULT_CYCLES = 20;

// ── helpers ──────────────────────────────────────────────────────────────────
function parseInstructions(raw) {
  return raw.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith(";") && !l.startsWith("//"));
}

function buildDefaultPipeline(instructions) {
  return instructions.map((_, i) => {
    const row = {};
    STAGES.forEach((s, si) => { row[i + 1 + si] = s; });
    return row;
  });
}

function shiftRowCycles(row, delta) {
  const next = {};
  Object.entries(row).forEach(([c, v]) => {
    const newC = parseInt(c) + delta;
    if (newC >= 1) next[newC] = v;
  });
  return next;
}

// ── Pipeline Table ───────────────────────────────────────────────────────────
function PipelineTable({
  instructions, pipeline, highlightedRows,
  onCellClick, editMode, numCycles,
  onMoveUp, onMoveDown, onDeleteRow,
  onInsertAbove, onInsertBelow,
  onShiftRow, onLabelChange,
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const cycles = Array.from({ length: numCycles }, (_, i) => i + 1);

  const handleRowRightClick = (e, rowIdx) => {
    if (!editMode) return;
    e.preventDefault();
    setContextMenu({ rowIdx, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setContextMenu(null);

  return (
    <div style={{ overflowX: "auto" }} onClick={closeMenu}>
      {contextMenu && (
        <div style={{
          position: "fixed", top: contextMenu.y, left: contextMenu.x,
          background: "#0f172a", border: "1px solid #334155", borderRadius: 6,
          zIndex: 1000, padding: 4, minWidth: 190, boxShadow: "0 8px 32px #000a",
        }}>
          {[
            { label: "↑  Move up",           action: () => { onMoveUp(contextMenu.rowIdx); closeMenu(); } },
            { label: "↓  Move down",          action: () => { onMoveDown(contextMenu.rowIdx); closeMenu(); } },
            { label: "⬆  Insert row above",   action: () => { onInsertAbove(contextMenu.rowIdx); closeMenu(); } },
            { label: "⬇  Insert row below",   action: () => { onInsertBelow(contextMenu.rowIdx); closeMenu(); } },
            { label: "◀  Shift cells left",   action: () => { onShiftRow(contextMenu.rowIdx, -1); closeMenu(); } },
            { label: "▶  Shift cells right",  action: () => { onShiftRow(contextMenu.rowIdx, +1); closeMenu(); } },
            { label: "✕  Delete row",         action: () => { onDeleteRow(contextMenu.rowIdx); closeMenu(); }, danger: true },
          ].map(item => (
            <div key={item.label} onClick={item.action}
              style={{ padding: "7px 14px", cursor: "pointer", fontSize: 11, color: item.danger ? "#f87171" : "#94a3b8", borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = "#1e293b"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >{item.label}</div>
          ))}
        </div>
      )}

      <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            {editMode && <th style={{ width: 52, padding: "5px 4px", color: "#334155", borderBottom: "1px solid #1e293b", fontSize: 10 }}></th>}
            <th style={{ textAlign: "left", padding: "6px 12px", color: "#475569", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", minWidth: 210 }}>
              Instruction
            </th>
            {cycles.map(c => (
              <th key={c} style={{ padding: "5px 2px", color: "#475569", borderBottom: "1px solid #1e293b", textAlign: "center", minWidth: 36, fontSize: 10 }}>{c}</th>
            ))}
            {editMode && <th style={{ width: 28, borderBottom: "1px solid #1e293b" }} />}
          </tr>
        </thead>
        <tbody>
          {instructions.map((instr, idx) => {
            const isHighlighted = highlightedRows.includes(idx);
            const row = pipeline[idx] || {};
            return (
              <tr key={idx}
                onContextMenu={e => handleRowRightClick(e, idx)}
                style={{
                  background: isHighlighted ? "#1e293b" : "transparent",
                  borderLeft: isHighlighted ? "3px solid #f97316" : "3px solid transparent",
                  transition: "background 0.1s",
                }}>

                {editMode && (
                  <td style={{ padding: "2px 4px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
                      <button onClick={() => onMoveUp(idx)} disabled={idx === 0}
                        style={{ background: "none", border: "none", color: idx === 0 ? "#1e293b" : "#475569", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, padding: "1px 4px", lineHeight: 1 }}>▲</button>
                      <button onClick={() => onMoveDown(idx)} disabled={idx === instructions.length - 1}
                        style={{ background: "none", border: "none", color: idx === instructions.length - 1 ? "#1e293b" : "#475569", cursor: idx === instructions.length - 1 ? "default" : "pointer", fontSize: 10, padding: "1px 4px", lineHeight: 1 }}>▼</button>
                    </div>
                  </td>
                )}

                <td style={{ padding: "4px 8px", borderBottom: "1px solid #0f172a", color: isHighlighted ? "#f1f5f9" : "#94a3b8", fontWeight: isHighlighted ? 700 : 400, whiteSpace: "nowrap", fontSize: 11 }}>
                  {editMode ? (
                    <input value={instr} onChange={e => onLabelChange(idx, e.target.value)}
                      style={{ background: "transparent", border: "none", borderBottom: "1px solid #1e293b", color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, width: 195, outline: "none", padding: "1px 2px" }} />
                  ) : (
                    <span>{idx + 1}. {instr}</span>
                  )}
                </td>

                {cycles.map(c => {
                  const cellType = row[c];
                  const sc = cellType ? (STAGE_COLORS[cellType] || STAGE_COLORS.IF) : null;
                  if (editMode && onCellClick) {
                    return (
                      <td key={c} style={{ padding: "3px 2px", textAlign: "center", minWidth: 36, cursor: "pointer" }}
                        onClick={() => onCellClick(idx, c)}>
                        {sc ? (
                          <span style={{ display: "inline-block", padding: "2px 5px", borderRadius: 3, background: sc.bg, color: sc.text, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, border: `1px solid ${sc.text}44`, cursor: "pointer" }}>
                            {cellType === "CANCEL" ? "✕" : cellType === "IDLE" ? "—" : cellType}
                          </span>
                        ) : (
                          <span style={{ display: "inline-block", width: 28, height: 18, borderRadius: 3, border: "1px dashed #1e293b" }} />
                        )}
                      </td>
                    );
                  }
                  if (!sc) return <td key={c} style={{ padding: "3px 2px", minWidth: 36 }} />;
                  return (
                    <td key={c} style={{ padding: "3px 2px", textAlign: "center", minWidth: 36 }}>
                      <span style={{ display: "inline-block", padding: "2px 5px", borderRadius: 3, background: sc.bg, color: sc.text, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, border: `1px solid ${sc.text}22`, opacity: isHighlighted ? 1 : 0.75, outline: isHighlighted ? "1px solid #f97316" : "none" }}>
                        {cellType === "CANCEL" ? "✕" : cellType === "IDLE" ? "—" : cellType}
                      </span>
                    </td>
                  );
                })}

                {editMode && (
                  <td style={{ padding: "2px 4px", textAlign: "center" }}>
                    <button onClick={() => onDeleteRow(idx)}
                      style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 13, padding: "2px 4px" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                      onMouseLeave={e => e.currentTarget.style.color = "#334155"}>✕</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Cycle Controls ────────────────────────────────────────────────────────────
function CycleControls({ numCycles, setNumCycles, minCycles }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "#475569" }}>Cycles:</span>
      <button onClick={() => setNumCycles(n => Math.max(minCycles, n - 5))}
        style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>−</button>
      <span style={{ fontSize: 12, color: "#f1f5f9", minWidth: 28, textAlign: "center" }}>{numCycles}</span>
      <button onClick={() => setNumCycles(n => n + 5)}
        style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>+</button>
    </div>
  );
}

// ── TAB 1: Analyze ────────────────────────────────────────────────────────────
const DEFAULT_CODE = `MOV R5, #52
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
END B END`;

function AnalyzeTab() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [instructions, setInstructions] = useState(() => parseInstructions(DEFAULT_CODE));
  const [pipeline, setPipeline] = useState(() => buildDefaultPipeline(parseInstructions(DEFAULT_CODE)));
  const [numCycles, setNumCycles] = useState(DEFAULT_CYCLES);
  const [hazards, setHazards] = useState([]);
  const [activeHazard, setActiveHazard] = useState(null);
  const [showAddHazard, setShowAddHazard] = useState(false);
  const [newHazard, setNewHazard] = useState({ type: "DATA", instructions: "", title: "", detail: "" });
  const [parsed, setParsed] = useState(true);

  const handleParse = () => {
    const instrs = parseInstructions(code);
    setInstructions(instrs);
    setPipeline(buildDefaultPipeline(instrs));
    setNumCycles(Math.max(DEFAULT_CYCLES, instrs.length + STAGES.length + 2));
    setHazards([]);
    setActiveHazard(null);
    setParsed(true);
  };

  const addHazard = () => {
    const rows = newHazard.instructions.split(",").map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n));
    setHazards(prev => [...prev, { ...newHazard, rows }]);
    setNewHazard({ type: "DATA", instructions: "", title: "", detail: "" });
    setShowAddHazard(false);
  };

  const removeHazard = i => { setHazards(p => p.filter((_, x) => x !== i)); if (activeHazard === i) setActiveHazard(null); };
  const highlightedRows = activeHazard !== null ? hazards[activeHazard].rows : [];
  const counts = { DATA: 0, CONTROL: 0, STRUCTURAL: 0 };
  hazards.forEach(h => { if (counts[h.type] !== undefined) counts[h.type]++; });
  const minCycles = instructions.length + STAGES.length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 8 }}>ASSEMBLY CODE</div>
        <textarea value={code} onChange={e => { setCode(e.target.value); setParsed(false); }}
          style={{ width: "100%", height: 180, background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: 12, resize: "vertical", boxSizing: "border-box", outline: "none" }} />
        <button onClick={handleParse} style={{
          marginTop: 8, padding: "7px 20px", background: parsed ? "#1e293b" : "#0f4c75",
          color: parsed ? "#475569" : "#93c5fd", border: `1px solid ${parsed ? "#1e293b" : "#0369a1"}`,
          borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700, letterSpacing: 1,
        }}>{parsed ? "✓ PARSED" : "▶ PARSE & BUILD TRACE"}</button>
      </div>

      {instructions.length > 0 && (<>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", flex: 1 }}>PIPELINE TRACE</div>
          <CycleControls numCycles={numCycles} setNumCycles={setNumCycles} minCycles={minCycles} />
        </div>
        <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, padding: 12, marginBottom: 20 }}>
          <PipelineTable instructions={instructions} pipeline={pipeline} highlightedRows={highlightedRows} numCycles={numCycles} />
        </div>

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

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569" }}>HAZARD ANNOTATIONS</div>
          <button onClick={() => setShowAddHazard(v => !v)} style={{ padding: "4px 14px", background: "#0f2d1a", color: "#4ade80", border: "1px solid #166534", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700 }}>+ ADD HAZARD</button>
        </div>

        {showAddHazard && (
          <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>TYPE</div>
                <select value={newHazard.type} onChange={e => setNewHazard(p => ({ ...p, type: e.target.value }))}
                  style={{ width: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11 }}>
                  <option>DATA</option><option>CONTROL</option><option>STRUCTURAL</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>INSTRUCTION NUMBERS (e.g. 1,2)</div>
                <input value={newHazard.instructions} onChange={e => setNewHazard(p => ({ ...p, instructions: e.target.value }))} placeholder="1, 2"
                  style={{ width: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>TITLE</div>
              <input value={newHazard.title} onChange={e => setNewHazard(p => ({ ...p, title: e.target.value }))} placeholder="e.g. RAW Hazard: MOV → LDR"
                style={{ width: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>EXPLANATION</div>
              <textarea value={newHazard.detail} onChange={e => setNewHazard(p => ({ ...p, detail: e.target.value }))} placeholder="Describe the hazard..."
                style={{ width: "100%", height: 80, background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: 11, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addHazard} style={{ padding: "6px 16px", background: "#14532d", color: "#86efac", border: "1px solid #166534", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700 }}>SAVE HAZARD</button>
              <button onClick={() => setShowAddHazard(false)} style={{ padding: "6px 16px", background: "#1e293b", color: "#64748b", border: "1px solid #1e293b", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>CANCEL</button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
          {hazards.length === 0 && <div style={{ color: "#334155", fontSize: 11, fontStyle: "italic", padding: "12px 0" }}>No hazards annotated yet. Click + ADD HAZARD to mark one.</div>}
          {hazards.map((h, i) => {
            const color = HAZARD_COLORS[h.type] || "#64748b";
            const isActive = activeHazard === i;
            return (
              <div key={i} onClick={() => setActiveHazard(isActive ? null : i)} style={{
                background: isActive ? "#1e293b" : "#0a1628", border: `1px solid ${isActive ? color : "#1e293b"}`,
                borderLeft: `4px solid ${color}`, borderRadius: 6, padding: "10px 14px", cursor: "pointer", transition: "all 0.15s",
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
      </>)}
    </div>
  );
}

// ── Cycle Summary Table ───────────────────────────────────────────────────────
function buildCycleTableV2(instructions, pipeline, numCycles) {
  const rows = [];
  for (let c = 1; c <= numCycles; c++) {
    const entry = { cycle: c, IF: "", ID: "", EX: "", MEM: "", WB: "" };
    instructions.forEach((instr, idx) => {
      const row = pipeline[idx] || {};
      const cellVal = row[c];
      if (!cellVal) return;
      if (STAGES.includes(cellVal)) {
        entry[cellVal] = instr;
      } else if (cellVal === "IDLE" || cellVal === "CANCEL") {
        const sortedKeys = Object.keys(row).map(Number).sort((a, b) => a - b);
        const posInRow = sortedKeys.indexOf(c);
        if (posInRow >= 0 && posInRow < STAGES.length) {
          entry[STAGES[posInRow]] = cellVal === "IDLE" ? "IDLE" : "CANCEL";
        }
      }
    });
    rows.push(entry);
  }
  let last = rows.length - 1;
  while (last > 0 && !STAGES.some(s => rows[last][s])) last--;
  return rows.slice(0, last + 1);
}

function buildCSV(cycleRows) {
  const header = ["Cycle", "IF", "ID", "EX", "MEM", "WB"].join(",");
  const lines = cycleRows.map(r =>
    [r.cycle, r.IF, r.ID, r.EX, r.MEM, r.WB].map(v => `"${v}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

function CycleSummaryTable({ instructions, pipeline, numCycles }) {
  const [copied, setCopied] = useState(false);
  const cycleRows = buildCycleTableV2(instructions, pipeline, numCycles);

  const handleCopy = () => {
    const csv = buildCSV(cycleRows);
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const stageColColors = {
    IF:  { bg: "#1e3a5f", text: "#93c5fd" },
    ID:  { bg: "#1d4e3f", text: "#6ee7b7" },
    EX:  { bg: "#4a1942", text: "#f0abfc" },
    MEM: { bg: "#7a2d00", text: "#fdba74" },
    WB:  { bg: "#14532d", text: "#86efac" },
  };

  const getCellStyle = (val) => {
    if (!val) return { color: "#1e293b" };
    if (val === "IDLE") return { color: "#475569", fontStyle: "italic", background: "#f8ac71" };
    if (val === "CANCEL") return { color: "#475569", fontStyle: "italic", background: "#f8d471" };
    return { color: "#e2e8f0", fontWeight: 600 };
  };

  const displayVal = (val) => {
    if (!val) return <span style={{ color: "#1e293b" }}>·</span>;
    if (val === "IDLE") return <span>— idle</span>;
    if (val === "CANCEL") return <span>✕ canceled</span>;
    return val;
  };

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", flex: 1 }}>CYCLE SUMMARY TABLE</div>
        <button onClick={handleCopy} style={{
          padding: "5px 18px",
          background: copied ? "#14532d" : "#0f2d1a",
          color: copied ? "#86efac" : "#4ade80",
          border: "1px solid #166534",
          borderRadius: 4, cursor: "pointer", fontSize: 11,
          fontFamily: "inherit", fontWeight: 700, transition: "all 0.2s",
          letterSpacing: 0.5,
        }}>
          {copied ? "✓ COPIED!" : "⎘ COPY CSV"}
        </button>
      </div>

      <div style={{ overflowX: "auto", background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
          <thead>
            <tr>
              <th style={{
                padding: "9px 16px", textAlign: "center", background: "#080f1e",
                color: "#475569", borderBottom: "1px solid #1e293b",
                borderRight: "1px solid #1e293b", fontSize: 10, letterSpacing: 3, minWidth: 64,
              }}>CYCLE</th>
              {STAGES.map(s => {
                const sc = stageColColors[s];
                return (
                  <th key={s} style={{
                    padding: "9px 16px", textAlign: "center", minWidth: 170,
                    background: sc.bg, color: sc.text,
                    borderBottom: "1px solid #1e293b", borderRight: "1px solid #0f172a",
                    fontSize: 11, fontWeight: 800, letterSpacing: 1,
                  }}>{s}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cycleRows.map((row, i) => {
              const hasActivity = STAGES.some(s => row[s]);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#0a1628" : "#070e1c" }}>
                  <td style={{
                    padding: "7px 16px", textAlign: "center", fontWeight: 800,
                    color: hasActivity ? "#38bdf8" : "#1e3a5f",
                    borderBottom: "1px solid #0f172a", borderRight: "1px solid #1e293b", fontSize: 12,
                  }}>{row.cycle}</td>
                  {STAGES.map(s => {
                    const val = row[s];
                    const cs = getCellStyle(val);
                    return (
                      <td key={s} style={{
                        padding: "7px 16px", textAlign: "center",
                        borderBottom: "1px solid #0f172a", borderRight: "1px solid #0f172a",
                        fontSize: 11, ...cs,
                      }}>
                        {displayVal(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>
        CSV format: Cycle, IF, ID, EX, MEM, WB — paste directly into Excel or Google Sheets
      </div>
    </div>
  );
}

// ── TAB 2: Simulate ───────────────────────────────────────────────────────────
function SimulateTab() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [instructions, setInstructions] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [numCycles, setNumCycles] = useState(DEFAULT_CYCLES);
  const [parsed, setParsed] = useState(false);
  const [activeTool, setActiveTool] = useState("IDLE");

  const handleParse = () => {
    const instrs = parseInstructions(code);
    setInstructions(instrs);
    setPipeline(buildDefaultPipeline(instrs));
    setNumCycles(Math.max(DEFAULT_CYCLES, instrs.length + STAGES.length + 8));
    setParsed(true);
  };

  const handleCellClick = useCallback((rowIdx, cycle) => {
    setPipeline(prev => {
      const next = prev.map(r => ({ ...r }));
      const current = next[rowIdx][cycle];
      if (activeTool === "CLEAR" || current === activeTool) { delete next[rowIdx][cycle]; }
      else { next[rowIdx][cycle] = activeTool; }
      return next;
    });
  }, [activeTool]);

  const moveRow = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= instructions.length) return;
    setInstructions(prev => { const a = [...prev]; [a[idx], a[t]] = [a[t], a[idx]]; return a; });
    setPipeline(prev => { const a = [...prev]; [a[idx], a[t]] = [a[t], a[idx]]; return a; });
  };

  const deleteRow = idx => {
    setInstructions(prev => prev.filter((_, i) => i !== idx));
    setPipeline(prev => prev.filter((_, i) => i !== idx));
  };

  const insertRow = (idx, below) => {
    const pos = below ? idx + 1 : idx;
    setInstructions(prev => { const a = [...prev]; a.splice(pos, 0, "NOP"); return a; });
    setPipeline(prev => { const a = [...prev]; a.splice(pos, 0, {}); return a; });
  };

  const shiftRow = (idx, delta) => {
    setPipeline(prev => { const n = [...prev]; n[idx] = shiftRowCycles(n[idx], delta); return n; });
  };

  const handleLabelChange = (idx, val) => {
    setInstructions(prev => { const a = [...prev]; a[idx] = val; return a; });
  };

  const minCycles = instructions.length + STAGES.length;

  const tools = [
    ...CELL_TYPES.map(t => ({ label: t === "CANCEL" ? "✕ CANCEL" : t === "IDLE" ? "— IDLE" : t, value: t, color: STAGE_COLORS[t].bg, textColor: STAGE_COLORS[t].text })),
    { label: "⌫ CLEAR", value: "CLEAR", color: "#1e293b", textColor: "#64748b" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 8 }}>ASSEMBLY CODE</div>
        <textarea value={code} onChange={e => { setCode(e.target.value); setParsed(false); }}
          style={{ width: "100%", height: 140, background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: 12, resize: "vertical", boxSizing: "border-box", outline: "none" }} />
        <button onClick={handleParse} style={{
          marginTop: 8, padding: "7px 20px", background: parsed ? "#1e293b" : "#0f4c75",
          color: parsed ? "#475569" : "#93c5fd", border: `1px solid ${parsed ? "#1e293b" : "#0369a1"}`,
          borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700, letterSpacing: 1,
        }}>{parsed ? "✓ PARSED" : "▶ PARSE & BUILD TRACE"}</button>
      </div>

      {parsed && instructions.length > 0 && (<>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", marginBottom: 8 }}>PAINT TOOL</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tools.map(t => (
              <button key={t.value} onClick={() => setActiveTool(t.value)} style={{
                padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                background: activeTool === t.value ? t.color : "#0a1628",
                color: activeTool === t.value ? t.textColor : "#475569",
                border: `2px solid ${activeTool === t.value ? t.textColor + "66" : "#1e293b"}`,
                fontSize: 10, fontWeight: 700, fontFamily: "inherit", letterSpacing: 0.5, transition: "all 0.1s",
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>
            Click cells to paint them • Right-click any row for insert / delete / shift-left / shift-right
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#475569", flex: 1 }}>PIPELINE TRACE</div>
          <CycleControls numCycles={numCycles} setNumCycles={setNumCycles} minCycles={minCycles} />
        </div>

        <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <PipelineTable
            instructions={instructions} pipeline={pipeline}
            highlightedRows={[]} numCycles={numCycles}
            onCellClick={handleCellClick} editMode={true}
            onMoveUp={idx => moveRow(idx, -1)}
            onMoveDown={idx => moveRow(idx, +1)}
            onDeleteRow={deleteRow}
            onInsertAbove={idx => insertRow(idx, false)}
            onInsertBelow={idx => insertRow(idx, true)}
            onShiftRow={shiftRow}
            onLabelChange={handleLabelChange}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button onClick={() => insertRow(instructions.length, false)}
            style={{ padding: "6px 14px", background: "#0f2d1a", color: "#4ade80", border: "1px solid #166534", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700 }}>
            + APPEND ROW
          </button>
          <button onClick={() => setPipeline(buildDefaultPipeline(instructions))}
            style={{ padding: "6px 14px", background: "#1e293b", color: "#94a3b8", border: "1px solid #1e293b", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
            ↺ RESET CELLS
          </button>
        </div>

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
                    {{ IF:"Fetch", ID:"Decode", EX:"Execute", MEM:"Memory", WB:"Write Back", IDLE:"Stall / Bubble", CANCEL:"Squashed" }[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <CycleSummaryTable instructions={instructions} pipeline={pipeline} numCycles={numCycles} />
      </>)}

      {!parsed && (
        <div style={{ color: "#334155", fontSize: 12, fontStyle: "italic", padding: "24px 0", textAlign: "center" }}>
          Paste your assembly and click PARSE to build an editable trace.
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("analyze");
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <div style={{ background: "#080f1e", borderBottom: "1px solid #1e293b", padding: "0 32px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center" }}>
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
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 32px" }}>
        {tab === "analyze" ? <AnalyzeTab /> : <SimulateTab />}
      </div>
    </div>
  );
}