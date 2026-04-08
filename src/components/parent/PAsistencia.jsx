// PAsistencia.jsx — Standalone attendance view for parents.
// Shows a weekly grid with option to load more weeks or jump to a full month.
// No AI required — reads directly from the attendance table.

import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

const DAY_ABBR = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const ATT_CFG  = {
  presente: { emoji:"✅", label:"Presente", color:"#10b981" },
  ausente:  { emoji:"❌", label:"Ausente",  color:"#ef4444" },
  tarde:    { emoji:"⏰", label:"Tarde",    color:"#f59e0b" },
};

const fmtDay   = iso => new Date(iso+"T00:00:00").toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"});
const fmtMonth = iso => new Date(iso+"T00:00:00").toLocaleDateString("es-AR",{month:"long",year:"numeric"});

// ── Module-scope components ───────────────────────────────────────────────────

function AttHeader({ primary, onBack }) {
  return (
    <div style={{
      background:`linear-gradient(135deg, ${primary} 0%, #0369a1 100%)`,
      padding:"16px 20px 20px", position:"sticky", top:0, zIndex:50,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
          borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
          display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        <div>
          <div style={{ fontWeight:900, fontSize:20, color:"white" }}>📋 Asistencia</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>Asistencia escolar de tu hijo/a</div>
        </div>
      </div>
    </div>
  );
}

function WeekGrid({ weekKey, dates, students, txt, sub, navBord, isDark }) {
  const monDate = new Date(weekKey + "T00:00:00");
  const friDate = new Date(monDate); friDate.setDate(monDate.getDate() + 4);
  const showNames = students.length > 1;

  // Summary counts
  const counts = students.map(st => ({
    nombre: st.nombre,
    p: dates.filter(d => st.byDate[d] === "presente").length,
    t: dates.filter(d => st.byDate[d] === "tarde").length,
    a: dates.filter(d => st.byDate[d] === "ausente").length,
  }));

  return (
    <div style={{ marginBottom:24 }}>
      {/* Week header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:900, color:sub,
          letterSpacing:".06em", textTransform:"uppercase" }}>
          {fmtDay(weekKey)} → {fmtDay(friDate.toISOString().split("T")[0])}
        </div>
        {/* Summary pills */}
        {counts.length === 1 && (
          <div style={{ display:"flex", gap:4 }}>
            {counts[0].p > 0 && <span style={{ background:"#10b98118", color:"#10b981",
              borderRadius:99, fontSize:9, fontWeight:800, padding:"2px 7px" }}>✅ {counts[0].p}</span>}
            {counts[0].t > 0 && <span style={{ background:"#f59e0b18", color:"#f59e0b",
              borderRadius:99, fontSize:9, fontWeight:800, padding:"2px 7px" }}>⏰ {counts[0].t}</span>}
            {counts[0].a > 0 && <span style={{ background:"#ef444418", color:"#ef4444",
              borderRadius:99, fontSize:9, fontWeight:800, padding:"2px 7px" }}>❌ {counts[0].a}</span>}
          </div>
        )}
      </div>

      {/* Day column headers */}
      <div style={{ display:"flex", gap:4, marginBottom:4 }}>
        {showNames && <div style={{ width:64, flexShrink:0 }}/>}
        {dates.map(d => (
          <div key={d} style={{ flex:1, textAlign:"center",
            fontSize:9, fontWeight:800, color:sub }}>
            {DAY_ABBR[new Date(d+"T00:00:00").getDay()]}<br/>
            {new Date(d+"T00:00:00").getDate()}
          </div>
        ))}
      </div>

      {/* Student rows */}
      {students.map(st => (
        <div key={st.nombre} style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
          {showNames && (
            <div style={{ width:64, fontSize:11, fontWeight:700, color:txt, flexShrink:0,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {st.nombre.split(" ")[0]}
            </div>
          )}
          {dates.map(d => {
            const cfg = ATT_CFG[st.byDate[d]];
            return (
              <div key={d} style={{
                flex:1, aspectRatio:"1", maxWidth:52, borderRadius:12,
                background: cfg ? cfg.color+"18" : (isDark?"rgba(255,255,255,.05)":"#f5f5f5"),
                border:`1.5px solid ${cfg ? cfg.color+"44" : navBord}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20,
              }}>
                {cfg
                  ? cfg.emoji
                  : <span style={{ color:sub, fontSize:11, fontWeight:700 }}>—</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PAsistencia({ onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, isDark } = useTheme();

  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [weeks,      setWeeks]      = useState(1);
  const [viewMode,   setViewMode]   = useState("semanas"); // "semanas" | "mes"
  const [selectedChild, setSelectedChild] = useState(null);

  const load = useCallback((w) => {
    setLoading(true);
    api.diwyParentAttendance(w)
      .then(d => {
        const rows = Array.isArray(d) ? d : [];
        setData(rows);
        // Auto-select first child
        if (rows.length > 0 && !selectedChild) {
          setSelectedChild(rows[0].student_id);
        }
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [selectedChild]);

  useEffect(() => {
    load(weeks);
  }, []);  // eslint-disable-line

  // All unique children
  const children = [...new Map(data.map(r => [r.student_id, { id: r.student_id, nombre: r.student_nombre }])).values()];

  // Filter to selected child
  const filtered = selectedChild ? data.filter(r => r.student_id === selectedChild) : data;

  // Build week groups
  const weekMap = {};
  filtered.forEach(r => {
    const dt  = new Date(r.fecha + "T00:00:00");
    const dow = dt.getDay();
    const mon = new Date(dt);
    mon.setDate(dt.getDate() - (dow === 0 ? 6 : dow - 1));
    const key = mon.toISOString().split("T")[0];
    if (!weekMap[key]) weekMap[key] = [];
    if (!weekMap[key].includes(r.fecha)) weekMap[key].push(r.fecha);
  });
  const sortedWeeks = Object.keys(weekMap).sort().reverse();

  // Build student objects per week
  const buildStudents = (dates) => {
    const byStudent = {};
    filtered.forEach(r => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = { nombre: r.student_nombre, byDate: {} };
      if (dates.includes(r.fecha)) byStudent[r.student_id].byDate[r.fecha] = r.estado;
    });
    return Object.values(byStudent);
  };

  // Group by month for month view
  const monthMap = {};
  sortedWeeks.forEach(wk => {
    const mon = fmtMonth(wk);
    if (!monthMap[mon]) monthMap[mon] = [];
    monthMap[mon].push(wk);
  });

  const loadMore = () => {
    const next = weeks + 1;
    setWeeks(next);
    load(next);
  };

  const loadMonth = () => {
    const next = 5;
    setWeeks(next);
    setViewMode("mes");
    load(next);
  };

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <AttHeader primary={primary} onBack={onBack} />

      <div style={{ padding:"16px 14px 48px" }}>

        {/* Child selector */}
        {children.length > 1 && (
          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
            {children.map(c => (
              <button key={c.id} onClick={() => setSelectedChild(c.id)} style={{
                background: selectedChild===c.id ? primary : `${primary}15`,
                border:`1px solid ${selectedChild===c.id ? primary : primary+"33"}`,
                borderRadius:99, padding:"6px 16px", fontSize:12, fontWeight:800,
                color: selectedChild===c.id ? "white" : primary,
                cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .2s",
              }}>{c.nombre.split(" ")[0]}</button>
            ))}
          </div>
        )}

        {/* View mode toggle */}
        <div style={{ display:"flex", gap:6, marginBottom:16 }}>
          <button onClick={() => { setViewMode("semanas"); if (weeks > 2) { setWeeks(1); load(1); } }}
            style={{
              background: viewMode==="semanas" ? primary : `${primary}15`,
              border:`1px solid ${viewMode==="semanas" ? primary : primary+"33"}`,
              borderRadius:99, padding:"7px 16px", fontSize:12, fontWeight:800,
              color: viewMode==="semanas" ? "white" : primary,
              cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .2s",
            }}>📅 Por semana</button>
          <button onClick={loadMonth}
            style={{
              background: viewMode==="mes" ? primary : `${primary}15`,
              border:`1px solid ${viewMode==="mes" ? primary : primary+"33"}`,
              borderRadius:99, padding:"7px 16px", fontSize:12, fontWeight:800,
              color: viewMode==="mes" ? "white" : primary,
              cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .2s",
            }}>🗓️ Por mes</button>
        </div>

        {loading && (
          <div style={{ textAlign:"center", color:sub, padding:40 }}>Cargando...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📋</div>
            <div style={{ fontWeight:800, fontSize:15, color:txt, marginBottom:6 }}>
              Sin registros todavía
            </div>
            <div style={{ fontSize:13, color:sub, lineHeight:1.6 }}>
              La asistencia aparecerá aquí cuando el docente la registre.
            </div>
          </div>
        )}

        {/* Weeks */}
        {!loading && viewMode === "semanas" && sortedWeeks.map(wk => (
          <WeekGrid key={wk}
            weekKey={wk}
            dates={weekMap[wk].sort()}
            students={buildStudents(weekMap[wk])}
            txt={txt} sub={sub} navBord={navBord} isDark={isDark}
          />
        ))}

        {/* Grouped by month */}
        {!loading && viewMode === "mes" && Object.entries(monthMap).map(([monthLabel, wks]) => (
          <div key={monthLabel} style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:900, color:txt,
              marginBottom:12, paddingBottom:6, borderBottom:`2px solid ${primary}33` }}>
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </div>
            {wks.map(wk => (
              <WeekGrid key={wk}
                weekKey={wk}
                dates={weekMap[wk].sort()}
                students={buildStudents(weekMap[wk])}
                txt={txt} sub={sub} navBord={navBord} isDark={isDark}
              />
            ))}
          </div>
        ))}

        {/* Load more / Legend */}
        {!loading && filtered.length > 0 && (
          <>
            {viewMode === "semanas" && weeks < 8 && (
              <button onClick={loadMore} style={{
                width:"100%", background:`${primary}15`, border:`1px solid ${primary}33`,
                borderRadius:50, padding:"12px", color:primary, fontWeight:800, fontSize:13,
                cursor:"pointer", fontFamily:"Nunito,sans-serif", marginBottom:16,
              }}>
                📅 Ver semana anterior
              </button>
            )}

            {/* Legend */}
            <div style={{ background:cardBg, borderRadius:14, padding:"12px 16px",
              transition:"background .3s" }}>
              <div style={{ fontSize:10, fontWeight:800, color:sub,
                letterSpacing:".06em", marginBottom:8 }}>REFERENCIAS</div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {Object.values(ATT_CFG).map(c => (
                  <div key={c.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontSize:16 }}>{c.emoji}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:sub }}>{c.label}</span>
                  </div>
                ))}
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:sub }}>—</span>
                  <span style={{ fontSize:11, fontWeight:700, color:sub }}>Sin dato</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
