// AHorarios.jsx — Weekly school schedule
//
// Model:
//   • User picks ONE turno (Mañana/Tarde/Noche/Extra) — the rest are hidden
//   • Within the active turno, each day (Lun-Dom) holds N subjects/periods
//   • Each period: subject name, optional time_from, optional time_to, color
//   • All data synced to backend — no localStorage

import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

// ─── constants ───────────────────────────────────────────────
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
  return d === 0 ? 6 : d - 1; // JS Sun=0 → Mon=0…Sun=6
}

const fmtTime = t => t ? t.substring(0,5) : null;

// ─── component ───────────────────────────────────────────────
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
  const [editTarget,  setEditTarget]  = useState(null); // null = new
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    api.getSchedule()
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setEntries(arr);
        // Default to turno with most entries (else manana)
        if (arr.length > 0) {
          const counts = arr.reduce((acc, e) => {
            acc[e.turno] = (acc[e.turno]||0) + 1; return acc;
          }, {});
          setActiveTurno(
            Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0]
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derived ───────────────────────────────────────────────
  const dayEntries = entries
    .filter(e => e.turno === activeTurno && e.day_of_week === selectedDay)
    .sort((a,b) => {
      const ta = a.time_from || "99:99";
      const tb = b.time_from || "99:99";
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });

  const turnoLabel = TURNOS.find(t => t.key === activeTurno)?.label || "";

  // ── Handlers ─────────────────────────────────────────────
  const openNew = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (entry) => {
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
    } catch (e) {
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
    } catch (e) {
      showToast?.(e.message || "Error al eliminar", "error");
    } finally { setSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{
        background:primary,
        color:"white", padding:"52px 20px 20px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden",
      }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.08)", top:-60, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <button onClick={onBack} style={{
            background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
            width:34, height:34, cursor:"pointer", color:"white", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Nunito,sans-serif", flexShrink:0,
          }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:20 }}>📅 Horarios</div>
            <div style={{ fontSize:12, opacity:.85 }}>Tu calendario semanal</div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div style={{ padding:"18px 14px 100px" }}>

        {/* ── 1. Turno selector ─────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, fontWeight:900, color:sub,
            letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>
            Turno escolar
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
            {TURNOS.map(t => {
              const active = activeTurno === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTurno(t.key)} style={{
                  background: active
                    ? primary
                    : (dark ? "rgba(255,255,255,.06)" : cardBg),
                  border: `1.5px solid ${active ? "transparent" : navBord}`,
                  borderRadius:14, padding:"10px 4px",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", gap:4,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  transition:"all .2s",
                  boxShadow: active ? `0 4px 12px ${primary}44` : "none",
                }}>
                  <span style={{ fontSize:20 }}>{t.emoji}</span>
                  <span style={{ fontSize:11, fontWeight:800,
                    color: active ? "white" : txt,
                    transition:"color .2s" }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. Day pills ──────────────────────────────── */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:900, color:sub,
            letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>
            Día
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto",
            paddingBottom:4, scrollbarWidth:"none" }}>
            {DAYS_SHORT.map((d, i) => {
              const active = selectedDay === i;
              return (
                <button key={d} onClick={() => setSelectedDay(i)} style={{
                  flexShrink:0,
                  background: active ? primary : (dark ? "rgba(255,255,255,.06)" : cardBg),
                  border: `1.5px solid ${active ? primary : navBord}`,
                  borderRadius:99, padding:"7px 15px",
                  fontSize:12, fontWeight:800,
                  color: active ? "white" : txt,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  transition:"all .2s",
                }}>{d}</button>
              );
            })}
          </div>
        </div>

        {/* ── 3. Period list header ─────────────────────── */}
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <span style={{ fontWeight:900, fontSize:15, color:txt,
              transition:"color .3s" }}>
              {DAYS_FULL[selectedDay]}
            </span>
            <span style={{ fontSize:12, color:sub, marginLeft:6,
              transition:"color .3s" }}>
              · turno {turnoLabel.toLowerCase()}
            </span>
          </div>
          <button onClick={openNew} style={{
            background:primary,
            border:"none", borderRadius:99, padding:"7px 16px",
            color:"white", fontWeight:900, fontSize:12,
            cursor:"pointer", fontFamily:"Nunito,sans-serif",
            display:"flex", alignItems:"center", gap:5,
            boxShadow:`0 4px 12px ${primary}44`,
          }}>
            <span style={{ fontSize:15, lineHeight:1 }}>+</span> Agregar
          </button>
        </div>

        {/* ── 4. Period cards ───────────────────────────── */}
        {loading ? (
          <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>
        ) : dayEntries.length === 0 ? (
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
            <button onClick={openNew} style={{
              background:primary,
              border:"none", borderRadius:50, padding:"12px 28px",
              color:"white", fontWeight:900, fontSize:13,
              cursor:"pointer", fontFamily:"Nunito,sans-serif",
            }}>+ Agregar clase</button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {dayEntries.map(entry => (
              <div key={entry.id} onClick={() => openEdit(entry)} style={{
                background:cardBg,
                borderLeft:`4px solid ${entry.color || primary}`,
                borderRadius:16,
                padding:"13px 16px",
                cursor:"pointer",
                display:"flex", alignItems:"center", gap:12,
                boxShadow: dark
                  ? "0 2px 8px rgba(0,0,0,.3)"
                  : "0 1px 6px rgba(0,0,0,.07)",
                transition:"background .3s",
              }}>
                {/* Color initial */}
                <div style={{
                  width:38, height:38, borderRadius:11, flexShrink:0,
                  background: `${entry.color || primary}20`,
                  border:`1.5px solid ${entry.color || primary}55`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:900, fontSize:15,
                  color: entry.color || primary,
                }}>
                  {entry.subject.charAt(0).toUpperCase()}
                </div>
                {/* Text */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:txt,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                    transition:"color .3s" }}>
                    {entry.subject}
                  </div>
                  {(entry.time_from || entry.time_to) && (
                    <div style={{ fontSize:12, color:sub, marginTop:2,
                      transition:"color .3s" }}>
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
      </div>

      {/* ── Bottom drawer ────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div onClick={closeDrawer} style={{
            position:"fixed", inset:0,
            background:"rgba(0,0,0,.5)", zIndex:190,
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
              background: dark ? "#444" : "#e0e0e0",
              margin:"12px auto 18px" }}/>

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
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="Ej: Matemáticas, Inglés, Ed. Física..."
              style={{
                width:"100%", boxSizing:"border-box",
                border:`1.5px solid ${form.subject.trim() ? primary : navBord}`,
                borderRadius:12, padding:"11px 14px", fontSize:14,
                fontFamily:"Nunito,sans-serif", outline:"none",
                color:txt, background:inputBg,
                marginBottom:14,
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
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
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

            {/* Color */}
            <div style={{ fontSize:10, fontWeight:900, color:sub,
              letterSpacing:".07em", marginBottom:8 }}>COLOR</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color:c }))} style={{
                  width:30, height:30, borderRadius:"50%", background:c,
                  border:`3px solid ${form.color === c ? txt : "transparent"}`,
                  cursor:"pointer", flexShrink:0,
                  outline:"none", transition:"border-color .15s",
                }}/>
              ))}
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !form.subject.trim()}
              style={{
                width:"100%", padding:"13px", borderRadius:50, border:"none",
                background: (!form.subject.trim() || saving)
                  ? navBord
                  : primary,
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
                  border:`1.5px solid #ef444466`,
                  background:"transparent", color:"#ef4444",
                  fontWeight:800, fontSize:14,
                  cursor: saving ? "not-allowed" : "pointer",
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
