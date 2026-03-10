import React, { useState } from "react";

const instructions = [
  { id: 1,  label: "MOV R5, #52",         short: "MOV R5,#52"     },
  { id: 2,  label: "LDR R7, [R5, #0]",    short: "LDR R7,[R5]"   },
  { id: 3,  label: "LDRB R2, [R5, #4]",   short: "LDRB R2,[R5+4]"},
  { id: 4,  label: "LDRB R1, [R5, #5]",   short: "LDRB R1,[R5+5]"},
  { id: 5,  label: "MOVS R10, R1",         short: "MOVS R10,R1"   },
  { id: 6,  label: "BPL POS",              short: "BPL POS"       },
  { id: 7,  label: "SUB R6,R3,R2",         short: "SUB R6,R3,R2"  },
  { id: 8,  label: "NOP",                  short: "NOP"           },
  { id: 9,  label: "NOP",                  short: "NOP"           },
  { id: 10, label: "B SAVE",               short: "B SAVE"        },
  { id: 11, label: "POS: ADD R6,R3,R2",    short: "ADD R6,R3,R2"  },
  { id: 12, label: "SAVE: STRB R6,[R5,#6]",short: "STRB R6,[R5+6]"},
  { id: 13, label: "END: B END",           short: "B END"         },
];

// Pipeline stages per cycle for each instruction (no stalls, no hazard prevention)
// Format: [IF_cycle, ID_cycle, EX_cycle, MEM_cycle, WB_cycle]
const pipeline = [
  [1,2,3,4,5],   // 1 MOV R5
  [2,3,4,5,6],   // 2 LDR R7
  [3,4,5,6,7],   // 3 LDRB R2
  [4,5,6,7,8],   // 4 LDRB R1
  [5,6,7,8,9],   // 5 MOVS R10,R1
  [6,7,8,9,10],  // 6 BPL POS
  [7,8,9,10,11], // 7 SUB (taken path = killed, shown for hazard analysis)
  [8,9,10,11,12],// 8 NOP
  [9,10,11,12,13],// 9 NOP
  [10,11,12,13,14],// 10 B SAVE
  [11,12,13,14,15],// 11 ADD (branch target)
  [12,13,14,15,16],// 12 STRB
  [13,14,15,16,17],// 13 B END
];

const STAGES = ["IF","ID","EX","MEM","WB"];

const hazards = [
  {
    type: "DATA",
    color: "#ef4444",
    bg: "#fef2f2",
    title: "H1 — RAW Data Hazard: MOV → LDR R7",
    instructions: [1,2],
    detail: `MOV R5,#52 writes R5 at WB (cycle 5).
LDR R7,[R5] reads R5 at ID (cycle 3).
R5 is not yet written — stale value read.
Cause: 2-cycle gap insufficient; R5 WB is cycle 5, ID is cycle 3.`
  },
  {
    type: "DATA",
    color: "#ef4444",
    bg: "#fef2f2",
    title: "H2 — RAW Data Hazard: MOV → LDRB R2",
    instructions: [1,3],
    detail: `MOV R5,#52 writes R5 at WB (cycle 5).
LDRB R2,[R5+4] reads R5 at ID (cycle 4).
R5 WB (cycle 5) > ID (cycle 4) → hazard.`
  },
  {
    type: "DATA",
    color: "#ef4444",
    bg: "#fef2f2",
    title: "H3 — RAW Data Hazard: MOV → LDRB R1",
    instructions: [1,4],
    detail: `MOV R5,#52 writes R5 at WB (cycle 5).
LDRB R1,[R5+5] reads R5 at ID (cycle 5).
Both in cycle 5 — register file read happens before WB write completes (timing race).`
  },
  {
    type: "DATA",
    color: "#f97316",
    bg: "#fff7ed",
    title: "H4 — Load-Use RAW: LDRB R1 → MOVS R10",
    instructions: [4,5],
    detail: `LDRB R1 loads from memory at MEM stage (cycle 7), WB at cycle 8.
MOVS R10,R1 needs R1 at ID (cycle 6).
Classic load-use hazard: data not available until after MEM stage.
Memory latency of 1 cycle makes this 1 cycle worse than a normal RAW.`
  },
  {
    type: "DATA",
    color: "#f97316",
    bg: "#fff7ed",
    title: "H5 — RAW Data Hazard: MOVS → BPL",
    instructions: [5,6],
    detail: `MOVS R10,R1 sets the N flag (condition codes) at EX (cycle 7), WB cycle 9.
BPL POS reads the N flag at ID (cycle 7) to decide branch direction.
Flag not yet written when BPL decodes — branch decision may be wrong.`
  },
  {
    type: "CONTROL",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "H6 — Control Hazard: BPL POS (branch taken)",
    instructions: [6,7,8,9],
    detail: `BPL POS is fetched at cycle 6. Branch target address resolved at EX (cycle 8).
Instructions at cycles 7, 8 (SUB, NOP) have already been fetched and are in the pipeline — these are wasted slots (branch penalty = 2 cycles).
Assuming branch IS taken → SUB and the following NOP are squashed.`
  },
  {
    type: "STRUCTURAL",
    color: "#0891b2",
    bg: "#ecfeff",
    title: "H7 — Structural Hazard: Memory port conflict",
    instructions: [2,3],
    detail: `LDR R7 (MEM stage, cycle 5) and LDRB R2 (MEM stage, cycle 6) both access data memory in consecutive cycles.
If only one memory port exists and it also serves instruction fetch, LDR R7 at MEM (cycle 5) conflicts with LDRB R2 IF (also memory fetch).
With memory latency of 1 extra cycle, LDRB R2 stalls in MEM longer, potentially blocking LDRB R1's IF.`
  },
  {
    type: "CONTROL",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "H8 — Control Hazard: B SAVE (unconditional branch)",
    instructions: [10,11],
    detail: `B SAVE is fetched at cycle 10. Branch target resolved at EX (cycle 12).
Instructions fetched at cycles 11, 12 (ADD/STRB) may be wrong-path instructions → 2-cycle penalty.`
  },
];

const typeColors = {
  DATA:       { border: "#ef4444", badge: "#fecaca", text: "#991b1b" },
  "LOAD-USE": { border: "#f97316", badge: "#fed7aa", text: "#9a3412" },
  STRUCTURAL: { border: "#0891b2", badge: "#bae6fd", text: "#075985" },
  CONTROL:    { border: "#8b5cf6", badge: "#ddd6fe", text: "#5b21b6" },
};

const MAX_CYCLES = 18;

export default function App() {
  const [activeHazard, setActiveHazard] = useState(null);
  const [hoveredInstr, setHoveredInstr] = useState(null);

  const highlighted = activeHazard !== null ? hazards[activeHazard].instructions : [];

  const stageColor = (stage) => {
    if (stage === "IF")  return "#1e3a5f";
    if (stage === "ID")  return "#1d4e3f";
    if (stage === "EX")  return "#4a1942";
    if (stage === "MEM") return "#7a2d00";
    if (stage === "WB")  return "#14532d";
    return "#374151";
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", marginBottom: 6 }}>ARM PIPELINE ANALYSIS</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>5-Stage Pipeline Hazard Trace</h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>No hazard prevention • Memory latency = 1 cycle • Branch assumed TAKEN</p>
        </div>

        {/* Pipeline Table */}
        <div style={{ overflowX: "auto", marginBottom: 36 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 12px", color: "#64748b", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", minWidth: 180 }}>Instruction</th>
                {Array.from({length: MAX_CYCLES}, (_,i) => (
                  <th key={i} style={{ padding: "6px 4px", color: "#64748b", borderBottom: "1px solid #1e293b", textAlign: "center", minWidth: 32 }}>{i+1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instructions.map((instr, idx) => {
                const stages = pipeline[idx];
                const isHighlighted = highlighted.includes(instr.id);
                const rowBg = isHighlighted ? "#1e293b" : "transparent";
                return (
                  <tr key={instr.id}
                    onMouseEnter={() => setHoveredInstr(instr.id)}
                    onMouseLeave={() => setHoveredInstr(null)}
                    style={{ background: hoveredInstr === instr.id ? "#1e293b" : rowBg, transition: "background 0.15s" }}
                  >
                    <td style={{
                      padding: "5px 12px", borderBottom: "1px solid #0f172a",
                      color: isHighlighted ? "#f1f5f9" : "#94a3b8",
                      fontWeight: isHighlighted ? 700 : 400,
                      whiteSpace: "nowrap", fontSize: 11,
                      borderLeft: isHighlighted ? "3px solid #f97316" : "3px solid transparent"
                    }}>
                      {instr.id}. {instr.label}
                    </td>
                    {Array.from({length: MAX_CYCLES}, (_,c) => {
                      const cycleNum = c + 1;
                      const stageIdx = stages.indexOf(cycleNum);
                      const stageName = stageIdx >= 0 ? STAGES[stageIdx] : null;
                      return (
                        <td key={c} style={{ textAlign: "center", padding: "4px 2px", borderBottom: "1px solid #0f172a" }}>
                          {stageName && (
                            <span style={{
                              display: "inline-block",
                              padding: "2px 4px",
                              borderRadius: 3,
                              background: stageColor(stageName),
                              color: "#e2e8f0",
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: 0.5,
                              opacity: isHighlighted ? 1 : 0.75,
                              border: isHighlighted ? "1px solid #f97316" : "1px solid transparent",
                            }}>{stageName}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Stage Legend */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          {STAGES.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 28, textAlign: "center", padding: "2px 4px", borderRadius: 3, background: stageColor(s), color: "#e2e8f0", fontSize: 10, fontWeight: 700 }}>{s}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {{ IF:"Instruction Fetch", ID:"Instruction Decode", EX:"Execute", MEM:"Memory Access", WB:"Write Back" }[s]}
              </span>
            </div>
          ))}
        </div>

        {/* Hazards */}
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", marginBottom: 14 }}>IDENTIFIED HAZARDS — click to highlight</div>
        <div style={{ display: "grid", gap: 10 }}>
          {hazards.map((h, i) => {
            const tc = h.type === "LOAD-USE" ? typeColors["LOAD-USE"] : typeColors[h.type];
            const isActive = activeHazard === i;
            return (
              <div key={i}
                onClick={() => setActiveHazard(isActive ? null : i)}
                style={{
                  background: isActive ? "#1e293b" : "#0f1f35",
                  border: `1px solid ${isActive ? h.color : "#1e293b"}`,
                  borderLeft: `4px solid ${h.color}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isActive ? 10 : 0 }}>
                  <span style={{ background: h.color, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 3, letterSpacing: 1 }}>{h.type}</span>
                  <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 12 }}>{h.title}</span>
                  <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 12 }}>{isActive ? "▲" : "▼"}</span>
                </div>
                {isActive && (
                  <pre style={{ margin: 0, color: "#94a3b8", fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap", borderTop: `1px solid #1e293b`, paddingTop: 10 }}>
                    {h.detail}
                  </pre>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div style={{ marginTop: 32, padding: 20, background: "#0f1f35", border: "1px solid #1e293b", borderRadius: 6 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", marginBottom: 12 }}>SUMMARY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { label: "Data (RAW)", count: 4, color: "#ef4444" },
              { label: "Structural", count: 1, color: "#0891b2" },
              { label: "Control", count: 2, color: "#8b5cf6" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{s.label} Hazards</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}