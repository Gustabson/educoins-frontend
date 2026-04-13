import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

const TIPO_CFG = {
  feriado:     { color:"#ef4444", icon:"🏖️", label:"Feriado"        },
  inscripcion: { color:"#3b82f6", icon:"📝", label:"Inscripción"    },
  examen:      { color:"#8b5cf6", icon:"📋", label:"Mesa de examen" },
  evento:      { color:"#10b981", icon:"📅", label:"Evento"         },
  paro:        { color:"#f59e0b", icon:"⚠️", label:"Paro"           },
  otro:        { color:"#64748b", icon:"📌", label:"Otro"           },
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

export default function ACalendario({ me, onBack, today: todayProp }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const today = todayProp || new Date();

  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [viewYear,   setViewYear]   = useState(today.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(today.getMonth());

  useEffect(() => {
    api.academicEvents()
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

      {/* ── Lista de eventos ───────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 32px" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0", color:sub, fontSize:14, fontWeight:700 }}>
            Cargando...
          </div>
        )}

        {!loading && monthEvents.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:sub }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
            <div style={{ fontWeight:800, fontSize:15 }}>Sin eventos este mes</div>
            <div style={{ fontSize:13, marginTop:4, color:sub }}>
              Usá ‹ › para ver otros meses
            </div>
          </div>
        )}

        {monthEvents.map(ev => {
          const cfg = TIPO_CFG[ev.tipo] || TIPO_CFG.otro;
          return (
            <div key={ev.id} style={{ display:"flex", alignItems:"flex-start", gap:12,
              padding:"13px 14px", marginBottom:10, background:cardBg, borderRadius:18,
              boxShadow:isDark?"0 1px 6px rgba(0,0,0,.4)":"0 1px 6px rgba(0,0,0,.06)",
              transition:"background .3s", borderLeft:`4px solid ${cfg.color}` }}>
              <div style={{ width:40, height:40, borderRadius:12, background:cfg.color+"22",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, flexShrink:0 }}>
                {cfg.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14, color:txt, transition:"color .3s" }}>
                  {ev.titulo}
                </div>
                <div style={{ fontSize:12, color:cfg.color, fontWeight:700, marginTop:2 }}>
                  {formatFullDate(ev._date)} · {cfg.label}
                </div>
                {ev.descripcion && (
                  <div style={{ fontSize:12, color:sub, marginTop:4, lineHeight:1.4, transition:"color .3s" }}>
                    {ev.descripcion}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
