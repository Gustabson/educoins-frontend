import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA } from "../shared/index";

const TIPO_CFG = {
  feriado:     { color:"#ef4444", icon:"🏖️",  label:"Feriado"      },
  inscripcion: { color:"#3b82f6", icon:"📝",  label:"Inscripción"  },
  examen:      { color:"#8b5cf6", icon:"📋",  label:"Mesa de examen" },
  evento:      { color:"#10b981", icon:"📅",  label:"Evento"       },
  paro:        { color:"#f59e0b", icon:"⚠️",  label:"Paro"         },
  otro:        { color:"#64748b", icon:"📌",  label:"Otro"         },
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

export default function ACalendario({ me, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.academicEvents()
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const groups = groupByMonth(events);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      background:pageBg, fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>

      <OHdrA title="Calendario Académico" onBack={onBack} accent={primary}/>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 32px" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0", color:sub, fontSize:14, fontWeight:700 }}>
            Cargando...
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:sub }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
            <div style={{ fontWeight:800, fontSize:15 }}>Sin eventos publicados</div>
            <div style={{ fontSize:13, marginTop:4 }}>Cuando se agreguen eventos aparecerán acá</div>
          </div>
        )}

        {groups.map(g => (
          <div key={`${g.year}-${g.month}`} style={{ marginBottom:20 }}>
            <div style={{ fontWeight:900, fontSize:13, color:sub, letterSpacing:".08em",
              textTransform:"uppercase", marginBottom:8, paddingLeft:2,
              transition:"color .3s" }}>
              {MESES[g.month]} {g.year}
            </div>
            {g.items.map(ev => {
              const cfg = TIPO_CFG[ev.tipo] || TIPO_CFG.otro;
              return (
                <div key={ev.id} style={{ display:"flex", alignItems:"flex-start", gap:12,
                  padding:"13px 14px", marginBottom:8, background:cardBg, borderRadius:18,
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
                      {formatDate(ev._date)} · {cfg.label}
                    </div>
                    {ev.descripcion && (
                      <div style={{ fontSize:12, color:sub, marginTop:4, lineHeight:1.4,
                        transition:"color .3s" }}>
                        {ev.descripcion}
                      </div>
                    )}
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
