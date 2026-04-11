// AHorarios.jsx — Weekly school schedule
//
// Model:
//   • User picks ONE turno (Mañana/Tarde/Noche/Extra)
//   • Within the active turno, each day holds N subjects/periods
//   • Two view modes: list (day-by-day) and grid (full weekly calendar)
//   • All schedule data synced to backend; view prefs + turno order in localStorage

import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

// ─── constants ───────────────────────────────────────────────────────────────
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

function todayDow() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

const fmtTime = t => t ? t.substring(0, 5) : null;

// ─── Grid / Calendar view ─────────────────────────────────────────────────────
function GridView({ entries, activeTurno, primary, txt, sub, cardBg, navBord, isDark, onCellClick }) {
  const byDay = DAYS_SHORT.map((_, dow) =>
    entries
      .filter(e => e.turno === activeTurno && e.day_of_week === dow)
      .sort((a, b) => (a.time_from || "99:99") < (b.time_from || "99:99") ? -1 : 1)
  );
  const maxPeriods = Math.max(1, ...byDay.map(d => d.length));
  const gridCols = "32px repeat(7, 1fr)";

  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ minWidth:320 }}>

        {/* Day header row */}
        <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:3, marginBottom:4 }}>
          <div/>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{
              textAlign:"center", fontSize:10, fontWeight:900,
              color:sub, padding:"3px 0", letterSpacing:".02em",
            }}>{d}</div>
          ))}
        </div>

        {/* Period rows */}
        {Array.from({ length: maxPeriods }, (_, pi) => (
          <div key={pi} style={{ display:"grid", gridTemplateColumns:gridCols, gap:3, marginBottom:3 }}>
            {/* Row label */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:9, fontWeight:900, color:sub,
            }}>{pi + 1}°</div>

            {/* Day cells */}
            {byDay.map((dEnts, dow) => {
              const entry = dEnts[pi];
              return (
                <div
                  key={dow}
                  onClick={() => onCellClick(dow, entry || null)}
                  style={{
                    minHeight:56, borderRadius:9, cursor:"pointer",
                    background: entry
                      ? (isDark ? `${entry.color}22` : `${entry.color}15`)
                      : (isDark ? "rgba(255,255,255,.04)" : "#f8fafc"),
                    border:`1.5px solid ${entry ? entry.color + "44" : navBord}`,
                    borderLeft:`3px solid ${entry ? entry.color : navBord}`,
                    padding:"5px 5px", display:"flex",
                    flexDirection:"column", justifyContent:"center",
                    transition:"all .15s",
                  }}>
                  {entry ? (
                    <>
                      <div style={{
                        fontSize:10, fontWeight:800, color:entry.color,
                        overflow:"hidden", display:"-webkit-box",
                        WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                        lineHeight:1.3, wordBreak:"break-word",
                      }}>{entry.subject}</div>
                      {entry.time_from && (
                        <div style={{ fontSize:8, color:sub, marginTop:2, fontWeight:700 }}>
                          {fmtTime(entry.time_from)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign:"center", fontSize:14, color:navBord, opacity:.4 }}>+</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Add row */}
        <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:3, marginTop:2 }}>
          <div/>
          {DAYS_SHORT.map((d, dow) => (
            <button
              key={dow}
              onClick={() => onCellClick(dow, null)}
              style={{
                background:"transparent",
                border:`1.5px dashed ${navBord}`,
                borderRadius:9, padding:"5px 0",
                color:sub, fontSize:13, cursor:"pointer",
                fontFamily:"Nunito,sans-serif", width:"100%",
              }}>+</button>
          ))}
        </div>
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
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);

  // ── UI prefs (server-persisted) ─────────────────────────────────────────────
  const [viewMode,   setViewMode]   = useState("list");
  const [turnoOrder, setTurnoOrder] = useState(TURNOS.map(t => t.key));

  // Long-press ref
  const lpTimer = useRef(null);

  // ── Load schedule + prefs ───────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.getSchedule().catch(() => []),
      api.getSchedulePrefs().catch(() => ({})),
    ]).then(([scheduleData, prefs]) => {
      // Schedule entries
      const arr = Array.isArray(scheduleData) ? scheduleData : [];
      setEntries(arr);
      if (arr.length > 0) {
        const counts = arr.reduce((acc, e) => {
          acc[e.turno] = (acc[e.turno] || 0) + 1; return acc;
        }, {});
        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        setActiveTurno(best);
      }
      // View prefs
      if (prefs.sch_view) setViewMode(prefs.sch_view);
      if (Array.isArray(prefs.sch_turno_order) &&
          prefs.sch_turno_order.length === TURNOS.length) {
        setTurnoOrder(prefs.sch_turno_order);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const orderedTurnos = turnoOrder
    .map(key => TURNOS.find(t => t.key === key))
    .filter(Boolean);

  const dayEntries = entries
    .filter(e => e.turno === activeTurno && e.day_of_week === selectedDay)
    .sort((a, b) => (a.time_from || "99:99") < (b.time_from || "99:99") ? -1 : 1);

  const turnoLabel = TURNOS.find(t => t.key === activeTurno)?.label || "";

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openNew = (dow = selectedDay) => {
    setSelectedDay(dow);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = entry => {
    setEditTarget(entry);
    setForm({
      subject:   entry.subject,
      time_from: entry.time_from || "",
      time_to:   entry.time_to   || "",
      color:     entry.color     || PRESET_COLORS[0],
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => { if (!saving) setDrawerOpen(false); };

  const handleSave = async () => {
    if (!form.subject.trim()) {
      showToast?.("Ingresá el nombre de la materia", "error"); return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const d = await api.patchSchedule(editTarget.id, {
          subject:   form.subject.trim(),
          time_from: form.time_from || null,
          time_to:   form.time_to   || null,
          color:     form.color,
        });
        setEntries(prev => prev.map(e => e.id === editTarget.id ? d : e));
      } else {
        const d = await api.postSchedule({
          turno:       activeTurno,
          day_of_week: selectedDay,
          subject:     form.subject.trim(),
          time_from:   form.time_from || null,
          time_to:     form.time_to   || null,
          color:       form.color,
        });
        setEntries(prev => [...prev, d]);
      }
      setDrawerOpen(false);
    } catch(e) {
      showToast?.(e.message || "Error al guardar", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.deleteSchedule(editTarget.id);
      setEntries(prev => prev.filter(e => e.id !== editTarget.id));
      setDrawerOpen(false);
    } catch(e) {
      showToast?.(e.message || "Error al eliminar", "error");
    } finally { setSaving(false); }
  };

  const toggleView = () => {
    const next = viewMode === "list" ? "grid" : "list";
    setViewMode(next);
    api.patchSchedulePrefs({ sch_view: next }).catch(() => {});
  };

  // Long-press: pin turno to first position
  const onTurnoDown = key => {
    lpTimer.current = setTimeout(() => {
      setTurnoOrder(prev => {
        if (prev[0] === key) return prev;
        const next = [key, ...prev.filter(k => k !== key)];
        api.patchSchedulePrefs({ sch_turno_order: next }).catch(() => {});
        showToast?.("📌 Turno fijado al inicio", "success");
        return next;
      });
    }, 550);
  };
  const onTurnoUp = () => clearTimeout(lpTimer.current);

  // Grid cell click
  const onCellClick = (dow, entry) => {
    if (entry) openEdit(entry);
    else openNew(dow);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s",
      fontFamily:"Nunito,sans-serif" }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        background:primary, color:"white",
        padding:"52px 20px 20px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden",
      }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.08)", top:-60, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <button onClick={onBack} style={{
            background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
            width:34, height:34, cursor:"pointer", color:"white", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:20 }}>📅 Horarios</div>
            <div style={{ fontSize:12, opacity:.85 }}>Tu calendario semanal</div>
          </div>
          {/* View mode toggle */}
          <button onClick={toggleView} style={{
            background:"rgba(255,255,255,.22)", border:"none", borderRadius:11,
            padding:"7px 13px", cursor:"pointer", color:"white",
            fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:800,
            display:"flex", alignItems:"center", gap:6, flexShrink:0,
          }}>
            <span style={{ fontSize:16, lineHeight:1 }}>
              {viewMode === "list" ? "⊞" : "☰"}
            </span>
            <span style={{ fontSize:11 }}>
              {viewMode === "list" ? "Cuadro" : "Lista"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ padding:"18px 14px 100px" }}>

        {/* ── Turno selector ────────────────────────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, fontWeight:900, color:sub,
            letterSpacing:".08em", textTransform:"uppercase",
            marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
            Turno escolar
            <span style={{ fontSize:9, color:sub, opacity:.55, fontWeight:700,
              letterSpacing:0, textTransform:"none" }}>
              · mantené presionado para fijar al inicio
            </span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
            {orderedTurnos.map((t, idx) => {
              const active = activeTurno === t.key;
              const pinned = idx === 0;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTurno(t.key)}
                  onMouseDown={() => onTurnoDown(t.key)}
                  onMouseUp={onTurnoUp}
                  onMouseLeave={onTurnoUp}
                  onTouchStart={() => onTurnoDown(t.key)}
                  onTouchEnd={onTurnoUp}
                  onTouchCancel={onTurnoUp}
                  style={{
                    background: active ? primary : (dark ? "rgba(255,255,255,.06)" : cardBg),
                    border:`1.5px solid ${active ? "transparent" : navBord}`,
                    borderRadius:14, padding:"10px 4px",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif",
                    transition:"all .2s",
                    boxShadow: active ? `0 4px 12px ${primary}44` : "none",
                    position:"relative",
                    userSelect:"none", WebkitUserSelect:"none",
                  }}>
                  {/* Pin indicator (only when not active and it's in first slot) */}
                  {pinned && !active && (
                    <div style={{ position:"absolute", top:3, right:5,
                      fontSize:8, opacity:.45 }}>📌</div>
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
          /* ── Calendar / grid view ────────────────────────────────────── */
          <GridView
            entries={entries}
            activeTurno={activeTurno}
            primary={primary}
            txt={txt} sub={sub} cardBg={cardBg}
            navBord={navBord} isDark={dark}
            onCellClick={onCellClick}
          />

        ) : (
          /* ── List view ───────────────────────────────────────────────── */
          <>
            {/* Day pills */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10, fontWeight:900, color:sub,
                letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>Día</div>
              <div style={{ display:"flex", gap:6, overflowX:"auto",
                paddingBottom:4, scrollbarWidth:"none" }}>
                {DAYS_SHORT.map((d, i) => {
                  const active = selectedDay === i;
                  const hasDot = !active && entries.some(
                    e => e.turno === activeTurno && e.day_of_week === i
                  );
                  return (
                    <button key={d} onClick={() => setSelectedDay(i)} style={{
                      flexShrink:0, position:"relative",
                      background: active ? primary : (dark ? "rgba(255,255,255,.06)" : cardBg),
                      border:`1.5px solid ${active ? primary : navBord}`,
                      borderRadius:99, padding:"7px 15px",
                      fontSize:12, fontWeight:800,
                      color: active ? "white" : txt,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif",
                      transition:"all .2s",
                    }}>
                      {d}
                      {hasDot && (
                        <span style={{
                          position:"absolute", top:3, right:4,
                          width:5, height:5, borderRadius:"50%",
                          background:primary, display:"block",
                        }}/>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List header + add button */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:12 }}>
              <div>
                <span style={{ fontWeight:900, fontSize:15, color:txt,
                  transition:"color .3s" }}>
                  {DAYS_FULL[selectedDay]}
                </span>
                <span style={{ fontSize:12, color:sub, marginLeft:6, transition:"color .3s" }}>
                  · turno {turnoLabel.toLowerCase()}
                </span>
              </div>
              <button onClick={() => openNew()} style={{
                background:primary, border:"none", borderRadius:99,
                padding:"7px 16px", color:"white", fontWeight:900, fontSize:12,
                cursor:"pointer", fontFamily:"Nunito,sans-serif",
                display:"flex", alignItems:"center", gap:5,
                boxShadow:`0 4px 12px ${primary}44`,
              }}>
                <span style={{ fontSize:15, lineHeight:1 }}>+</span> Agregar
              </button>
            </div>

            {/* Period cards */}
            {dayEntries.length === 0 ? (
              <div style={{ textAlign:"center", padding:"36px 20px" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>📚</div>
                <div style={{ fontWeight:800, color:txt, marginBottom:6, fontSize:15,
                  transition:"color .3s" }}>
                  Sin clases cargadas
                </div>
                <div style={{ fontSize:13, color:sub, marginBottom:20, lineHeight:1.55,
                  transition:"color .3s" }}>
                  No hay materias para {DAYS_FULL[selectedDay].toLowerCase()}
                  {" "}en el turno {turnoLabel.toLowerCase()}.
                </div>
                <button onClick={() => openNew()} style={{
                  background:primary, border:"none", borderRadius:50,
                  padding:"12px 28px", color:"white", fontWeight:900, fontSize:13,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif",
                }}>+ Agregar clase</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {dayEntries.map(entry => (
                  <div key={entry.id} onClick={() => openEdit(entry)} style={{
                    background:cardBg,
                    borderLeft:`4px solid ${entry.color || primary}`,
                    borderRadius:16, padding:"13px 16px", cursor:"pointer",
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
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        transition:"color .3s" }}>
                        {entry.subject}
                      </div>
                      {(entry.time_from || entry.time_to) && (
                        <div style={{ fontSize:12, color:sub, marginTop:2, transition:"color .3s" }}>
                          🕐{" "}
                          {fmtTime(entry.time_from)}
                          {entry.time_from && entry.time_to ? " — " : ""}
                          {fmtTime(entry.time_to)}
                        </div>
                      )}
                    </div>
                    <span style={{ color:sub, fontSize:14, transition:"color .3s" }}>✏️</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom drawer ─────────────────────────────────────────────────── */}
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
            {/* Handle */}
            <div style={{ width:40, height:4, borderRadius:99,
              background:dark?"#444":"#e0e0e0", margin:"12px auto 18px" }}/>

            {/* Title */}
            <div style={{ fontWeight:900, fontSize:15, color:txt,
              marginBottom:16, transition:"color .3s" }}>
              {editTarget ? "✏️ Editar clase" : "➕ Nueva clase"}
              <span style={{ fontSize:11, fontWeight:700, color:sub, marginLeft:8,
                transition:"color .3s" }}>
                {DAYS_FULL[selectedDay]} · {turnoLabel}
              </span>
            </div>

            {/* Subject */}
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

            {/* Times */}
            <div style={{ fontSize:10, fontWeight:900, color:sub,
              letterSpacing:".07em", marginBottom:6 }}>HORARIO (OPCIONAL)</div>
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              {[["time_from","Desde"],["time_to","Hasta"]].map(([key, label]) => (
                <div key={key} style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:sub, marginBottom:4,
                    fontWeight:700, transition:"color .3s" }}>{label}</div>
                  <input
                    type="time"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      border:`1.5px solid ${navBord}`,
                      borderRadius:12, padding:"10px 12px", fontSize:13,
                      fontFamily:"Nunito,sans-serif", outline:"none",
                      color:txt, background:inputBg,
                      transition:"background .3s, color .3s",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Color picker */}
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

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !form.subject.trim()}
              style={{
                width:"100%", padding:"13px", borderRadius:50, border:"none",
                background: (!form.subject.trim() || saving) ? navBord : primary,
                color:"white", fontWeight:900, fontSize:15,
                cursor: (!form.subject.trim() || saving) ? "not-allowed" : "pointer",
                fontFamily:"Nunito,sans-serif", marginBottom:10,
                transition:"all .2s",
              }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>

            {/* Delete */}
            {editTarget && (
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  width:"100%", padding:"12px", borderRadius:50,
                  border:`1.5px solid #ef444466`, background:"transparent",
                  color:"#ef4444", fontWeight:800, fontSize:14,
                  cursor:saving ? "not-allowed" : "pointer",
                  fontFamily:"Nunito,sans-serif", transition:"all .2s",
                }}>
                Eliminar clase
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
