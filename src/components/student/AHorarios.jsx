// AHorarios.jsx — Weekly school schedule
//
// Grid model:
//   • Periods (time rows) stored in prefs → HORARIO structure
//   • HORARIO cell click  → edit period time only
//   • Day cell click      → edit subject + color only
//   • List view           → full form (subject + time + color)
//   • Lock mode           → read-only
//   • Sáb/Dom toggle in toolbar
//   • Grid rotation toggle (transpose: days↔periods)

import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

// ─── Constants ───────────────────────────────────────────────────────────────
const DAYS_SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DAYS_FULL  = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const TURNOS = [
  { key:"manana", label:"Mañana", emoji:"🌅" },
  { key:"tarde",  label:"Tarde",  emoji:"☀️"  },
  { key:"noche",  label:"Noche",  emoji:"🌙"  },
  { key:"extra",  label:"Extra",  emoji:"⭐"  },
];

const PRESET_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#06b6d4","#64748b",
];

const EMPTY_FORM = { subject:"", time_from:"", time_to:"", color:PRESET_COLORS[0] };

function todayDow() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; }
const fmtTime = t => t ? t.substring(0, 5) : null;
const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Grid view ────────────────────────────────────────────────────────────────
function GridView({
  periods, entries, activeTurno, locked, rotated, visibleDays,
  primary, txt, sub, navBord, isDark,
  onCellClick, onPeriodClick,
}) {
  const cellEntry = (dow, periodId) => {
    const p = periods.find(x => x.id === periodId);
    if (!p) return null;
    return entries.find(e =>
      e.turno === activeTurno && e.day_of_week === dow && e.time_from === p.time_from
    ) || null;
  };

  const headBg  = isDark ? "rgba(255,255,255,.05)" : "#f9f7f1";
  const borderC = navBord;

  // ── Normal layout: rows = periods, cols = days ──────────────────────────────
  if (!rotated) {
    const HORARIO_W = 82;
    const DAY_MIN   = 42;

    const cellStyle = {
      minHeight:56, flex:1, minWidth:DAY_MIN,
      borderLeft:`1px solid ${borderC}`,
      padding:"5px 6px", cursor: locked ? "default" : "pointer",
      display:"flex", flexDirection:"column", justifyContent:"center",
    };

    return (
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth: HORARIO_W + visibleDays.length * DAY_MIN }}>

          {/* Header */}
          <div style={{ display:"flex", borderBottom:`2px solid ${borderC}` }}>
            <div style={{ width:HORARIO_W, flexShrink:0, padding:"8px 10px",
              fontSize:9, fontWeight:900, color:sub, letterSpacing:".08em",
              background:headBg, display:"flex", alignItems:"center" }}>
              HORARIO
            </div>
            {visibleDays.map(dow => (
              <div key={dow} style={{
                flex:1, minWidth:DAY_MIN, padding:"7px 3px",
                fontSize:9, fontWeight:900, color:sub, letterSpacing:".04em",
                textAlign:"center", background:headBg, borderLeft:`1px solid ${borderC}`,
              }}>
                {DAYS_SHORT[dow].toUpperCase()}
              </div>
            ))}
          </div>

          {/* Period rows */}
          {periods.map(period => (
            <div key={period.id} style={{ display:"flex", borderBottom:`1px solid ${borderC}` }}>
              {/* HORARIO cell → edit time */}
              <div onClick={() => !locked && onPeriodClick(period)} style={{
                width:HORARIO_W, flexShrink:0, padding:"6px 10px",
                background: isDark ? "rgba(255,255,255,.025)" : "#fdfcf8",
                display:"flex", flexDirection:"column", justifyContent:"center",
                cursor: locked ? "default" : "pointer",
              }}>
                <div style={{ fontSize:12, fontWeight:800, color: locked ? sub : primary, lineHeight:1.4 }}>
                  {fmtTime(period.time_from) || "—"}
                </div>
                {period.time_to && (
                  <div style={{ fontSize:10, color:sub, opacity:.6, fontWeight:700 }}>
                    {fmtTime(period.time_to)}
                  </div>
                )}
              </div>

              {/* Day cells → edit subject */}
              {visibleDays.map(dow => {
                const entry = cellEntry(dow, period.id);
                return (
                  <div key={dow} onClick={() => !locked && onCellClick(dow, entry, period)}
                    style={{
                      ...cellStyle,
                      background: entry ? (isDark ? `${entry.color}1c` : `${entry.color}12`) : "transparent",
                      borderTop: entry ? `2px solid ${entry.color}` : "none",
                    }}>
                    {entry ? (
                      <div style={{ fontSize:10, fontWeight:800, color:entry.color,
                        lineHeight:1.3, overflow:"hidden", display:"-webkit-box",
                        WebkitLineClamp:2, WebkitBoxOrient:"vertical", wordBreak:"break-word" }}>
                        {entry.subject}
                      </div>
                    ) : !locked ? (
                      <div style={{ textAlign:"center", fontSize:14, color:borderC, opacity:.3 }}>+</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Rotated layout: rows = days, cols = periods ─────────────────────────────
  const DAY_W      = 46;
  const PERIOD_MIN = 76;

  const cellStyle = {
    minHeight:54, flex:1, minWidth:PERIOD_MIN,
    borderLeft:`1px solid ${borderC}`,
    padding:"5px 7px", cursor: locked ? "default" : "pointer",
    display:"flex", flexDirection:"column", justifyContent:"center",
  };

  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ minWidth: DAY_W + periods.length * PERIOD_MIN }}>

        {/* Header: period time labels (clickable) */}
        <div style={{ display:"flex", borderBottom:`2px solid ${borderC}` }}>
          <div style={{ width:DAY_W, flexShrink:0, background:headBg,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:8, fontWeight:900, color:sub, letterSpacing:".06em",
            padding:"6px 4px" }}>
            DÍA
          </div>
          {periods.map(period => (
            <div key={period.id} onClick={() => !locked && onPeriodClick(period)}
              style={{
                flex:1, minWidth:PERIOD_MIN, padding:"6px 6px",
                background:headBg, borderLeft:`1px solid ${borderC}`,
                cursor: locked ? "default" : "pointer",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              }}>
              <div style={{ fontSize:10, fontWeight:800, color: locked ? sub : primary, lineHeight:1.4 }}>
                {fmtTime(period.time_from) || "—"}
              </div>
              {period.time_to && (
                <div style={{ fontSize:8, color:sub, opacity:.6, fontWeight:700 }}>
                  {fmtTime(period.time_to)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {visibleDays.map(dow => (
          <div key={dow} style={{ display:"flex", borderBottom:`1px solid ${borderC}` }}>
            {/* Day label */}
            <div style={{
              width:DAY_W, flexShrink:0, padding:"5px 4px",
              background: isDark ? "rgba(255,255,255,.025)" : "#fdfcf8",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:9, fontWeight:900, color:sub, letterSpacing:".04em",
            }}>
              {DAYS_SHORT[dow].toUpperCase()}
            </div>

            {/* Period cells */}
            {periods.map(period => {
              const entry = cellEntry(dow, period.id);
              return (
                <div key={period.id} onClick={() => !locked && onCellClick(dow, entry, period)}
                  style={{
                    ...cellStyle,
                    background: entry ? (isDark ? `${entry.color}1c` : `${entry.color}12`) : "transparent",
                    borderLeft: entry ? `3px solid ${entry.color}` : `1px solid ${borderC}`,
                  }}>
                  {entry ? (
                    <div style={{ fontSize:10, fontWeight:800, color:entry.color,
                      lineHeight:1.3, overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:2, WebkitBoxOrient:"vertical", wordBreak:"break-word" }}>
                      {entry.subject}
                    </div>
                  ) : !locked ? (
                    <div style={{ textAlign:"center", fontSize:14, color:borderC, opacity:.3 }}>+</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AHorarios({ me, showToast, onBack }) {
  const {
    primary, isDark:dark, txt, sub,
    cardBg, pageBg, navBord, inputBg,
  } = useTheme();

  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTurno, setActiveTurno] = useState("manana");
  const [selectedDay, setSelectedDay] = useState(() => todayDow());
  const [saving,      setSaving]      = useState(false);

  // ── UI prefs ────────────────────────────────────────────────────────────────
  const [viewMode,     setViewMode]     = useState("list");
  const [turnoOrder,   setTurnoOrder]   = useState(TURNOS.map(t => t.key));
  const [periods,      setPeriods]      = useState([]);
  const [locked,       setLocked]       = useState(false);
  const [showSat,      setShowSat]      = useState(false);
  const [showDom,      setShowDom]      = useState(false);
  const [gridRotated,   setGridRotated]   = useState(false);
  const [gridCssAngle,  setGridCssAngle]  = useState(0); // 0 | 90 | 180 | 270

  // ── Drawer ──────────────────────────────────────────────────────────────────
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [drawerMode,  setDrawerMode]  = useState("full");
  const [editEntry,   setEditEntry]   = useState(null);
  const [editPeriod,  setEditPeriod]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);

  const lpTimer = useRef(null);

  // Derived visible days for grid
  const visibleDays = [0,1,2,3,4, ...(showSat?[5]:[]), ...(showDom?[6]:[])];

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.getSchedule().catch(() => []),
      api.getSchedulePrefs().catch(() => ({})),
    ]).then(([scheduleData, prefs]) => {
      const arr = Array.isArray(scheduleData) ? scheduleData : [];
      setEntries(arr);
      if (arr.length > 0) {
        const counts = arr.reduce((acc, e) => {
          acc[e.turno] = (acc[e.turno] || 0) + 1; return acc;
        }, {});
        setActiveTurno(Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0]);
      }
      if (prefs.sch_view)        setViewMode(prefs.sch_view);
      if (typeof prefs.sch_locked === "boolean")       setLocked(prefs.sch_locked);
      if (typeof prefs.sch_show_sat === "boolean")     setShowSat(prefs.sch_show_sat);
      if (typeof prefs.sch_show_dom === "boolean")     setShowDom(prefs.sch_show_dom);
      if (typeof prefs.sch_grid_rotated === "boolean")  setGridRotated(prefs.sch_grid_rotated);
      if (typeof prefs.sch_grid_css_angle === "number") setGridCssAngle(prefs.sch_grid_css_angle);
      if (Array.isArray(prefs.sch_turno_order) &&
          prefs.sch_turno_order.length === TURNOS.length) {
        setTurnoOrder(prefs.sch_turno_order);
      }
      if (Array.isArray(prefs.sch_periods) && prefs.sch_periods.length > 0) {
        setPeriods([...prefs.sch_periods].sort((a,b) =>
          (a.time_from||"") < (b.time_from||"") ? -1 : 1));
      } else if (arr.length > 0) {
        const seen = new Set();
        const derived = [];
        arr.filter(e => e.time_from)
          .sort((a,b) => (a.time_from||"") < (b.time_from||"") ? -1 : 1)
          .forEach(e => {
            if (!seen.has(e.time_from)) {
              seen.add(e.time_from);
              derived.push({ id:genId(), time_from:e.time_from, time_to:e.time_to||null });
            }
          });
        if (derived.length > 0) {
          setPeriods(derived);
          api.patchSchedulePrefs({ sch_periods: derived }).catch(() => {});
        }
      }
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  // ── Derived ──────────────────────────────────────────────────────────────────
  const orderedTurnos = turnoOrder.map(k => TURNOS.find(t => t.key === k)).filter(Boolean);
  const turnoLabel    = TURNOS.find(t => t.key === activeTurno)?.label || "";
  const dayEntries    = entries
    .filter(e => e.turno === activeTurno && e.day_of_week === selectedDay)
    .sort((a,b) => (a.time_from||"99:99") < (b.time_from||"99:99") ? -1 : 1);

  // ── Pref helpers ─────────────────────────────────────────────────────────────
  const setPref = patch => api.patchSchedulePrefs(patch).catch(() => {});

  const toggleView = () => {
    const next = viewMode === "list" ? "grid" : "list";
    setViewMode(next); setPref({ sch_view: next });
  };
  const toggleLock = () => {
    const next = !locked; setLocked(next); setPref({ sch_locked: next });
    if (next) setDrawerOpen(false);
  };
  const toggleSat = () => {
    const next = !showSat; setShowSat(next); setPref({ sch_show_sat: next });
    if (!next) { setShowDom(false); setPref({ sch_show_dom: false }); }
  };
  const toggleDom = () => {
    const next = !showDom; setShowDom(next); setPref({ sch_show_dom: next });
  };
  const toggleRotation = () => {
    const next = !gridRotated; setGridRotated(next); setPref({ sch_grid_rotated: next });
  };
  const rotateCss = () => {
    const next = (gridCssAngle + 90) % 360;
    setGridCssAngle(next); setPref({ sch_grid_css_angle: next });
  };

  // ── Turno long-press ─────────────────────────────────────────────────────────
  const onTurnoDown = key => {
    lpTimer.current = setTimeout(() => {
      setTurnoOrder(prev => {
        if (prev[0] === key) return prev;
        const next = [key, ...prev.filter(k => k !== key)];
        setPref({ sch_turno_order: next });
        showToast?.("📌 Turno fijado al inicio", "success");
        return next;
      });
    }, 550);
  };
  const onTurnoUp = () => clearTimeout(lpTimer.current);

  // ── Drawer openers ───────────────────────────────────────────────────────────
  const openFull = (dow = selectedDay) => {
    setSelectedDay(dow); setEditEntry(null); setEditPeriod(null);
    setForm(EMPTY_FORM); setDrawerMode("full"); setDrawerOpen(true);
  };
  const openFullEdit = entry => {
    setEditEntry(entry); setEditPeriod(null);
    setForm({ subject:entry.subject, time_from:entry.time_from||"",
              time_to:entry.time_to||"", color:entry.color||PRESET_COLORS[0] });
    setDrawerMode("full"); setDrawerOpen(true);
  };
  const openCell = (dow, entry, period) => {
    setSelectedDay(dow); setEditPeriod(period);
    if (entry) {
      setEditEntry(entry);
      setForm({ ...EMPTY_FORM, subject:entry.subject, color:entry.color||PRESET_COLORS[0] });
    } else {
      setEditEntry(null); setForm(EMPTY_FORM);
    }
    setDrawerMode("cell"); setDrawerOpen(true);
  };
  const openPeriodNew = () => {
    setEditEntry(null); setEditPeriod(null); setForm(EMPTY_FORM);
    setDrawerMode("period-new"); setDrawerOpen(true);
  };
  const openPeriodEdit = period => {
    setEditEntry(null); setEditPeriod(period);
    setForm({ ...EMPTY_FORM, time_from:period.time_from, time_to:period.time_to||"" });
    setDrawerMode("period-edit"); setDrawerOpen(true);
  };
  const closeDrawer = () => { if (!saving) setDrawerOpen(false); };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      if (drawerMode === "period-new") {
        if (!form.time_from) { showToast?.("Ingresá la hora de inicio", "error"); return; }
        const np   = { id:genId(), time_from:form.time_from, time_to:form.time_to||null };
        const next = [...periods, np].sort((a,b) => a.time_from < b.time_from ? -1 : 1);
        setPeriods(next);
        await api.patchSchedulePrefs({ sch_periods: next });
        setDrawerOpen(false);

      } else if (drawerMode === "period-edit") {
        if (!form.time_from) { showToast?.("Ingresá la hora de inicio", "error"); return; }
        const oldTf = editPeriod.time_from;
        const updP  = { ...editPeriod, time_from:form.time_from, time_to:form.time_to||null };
        const next  = periods.map(p => p.id === editPeriod.id ? updP : p)
          .sort((a,b) => a.time_from < b.time_from ? -1 : 1);
        setPeriods(next);
        const affected = entries.filter(e => e.turno === activeTurno && e.time_from === oldTf);
        await Promise.all(affected.map(e =>
          api.patchSchedule(e.id, { subject:e.subject, color:e.color,
            time_from:form.time_from, time_to:form.time_to||null })
          .then(d => setEntries(prev => prev.map(x => x.id === e.id ? d : x)))
        ));
        await api.patchSchedulePrefs({ sch_periods: next });
        setDrawerOpen(false);

      } else if (drawerMode === "cell") {
        if (!form.subject.trim()) { showToast?.("Ingresá el nombre de la materia", "error"); return; }
        if (editEntry) {
          const d = await api.patchSchedule(editEntry.id, {
            subject:form.subject.trim(), color:form.color,
            time_from:editEntry.time_from, time_to:editEntry.time_to,
          });
          setEntries(prev => prev.map(e => e.id === editEntry.id ? d : e));
        } else {
          const d = await api.postSchedule({
            turno:activeTurno, day_of_week:selectedDay,
            subject:form.subject.trim(), color:form.color,
            time_from:editPeriod?.time_from||null, time_to:editPeriod?.time_to||null,
          });
          setEntries(prev => [...prev, d]);
        }
        setDrawerOpen(false);

      } else { // full
        if (!form.subject.trim()) { showToast?.("Ingresá el nombre de la materia", "error"); return; }
        if (editEntry) {
          const d = await api.patchSchedule(editEntry.id, {
            subject:form.subject.trim(), time_from:form.time_from||null,
            time_to:form.time_to||null, color:form.color,
          });
          setEntries(prev => prev.map(e => e.id === editEntry.id ? d : e));
        } else {
          const d = await api.postSchedule({
            turno:activeTurno, day_of_week:selectedDay,
            subject:form.subject.trim(), time_from:form.time_from||null,
            time_to:form.time_to||null, color:form.color,
          });
          setEntries(prev => [...prev, d]);
        }
        setDrawerOpen(false);
      }
    } catch(e) {
      showToast?.(e.message || "Error al guardar", "error");
    } finally { setSaving(false); }
  };

  const handleDeleteEntry = async () => {
    if (!editEntry) return;
    setSaving(true);
    try {
      await api.deleteSchedule(editEntry.id);
      setEntries(prev => prev.filter(e => e.id !== editEntry.id));
      setDrawerOpen(false);
    } catch(e) { showToast?.(e.message||"Error", "error"); }
    finally { setSaving(false); }
  };

  const handleDeletePeriod = async () => {
    if (!editPeriod) return;
    setSaving(true);
    try {
      await api.deleteSchedulePeriod(activeTurno, editPeriod.time_from);
      setEntries(prev => prev.filter(e =>
        !(e.turno === activeTurno && e.time_from === editPeriod.time_from)));
      const next = periods.filter(p => p.id !== editPeriod.id);
      setPeriods(next);
      await api.patchSchedulePrefs({ sch_periods: next });
      setDrawerOpen(false);
    } catch(e) { showToast?.(e.message||"Error", "error"); }
    finally { setSaving(false); }
  };

  const saveDisabled = () => {
    if (saving) return true;
    if (drawerMode === "period-new" || drawerMode === "period-edit") return !form.time_from;
    return !form.subject.trim();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:pageBg, transition:"background 0.3s", fontFamily:"Nunito,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background:primary, color:"white",
        padding:"52px 20px 18px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden",
      }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.07)", top:-60, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
          <button onClick={onBack} style={{
            background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
            width:34, height:34, cursor:"pointer", color:"white", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:19 }}>📅 Horarios</div>
            <div style={{ fontSize:11, opacity:.82 }}>Tu calendario semanal</div>
          </div>
          {/* Lock button — only this changes when locked */}
          <button onClick={toggleLock} style={{
            background: locked ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.18)",
            border:"none", borderRadius:10,
            padding:"6px 11px", cursor:"pointer", color:"white",
            fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:800,
            display:"flex", alignItems:"center", gap:5, flexShrink:0,
            transition:"background .2s",
          }}>
            <span>{locked ? "🔓" : "🔒"}</span>
            <span style={{ fontSize:10 }}>{locked ? "Desbloquear" : "Bloquear"}</span>
          </button>
          {/* View toggle */}
          <button onClick={toggleView} style={{
            background:"rgba(255,255,255,.22)", border:"none", borderRadius:10,
            padding:"6px 11px", cursor:"pointer", color:"white",
            fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:800,
            display:"flex", alignItems:"center", gap:5, flexShrink:0,
          }}>
            <span style={{ fontSize:15, lineHeight:1 }}>{viewMode === "list" ? "⊞" : "☰"}</span>
            <span style={{ fontSize:10 }}>{viewMode === "list" ? "Cuadro" : "Lista"}</span>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding:"16px 14px", paddingBottom: viewMode === "grid" && !locked ? 80 : 16 }}>

        {/* ── Turno selector ── */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:900, color:sub,
            letterSpacing:".08em", textTransform:"uppercase",
            marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
            Turno escolar
            {!locked && (
              <span style={{ fontSize:9, color:sub, opacity:.5, fontWeight:700,
                letterSpacing:0, textTransform:"none" }}>
                · mantené presionado para fijar
              </span>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
            {orderedTurnos.map((t, idx) => {
              const active = activeTurno === t.key;
              return (
                <button key={t.key}
                  onClick={() => setActiveTurno(t.key)}
                  onMouseDown={() => !locked && onTurnoDown(t.key)}
                  onMouseUp={onTurnoUp} onMouseLeave={onTurnoUp}
                  onTouchStart={() => !locked && onTurnoDown(t.key)}
                  onTouchEnd={onTurnoUp} onTouchCancel={onTurnoUp}
                  style={{
                    background: active ? primary : (dark ? "rgba(255,255,255,.06)" : cardBg),
                    border:`1.5px solid ${active ? "transparent" : navBord}`,
                    borderRadius:14, padding:"10px 4px",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif",
                    transition:"all .2s", position:"relative",
                    boxShadow: active ? `0 4px 12px ${primary}44` : "none",
                    userSelect:"none", WebkitUserSelect:"none",
                  }}>
                  {idx === 0 && !active && !locked && (
                    <div style={{ position:"absolute", top:3, right:5, fontSize:8, opacity:.4 }}>📌</div>
                  )}
                  <span style={{ fontSize:20 }}>{t.emoji}</span>
                  <span style={{ fontSize:11, fontWeight:800,
                    color: active ? "white" : txt, transition:"color .2s" }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>

        ) : viewMode === "grid" ? (
          /* ── Grid view ── */
          <div style={{ paddingBottom:8, containerType:"inline-size" }}>

            {/* overflow container — when transverse: min-height=100cqi so rotated content isn't clipped */}
            <div style={{
              overflow:"hidden",
              minHeight: (gridCssAngle === 90 || gridCssAngle === 270) ? "100cqi" : "auto",
              display: (gridCssAngle === 90 || gridCssAngle === 270) ? "flex" : "block",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {periods.length === 0 ? (
                <div style={{ textAlign:"center", padding:"36px 16px" }}>
                  <div style={{ fontSize:48, marginBottom:10 }}>🗓️</div>
                  <div style={{ fontWeight:800, color:txt, fontSize:15, marginBottom:6 }}>Sin períodos</div>
                  <div style={{ fontSize:13, color:sub, marginBottom:20, lineHeight:1.55 }}>
                    Agregá un período para construir la grilla.
                  </div>
                  {!locked && (
                    <button onClick={openPeriodNew} style={{
                      background:primary, border:"none", borderRadius:50,
                      padding:"11px 28px", color:"white", fontWeight:900, fontSize:13,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif",
                    }}>+ Agregar período</button>
                  )}
                </div>
              ) : (
                <div style={{
                  width:           "100%",
                  flexShrink:      0,
                  transform:       gridCssAngle > 0 ? `rotate(${gridCssAngle}deg)` : undefined,
                  transformOrigin: "center center",
                  transition:      "transform .35s ease",
                }}>
                  <GridView
                    periods={periods} entries={entries}
                    activeTurno={activeTurno} locked={locked}
                    rotated={gridRotated} visibleDays={visibleDays}
                    primary={primary} txt={txt} sub={sub}
                    navBord={navBord} isDark={dark}
                    onCellClick={openCell}
                    onPeriodClick={openPeriodEdit}
                  />
                </div>
              )}
            </div>

            {/* Grid toolbar — fixed bottom */}
            {!locked && (
              <div style={{
                display:"flex", gap:8, flexWrap:"wrap",
                padding:"10px 14px 12px",
                borderTop:`1px solid ${navBord}`,
                position:"fixed", bottom:0, left:0, right:0,
                background:pageBg, zIndex:80,
              }}>

                {/* Agregar período */}
                <ToolBtn onClick={openPeriodNew} dark={dark} navBord={navBord} sub={sub}>
                  <span style={{ fontSize:15, lineHeight:1 }}>+</span> Período
                </ToolBtn>

                {/* Eliminar período */}
                {periods.length > 0 && (
                  <ToolBtn onClick={() => openPeriodEdit(periods[periods.length - 1])}
                    dark={dark} navBord={navBord} sub={sub}>
                    <span style={{ fontSize:14, lineHeight:1 }}>×</span> Período
                  </ToolBtn>
                )}

                {/* Sábado toggle */}
                <ToolBtn onClick={toggleSat} dark={dark} navBord={navBord} sub={sub}
                  active={showSat} primary={primary}>
                  {showSat ? "× Sáb" : "+ Sáb"}
                </ToolBtn>

                {/* Domingo toggle — only if Sat is shown */}
                {showSat && (
                  <ToolBtn onClick={toggleDom} dark={dark} navBord={navBord} sub={sub}
                    active={showDom} primary={primary}>
                    {showDom ? "× Dom" : "+ Dom"}
                  </ToolBtn>
                )}

                {/* Transpose (rows↔cols) */}
                <ToolBtn onClick={toggleRotation} dark={dark} navBord={navBord} sub={sub}
                  active={gridRotated} primary={primary}>
                  <span style={{ fontSize:15 }}>↻</span> Rotar
                </ToolBtn>

                {/* CSS 90° rotation */}
                <ToolBtn onClick={rotateCss} dark={dark} navBord={navBord} sub={sub}
                  active={gridCssAngle > 0} primary={primary}>
                  <span style={{ fontSize:15 }}>⤢</span> Rotar cuadro
                  {gridCssAngle > 0 && (
                    <span style={{ fontSize:9, opacity:.7 }}>{gridCssAngle}°</span>
                  )}
                </ToolBtn>

              </div>
            )}
          </div>

        ) : (
          /* ── List view — scrollable ── */
          <div style={{ paddingBottom:16 }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:900, color:sub,
                letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>Día</div>
              <div style={{ display:"flex", gap:6, overflowX:"auto",
                paddingBottom:4, scrollbarWidth:"none" }}>
                {DAYS_SHORT.map((d, i) => {
                  const active = selectedDay === i;
                  const hasDot = !active && entries.some(
                    e => e.turno === activeTurno && e.day_of_week === i);
                  return (
                    <button key={d} onClick={() => setSelectedDay(i)} style={{
                      flexShrink:0, position:"relative",
                      background: active ? primary : (dark ? "rgba(255,255,255,.06)" : cardBg),
                      border:`1.5px solid ${active ? primary : navBord}`,
                      borderRadius:99, padding:"7px 15px",
                      fontSize:12, fontWeight:800,
                      color: active ? "white" : txt,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .2s",
                    }}>
                      {d}
                      {hasDot && (
                        <span style={{ position:"absolute", top:3, right:4,
                          width:5, height:5, borderRadius:"50%",
                          background:primary, display:"block" }}/>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:12 }}>
              <div>
                <span style={{ fontWeight:900, fontSize:15, color:txt }}>
                  {DAYS_FULL[selectedDay]}
                </span>
                <span style={{ fontSize:12, color:sub, marginLeft:6 }}>
                  · turno {turnoLabel.toLowerCase()}
                </span>
              </div>
              {!locked && (
                <button onClick={() => openFull(selectedDay)} style={{
                  background:primary, border:"none", borderRadius:99,
                  padding:"7px 16px", color:"white", fontWeight:900, fontSize:12,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  display:"flex", alignItems:"center", gap:5,
                  boxShadow:`0 4px 12px ${primary}44`,
                }}>
                  <span style={{ fontSize:15, lineHeight:1 }}>+</span> Agregar
                </button>
              )}
            </div>

            {dayEntries.length === 0 ? (
              <div style={{ textAlign:"center", padding:"36px 20px" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>📚</div>
                <div style={{ fontWeight:800, color:txt, marginBottom:6, fontSize:15 }}>Sin clases cargadas</div>
                <div style={{ fontSize:13, color:sub, marginBottom:20, lineHeight:1.55 }}>
                  No hay materias para {DAYS_FULL[selectedDay].toLowerCase()} en el turno {turnoLabel.toLowerCase()}.
                </div>
                {!locked && (
                  <button onClick={() => openFull(selectedDay)} style={{
                    background:primary, border:"none", borderRadius:50,
                    padding:"12px 28px", color:"white", fontWeight:900, fontSize:13,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  }}>+ Agregar clase</button>
                )}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {dayEntries.map(entry => (
                  <div key={entry.id}
                    onClick={() => !locked && openFullEdit(entry)}
                    style={{
                      background:cardBg,
                      borderLeft:`4px solid ${entry.color || primary}`,
                      borderRadius:16, padding:"13px 16px",
                      cursor: locked ? "default" : "pointer",
                      display:"flex", alignItems:"center", gap:12,
                      boxShadow: dark ? "0 2px 8px rgba(0,0,0,.3)" : "0 1px 6px rgba(0,0,0,.07)",
                      transition:"background .3s",
                    }}>
                    <div style={{
                      width:38, height:38, borderRadius:11, flexShrink:0,
                      background:`${entry.color || primary}20`,
                      border:`1.5px solid ${entry.color || primary}55`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontWeight:900, fontSize:15, color:entry.color || primary,
                    }}>
                      {entry.subject.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:14, color:txt,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {entry.subject}
                      </div>
                      {(entry.time_from || entry.time_to) && (
                        <div style={{ fontSize:12, color:sub, marginTop:2 }}>
                          🕐{" "}{fmtTime(entry.time_from)}
                          {entry.time_from && entry.time_to ? " — " : ""}
                          {fmtTime(entry.time_to)}
                        </div>
                      )}
                    </div>
                    {!locked && <span style={{ color:sub, fontSize:14 }}>✏️</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {drawerOpen && (
        <>
          <div onClick={closeDrawer} style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:190,
          }}/>
          <div style={{
            position:"fixed", bottom:0, left:0, right:0,
            maxWidth:480, margin:"0 auto",
            background: dark ? "#1e1b2e" : "white",
            borderRadius:"24px 24px 0 0",
            boxShadow:"0 -8px 40px rgba(0,0,0,.2)",
            padding:"0 20px 44px", zIndex:200,
          }}>
            <div style={{ width:40, height:4, borderRadius:99,
              background:dark?"#444":"#e0e0e0", margin:"12px auto 18px" }}/>

            <div style={{ fontWeight:900, fontSize:15, color:txt, marginBottom:16 }}>
              {drawerMode === "period-new"  ? "⏱️ Nuevo período"   :
               drawerMode === "period-edit" ? "⏱️ Editar período"  :
               editEntry                    ? "✏️ Editar clase"    : "➕ Nueva clase"}
              {(drawerMode === "cell" || drawerMode === "full") && (
                <span style={{ fontSize:11, fontWeight:700, color:sub, marginLeft:8 }}>
                  {DAYS_FULL[selectedDay]} · {turnoLabel}
                </span>
              )}
            </div>

            {/* Period mode: time only */}
            {(drawerMode === "period-new" || drawerMode === "period-edit") && (
              <>
                <div style={{ fontSize:10, fontWeight:900, color:sub,
                  letterSpacing:".07em", marginBottom:6 }}>HORARIO</div>
                <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                  {[["time_from","Inicio *"],["time_to","Fin (opcional)"]].map(([key, label]) => (
                    <div key={key} style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:sub, marginBottom:4, fontWeight:700 }}>{label}</div>
                      <input type="time"
                        autoFocus={key === "time_from"}
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))}
                        style={{
                          width:"100%", boxSizing:"border-box",
                          border:`1.5px solid ${key === "time_from" && form.time_from ? primary : navBord}`,
                          borderRadius:12, padding:"10px 12px", fontSize:13,
                          fontFamily:"Nunito,sans-serif", outline:"none",
                          color:txt, background:inputBg,
                          transition:"background .3s, color .3s, border-color .2s",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Cell / full mode: subject + color (+ time if full) */}
            {(drawerMode === "cell" || drawerMode === "full") && (
              <>
                <div style={{ fontSize:10, fontWeight:900, color:sub,
                  letterSpacing:".07em", marginBottom:6 }}>MATERIA / ACTIVIDAD</div>
                <input
                  autoFocus
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject:e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  placeholder="Ej: Matemáticas, Inglés, Ed. Física..."
                  style={{
                    width:"100%", boxSizing:"border-box",
                    border:`1.5px solid ${form.subject.trim() ? primary : navBord}`,
                    borderRadius:12, padding:"11px 14px", fontSize:14,
                    fontFamily:"Nunito,sans-serif", outline:"none",
                    color:txt, background:inputBg, marginBottom:14,
                    transition:"border-color .2s, background .3s, color .3s",
                  }}
                />
                {drawerMode === "full" && (
                  <>
                    <div style={{ fontSize:10, fontWeight:900, color:sub,
                      letterSpacing:".07em", marginBottom:6 }}>HORARIO (OPCIONAL)</div>
                    <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                      {[["time_from","Desde"],["time_to","Hasta"]].map(([key, label]) => (
                        <div key={key} style={{ flex:1 }}>
                          <div style={{ fontSize:11, color:sub, marginBottom:4, fontWeight:700 }}>{label}</div>
                          <input type="time" value={form[key]}
                            onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))}
                            style={{
                              width:"100%", boxSizing:"border-box",
                              border:`1.5px solid ${navBord}`,
                              borderRadius:12, padding:"10px 12px", fontSize:13,
                              fontFamily:"Nunito,sans-serif", outline:"none",
                              color:txt, background:inputBg,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ fontSize:10, fontWeight:900, color:sub,
                  letterSpacing:".07em", marginBottom:8 }}>COLOR</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color:c }))} style={{
                      width:30, height:30, borderRadius:"50%", background:c,
                      border:`3px solid ${form.color === c ? txt : "transparent"}`,
                      cursor:"pointer", flexShrink:0, outline:"none",
                      transition:"border-color .15s",
                    }}/>
                  ))}
                </div>
              </>
            )}

            <button onClick={handleSave} disabled={saveDisabled()} style={{
              width:"100%", padding:"13px", borderRadius:50, border:"none",
              background: saveDisabled() ? navBord : primary,
              color:"white", fontWeight:900, fontSize:15,
              cursor: saveDisabled() ? "not-allowed" : "pointer",
              fontFamily:"Nunito,sans-serif", marginBottom:10, transition:"all .2s",
            }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>

            {drawerMode === "period-edit" && editPeriod && (
              <button onClick={handleDeletePeriod} disabled={saving} style={{
                width:"100%", padding:"12px", borderRadius:50,
                border:`1.5px solid #ef444466`, background:"transparent",
                color:"#ef4444", fontWeight:800, fontSize:14,
                cursor:saving?"not-allowed":"pointer", fontFamily:"Nunito,sans-serif",
              }}>Eliminar este período</button>
            )}
            {(drawerMode === "cell" || drawerMode === "full") && editEntry && (
              <button onClick={handleDeleteEntry} disabled={saving} style={{
                width:"100%", padding:"12px", borderRadius:50,
                border:`1.5px solid #ef444466`, background:"transparent",
                color:"#ef4444", fontWeight:800, fontSize:14,
                cursor:saving?"not-allowed":"pointer", fontFamily:"Nunito,sans-serif",
              }}>Eliminar clase</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Small toolbar button ──────────────────────────────────────────────────────
function ToolBtn({ onClick, dark, navBord, sub, primary, active, children }) {
  return (
    <button onClick={onClick} style={{
      background: active
        ? (dark ? `${primary}30` : `${primary}15`)
        : (dark ? "rgba(255,255,255,.06)" : "#f4f4f0"),
      border: active ? `1.5px solid ${primary}66` : `1.5px dashed ${navBord}`,
      borderRadius:10, padding:"8px 14px",
      color: active ? primary : sub,
      fontSize:12, fontWeight:800,
      cursor:"pointer", fontFamily:"Nunito,sans-serif",
      display:"flex", alignItems:"center", gap:5,
      transition:"all .15s",
    }}>
      {children}
    </button>
  );
}
