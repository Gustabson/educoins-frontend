import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

const TIPOS = [
  { value:"feriado",     label:"Feriado",       icon:"🏖️" },
  { value:"inscripcion", label:"Inscripción",    icon:"📝" },
  { value:"examen",      label:"Mesa de examen", icon:"📋" },
  { value:"evento",      label:"Evento general", icon:"📅" },
  { value:"paro",        label:"Paro",           icon:"⚠️" },
  { value:"otro",        label:"Otro",           icon:"📌" },
];

const TIPO_CFG = {
  feriado:     { color:"#ef4444" },
  inscripcion: { color:"#3b82f6" },
  examen:      { color:"#8b5cf6" },
  evento:      { color:"#10b981" },
  paro:        { color:"#f59e0b" },
  otro:        { color:"#64748b" },
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function parseDate(fecha) {
  const s = typeof fecha === "string" ? fecha.slice(0,10) : String(fecha);
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatFullDate(d) {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`;
}

const EMPTY = { titulo:"", descripcion:"", fecha:"", tipo:"evento" };

export default function AdminCalendario({ showToast, onBack, today: todayProp }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord, inputBg } = useTheme();
  const today = todayProp || new Date();

  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState(EMPTY);
  const [editing,  setEditing]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth,setViewMonth]= useState(today.getMonth());

  const load = () =>
    api.academicEvents()
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []); // eslint-disable-line

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthEvents = events
    .filter(ev => {
      const d = parseDate(ev.fecha);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    })
    .map(ev => ({ ...ev, _date: parseDate(ev.fecha) }))
    .sort((a, b) => a._date - b._date);

  const openNew = () => {
    setEditing(null);
    // Pre-fill fecha with first day of viewed month
    const mm = String(viewMonth + 1).padStart(2,"0");
    setForm({ ...EMPTY, fecha:`${viewYear}-${mm}-01` });
    setShowForm(true);
  };
  const openEdit = (ev) => {
    setEditing(ev.id);
    setForm({ titulo:ev.titulo, descripcion:ev.descripcion||"", fecha:ev.fecha.slice(0,10), tipo:ev.tipo });
    setShowForm(true);
  };
  const cancel = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.titulo.trim() || !form.fecha)
      return showToast("Título y fecha son requeridos", "error");
    setSaving(true);
    try {
      if (editing) { await api.academicEventUpdate(editing, form); showToast("Evento actualizado"); }
      else         { await api.academicEventCreate(form);          showToast("Evento creado"); }
      await load();
      cancel();
    } catch (e) {
      showToast(e.message || "Error al guardar", "error");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    try { await api.academicEventDelete(id); showToast("Eliminado"); setEvents(ev => ev.filter(e => e.id !== id)); }
    catch (e) { showToast(e.message || "Error", "error"); }
  };

  const inp = { background:inputBg, border:`1px solid ${navBord}`, borderRadius:10,
    padding:"9px 12px", fontFamily:"Nunito,sans-serif", fontSize:14, fontWeight:700,
    color:txt, width:"100%", boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      background:pageBg, fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>

      {/* ── Header (solo título + back) ────────────────────────── */}
      <div style={{ background:primary, position:"sticky", top:0, zIndex:50,
        overflow:"hidden", color:"white", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ padding:"22px 20px 18px", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", position:"relative", minHeight:32 }}>
            <button onClick={onBack} style={{ background:"rgba(0,0,0,.15)", border:"none",
              borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, zIndex:1 }}>←</button>
            <div style={{ position:"absolute", left:0, right:0, textAlign:"center",
              pointerEvents:"none", fontWeight:900, fontSize:20, color:"white" }}>
              Calendario Académico
            </div>
          </div>
        </div>
      </div>

      {/* ── Navegación de mes (fuera del header) ───────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 20px", background:cardBg, borderBottom:`1px solid ${navBord}`,
        transition:"background .3s, border-color .3s" }}>
        <button onClick={prevMonth} style={{ background:primary+"18", border:"none",
          borderRadius:50, color:primary, width:38, height:38, cursor:"pointer", fontSize:22,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"Nunito,sans-serif", fontWeight:900 }}>‹</button>
        <div style={{ fontWeight:900, fontSize:20, color:txt, letterSpacing:"-.3px",
          transition:"color .3s" }}>
          {MESES[viewMonth]} {viewYear}
        </div>
        <button onClick={nextMonth} style={{ background:primary+"18", border:"none",
          borderRadius:50, color:primary, width:38, height:38, cursor:"pointer", fontSize:22,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"Nunito,sans-serif", fontWeight:900 }}>›</button>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 32px" }}>

        {/* Botón agregar */}
        {!showForm && (
          <button onClick={openNew} style={{ width:"100%", padding:"12px", background:primary,
            color:"white", border:"none", borderRadius:14, fontFamily:"Nunito,sans-serif",
            fontSize:14, fontWeight:900, cursor:"pointer", marginBottom:16 }}>
            + Agregar evento en {MESES[viewMonth]}
          </button>
        )}

        {/* Formulario */}
        {showForm && (
          <div style={{ background:cardBg, borderRadius:18, padding:"18px 16px",
            marginBottom:16, boxShadow:isDark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)" }}>
            <div style={{ fontWeight:900, fontSize:15, color:txt, marginBottom:14 }}>
              {editing ? "Editar evento" : "Nuevo evento"}
            </div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:sub, marginBottom:4 }}>TÍTULO *</div>
              <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))}
                placeholder="Ej: Paro docente nacional" style={inp}/>
            </div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:sub, marginBottom:4 }}>FECHA *</div>
              <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))}
                style={inp}/>
            </div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:sub, marginBottom:4 }}>TIPO</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {TIPOS.map(t => (
                  <button key={t.value} onClick={()=>setForm(f=>({...f,tipo:t.value}))}
                    style={{ padding:"6px 12px", borderRadius:99, border:"none", cursor:"pointer",
                      fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:800,
                      background: form.tipo===t.value ? (TIPO_CFG[t.value]?.color||primary) : (isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)"),
                      color: form.tipo===t.value ? "white" : sub }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:800, color:sub, marginBottom:4 }}>DESCRIPCIÓN</div>
              <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))}
                placeholder="Opcional..." rows={3}
                style={{ ...inp, resize:"vertical", lineHeight:1.5 }}/>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={cancel}
                style={{ flex:1, padding:"10px", background:isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)",
                  border:"none", borderRadius:12, cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  fontSize:13, fontWeight:800, color:sub }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving}
                style={{ flex:2, padding:"10px", background:primary, color:"white",
                  border:"none", borderRadius:12, cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  fontSize:13, fontWeight:900, opacity:saving?0.6:1 }}>
                {saving ? "Guardando..." : (editing ? "Guardar cambios" : "Crear evento")}
              </button>
            </div>
          </div>
        )}

        {/* Lista del mes */}
        {loading && (
          <div style={{ textAlign:"center", padding:"40px 0", color:sub, fontSize:14, fontWeight:700 }}>
            Cargando...
          </div>
        )}

        {!loading && monthEvents.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:sub }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📅</div>
            <div style={{ fontWeight:800, fontSize:14 }}>Sin eventos en {MESES[viewMonth]}</div>
            <div style={{ fontSize:12, marginTop:4 }}>Usá + Agregar evento para crear uno</div>
          </div>
        )}

        {monthEvents.map(ev => {
          const cfg  = TIPO_CFG[ev.tipo] || TIPO_CFG.otro;
          const tipo = TIPOS.find(x => x.value === ev.tipo) || TIPOS[5];
          return (
            <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"11px 14px", marginBottom:8, background:cardBg, borderRadius:16,
              boxShadow:isDark?"0 1px 6px rgba(0,0,0,.4)":"0 1px 6px rgba(0,0,0,.06)",
              borderLeft:`4px solid ${cfg.color}` }}>
              <div style={{ fontSize:20, flexShrink:0 }}>{tipo.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:13, color:txt }}>{ev.titulo}</div>
                <div style={{ fontSize:11, color:cfg.color, fontWeight:700, marginTop:1 }}>
                  {formatFullDate(ev._date)} · {tipo.label}
                </div>
                {ev.descripcion && (
                  <div style={{ fontSize:11, color:sub, marginTop:3 }}>{ev.descripcion}</div>
                )}
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={()=>openEdit(ev)} style={{ background:"none", border:"none",
                  cursor:"pointer", fontSize:16, padding:"4px", color:sub }}>✏️</button>
                <button onClick={()=>remove(ev.id)} style={{ background:"none", border:"none",
                  cursor:"pointer", fontSize:16, padding:"4px", color:"#ef4444" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
