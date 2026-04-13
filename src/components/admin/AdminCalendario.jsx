import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA, useToast, Toast } from "../shared/index";

const TIPOS = [
  { value:"feriado",     label:"Feriado",        icon:"🏖️"  },
  { value:"inscripcion", label:"Inscripción",     icon:"📝"  },
  { value:"examen",      label:"Mesa de examen",  icon:"📋"  },
  { value:"evento",      label:"Evento general",  icon:"📅"  },
  { value:"paro",        label:"Paro",            icon:"⚠️"  },
  { value:"otro",        label:"Otro",            icon:"📌"  },
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

function parseDate(fecha) {
  const s = typeof fecha === "string" ? fecha.slice(0,10) : String(fecha);
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function groupByMonth(events) {
  const map = {};
  events.forEach(ev => {
    const d = parseDate(ev.fecha);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map[key]) map[key] = { year: d.getFullYear(), month: d.getMonth(), items: [] };
    map[key].items.push({ ...ev, _date: d });
  });
  return Object.values(map).sort((a,b) => a.year !== b.year ? a.year-b.year : a.month-b.month);
}

function formatDate(d) {
  const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  return `${dias[d.getDay()]} ${d.getDate()}`;
}

const EMPTY = { titulo:"", descripcion:"", fecha:"", tipo:"evento" };

export default function AdminCalendario({ showToast, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord, inputBg } = useTheme();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null); // event id being edited
  const [saving,  setSaving]  = useState(false);
  const [showForm,setShowForm]= useState(false);

  const load = () =>
    api.academicEvents()
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(()=>{})
      .finally(()=>setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditing(ev.id);
    setForm({ titulo: ev.titulo, descripcion: ev.descripcion||"", fecha: ev.fecha, tipo: ev.tipo });
    setShowForm(true);
  };

  const cancel = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.titulo.trim() || !form.fecha)
      return showToast("Título y fecha son requeridos", "error");
    setSaving(true);
    try {
      if (editing) {
        await api.academicEventUpdate(editing, form);
        showToast("Evento actualizado");
      } else {
        await api.academicEventCreate(form);
        showToast("Evento creado");
      }
      await load();
      cancel();
    } catch (e) {
      showToast(e.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    try {
      await api.academicEventDelete(id);
      showToast("Eliminado");
      setEvents(ev => ev.filter(e => e.id !== id));
    } catch (e) {
      showToast(e.message || "Error", "error");
    }
  };

  const inp = { background:inputBg, border:`1px solid ${navBord}`, borderRadius:10,
    padding:"9px 12px", fontFamily:"Nunito,sans-serif", fontSize:14, fontWeight:700,
    color:txt, width:"100%", boxSizing:"border-box", outline:"none" };

  const groups = groupByMonth(events);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      background:pageBg, fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>

      <OHdrA title="Calendario Académico" onBack={onBack} accent={primary}/>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 32px" }}>

        {/* Botón agregar */}
        {!showForm && (
          <button onClick={openNew} style={{
            width:"100%", padding:"12px", background:primary, color:"white",
            border:"none", borderRadius:14, fontFamily:"Nunito,sans-serif",
            fontSize:14, fontWeight:900, cursor:"pointer", marginBottom:18 }}>
            + Agregar evento
          </button>
        )}

        {/* Formulario */}
        {showForm && (
          <div style={{ background:cardBg, borderRadius:18, padding:"18px 16px",
            marginBottom:18, boxShadow:isDark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)" }}>
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
                    style={{ padding:"6px 12px", borderRadius:99, border:"none",
                      cursor:"pointer", fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:800,
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
                  fontSize:13, fontWeight:900, opacity:saving?.6:1 }}>
                {saving ? "Guardando..." : (editing ? "Guardar cambios" : "Crear evento")}
              </button>
            </div>
          </div>
        )}

        {/* Lista de eventos */}
        {loading && (
          <div style={{ textAlign:"center", padding:"40px 0", color:sub, fontSize:14, fontWeight:700 }}>
            Cargando...
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:sub }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📅</div>
            <div style={{ fontWeight:800, fontSize:14 }}>Sin eventos aún</div>
          </div>
        )}

        {groups.map(g => (
          <div key={`${g.year}-${g.month}`} style={{ marginBottom:20 }}>
            <div style={{ fontWeight:900, fontSize:12, color:sub, letterSpacing:".08em",
              textTransform:"uppercase", marginBottom:8, paddingLeft:2 }}>
              {MESES[g.month]} {g.year}
            </div>
            {g.items.map(ev => {
              const cfg = TIPO_CFG[ev.tipo] || TIPO_CFG.otro;
              const t   = TIPOS.find(x=>x.value===ev.tipo) || TIPOS[5];
              return (
                <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"11px 14px", marginBottom:8, background:cardBg, borderRadius:16,
                  boxShadow:isDark?"0 1px 6px rgba(0,0,0,.4)":"0 1px 6px rgba(0,0,0,.06)",
                  borderLeft:`4px solid ${cfg.color}` }}>
                  <div style={{ fontSize:20, flexShrink:0 }}>{t.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:txt }}>{ev.titulo}</div>
                    <div style={{ fontSize:11, color:cfg.color, fontWeight:700, marginTop:1 }}>
                      {formatDate(ev._date)} · {t.label}
                    </div>
                    {ev.descripcion && (
                      <div style={{ fontSize:11, color:sub, marginTop:3 }}>{ev.descripcion}</div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>openEdit(ev)}
                      style={{ background:"none", border:"none", cursor:"pointer",
                        fontSize:16, padding:"4px", color:sub }}>✏️</button>
                    <button onClick={()=>remove(ev.id)}
                      style={{ background:"none", border:"none", cursor:"pointer",
                        fontSize:16, padding:"4px", color:"#ef4444" }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
