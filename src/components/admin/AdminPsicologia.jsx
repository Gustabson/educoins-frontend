import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";

// ── Constantes visuales ───────────────────────────────────────
const RISK_CFG = {
  normal:    { color:"#10b981", bg:"#f0fdf4", label:"Normal",     icon:"🟢" },
  attention: { color:"#f59e0b", bg:"#fffbeb", label:"Atención",   icon:"🟡" },
  priority:  { color:"#f97316", bg:"#fff7ed", label:"Prioritario", icon:"🟠" },
  urgent:    { color:"#ef4444", bg:"#fef2f2", label:"Urgente",    icon:"🔴" },
};
const MOOD_LABEL = { 1:"Muy mal", 2:"Mal", 3:"Regular", 4:"Bien", 5:"Muy bien" };
const MOOD_COLOR = { 1:"#ef4444", 2:"#f97316", 3:"#eab308", 4:"#22c55e", 5:"#06b6d4" };
const MOOD_EMOJI = { 1:"😞", 2:"😟", 3:"😐", 4:"😊", 5:"😄" };
const CAT_LABEL  = {
  presion:"Presionado/a", tristeza:"Triste", enojo:"Enojado/a",
  miedo:"Miedo",  cansancio:"Agotado/a", soledad:"Solo/a",
  logro:"Logré algo", apoyo:"Me ayudaron", alegria:"Algo genial",
  querido:"Me sentí querido/a", orgulloso:"Orgulloso/a", energia:"Mucha energía",
};
const CAT_NEG = new Set(["miedo","soledad","presion","tristeza","enojo","cansancio"]);
const TIPO_LABEL = {
  bullying:"🚫 Bullying", violencia_domestica:"🏠 Problema en casa",
  maltrato_docente:"👨‍🏫 Maltrato de adulto", acoso:"😰 Acoso/Amenazas", otro:"💬 Otro",
};
const TREND_CFG = {
  improving: { icon:"↗", color:"#10b981", label:"Mejorando"  },
  stable:    { icon:"→", color:"#64748b", label:"Estable"    },
  declining: { icon:"↘", color:"#ef4444", label:"Empeorando" },
};

// ── Helpers UI ────────────────────────────────────────────────
function Loader() {
  return <div style={{padding:40,textAlign:"center",color:"#aaa",fontWeight:700,fontSize:13}}>Cargando...</div>;
}
function Empty({ msg }) {
  return <div style={{padding:"32px 16px",textAlign:"center",color:"#aaa",fontWeight:700,fontSize:13}}>{msg}</div>;
}
function RiskBadge({ level }) {
  const c = RISK_CFG[level] || RISK_CFG.normal;
  return (
    <span style={{background:c.bg,color:c.color,borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:800}}>
      {c.icon} {c.label}
    </span>
  );
}
function Section({ title, children }) {
  return (
    <div style={{background:"white",borderRadius:16,padding:"14px 16px",marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>{title}</div>
      {children}
    </div>
  );
}
function NumRow({ label, hint, val, onChange }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:"#333"}}>{label}</div>
        {hint && <div style={{fontSize:10,color:"#aaa"}}>{hint}</div>}
      </div>
      <input type="number" min="0" value={val??0} onChange={e=>onChange(e.target.value)}
        style={{width:60,border:"1.5px solid #e8e8e8",borderRadius:10,padding:"7px 10px",
          fontSize:15,fontWeight:900,outline:"none",color:"#8b5cf6",
          textAlign:"center",fontFamily:"Nunito,sans-serif"}}/>
    </div>
  );
}
function MoodBar({ dist, total }) {
  if (!total) return null;
  return (
    <div style={{display:"flex",height:8,borderRadius:99,overflow:"hidden",gap:1}}>
      {[1,2,3,4,5].map(m=>{
        const cnt = dist.find(d=>d.mood===m)?.cnt||0;
        if(!cnt) return null;
        return <div key={m} style={{flex:cnt,background:MOOD_COLOR[m],minWidth:2}} title={`${MOOD_LABEL[m]}: ${cnt}`}/>;
      })}
    </div>
  );
}
function IconBtn({ icon, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,
        color:"white",width:34,height:34,cursor:"pointer",fontSize:16,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
      {icon}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// SECCIÓN: EXPLORAR — vista manual de todos los alumnos
// ══════════════════════════════════════════════════════════════
function ExplorarView({ refreshTick }) {
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [days,      setDays]      = useState(30);
  const [onlyNota,  setOnlyNota]  = useState(false);
  const [onlySinRep,setOnlySinRep]= useState(false);
  const [expanded,  setExpanded]  = useState(null);
  const [sortBy,    setSortBy]    = useState("mood"); // mood | alpha | recency

  const load = () => {
    setLoading(true);
    api.wellnessAdminExplore(days)
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [days, refreshTick]);

  let filtered = [...data];
  if (onlyNota)   filtered = filtered.filter(s => s.notes?.length > 0);
  if (onlySinRep) filtered = filtered.filter(s => !s.entry);

  // Re-sort client-side
  if (sortBy === "alpha")   filtered.sort((a,b) => a.nombre.localeCompare(b.nombre));
  if (sortBy === "recency") filtered.sort((a,b) => {
    if (!a.entry && !b.entry) return 0;
    if (!a.entry) return 1; if (!b.entry) return -1;
    return b.entry.date.localeCompare(a.entry.date);
  });
  // mood sort ya viene del backend pero re-aplicamos por si hubo re-sort
  if (sortBy === "mood") filtered.sort((a,b) => {
    if (!a.entry && !b.entry) return 0;
    if (!a.entry) return 1; if (!b.entry) return -1;
    return a.entry.mood - b.entry.mood;
  });

  const withEntry  = data.filter(s => s.entry);
  const withNota   = data.filter(s => s.notes?.length > 0);
  const sinReporte = data.filter(s => !s.entry);
  const moodDist   = [1,2,3,4,5].map(m => ({
    mood: m, cnt: data.filter(s => s.entry?.mood === m).length
  }));

  return (
    <div style={{padding:"14px 14px 24px"}}>

      {/* Days selector */}
      <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
        {[[30,"30 días"],[60,"60 días"],[120,"120 días"],[365,"1 año"],[730,"2 años"]].map(([v,l]) => (
          <button key={v} onClick={()=>setDays(v)}
            style={{flexShrink:0,border:"none",borderRadius:99,padding:"7px 14px",
              background:days===v?"#8b5cf6":"#f0f0f0",
              color:days===v?"white":"#555",
              fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        {[
          {val:withEntry.length,  label:"reportaron",   col:"#8b5cf6"},
          {val:withNota.length,   label:"con nota",     col:"#06b6d4"},
          {val:sinReporte.length, label:"sin reporte",  col:"#94a3b8"},
        ].map(({val,label,col}) => (
          <span key={label} style={{background:col+"18",color:col,
            borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:800}}>
            {val} {label}
          </span>
        ))}
      </div>

      {/* Barra de humor del día */}
      {withEntry.length > 0 && (
        <div style={{background:"white",borderRadius:14,padding:"10px 14px",marginBottom:10,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#999",marginBottom:6}}>Distribución de ánimo</div>
          <MoodBar dist={moodDist} total={withEntry.length}/>
          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
            {moodDist.filter(d=>d.cnt>0).map(d=>(
              <span key={d.mood} style={{fontSize:10,fontWeight:800,color:MOOD_COLOR[d.mood],
                background:MOOD_COLOR[d.mood]+"18",borderRadius:99,padding:"1px 8px"}}>
                {MOOD_EMOJI[d.mood]} {d.cnt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filtros + orden */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>{setOnlyNota(!onlyNota);setOnlySinRep(false);}}
          style={{border:"none",borderRadius:99,padding:"6px 12px",
            background:onlyNota?"#06b6d4":"#f0f0f0",
            color:onlyNota?"white":"#555",
            fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          📝 Con nota
        </button>
        <button onClick={()=>{setOnlySinRep(!onlySinRep);setOnlyNota(false);}}
          style={{border:"none",borderRadius:99,padding:"6px 12px",
            background:onlySinRep?"#94a3b8":"#f0f0f0",
            color:onlySinRep?"white":"#555",
            fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          ❓ Sin reporte
        </button>
        <div style={{flex:1}}/>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{border:"1.5px solid #e8e8e8",borderRadius:10,padding:"5px 10px",
            fontSize:11,fontWeight:700,color:"#555",outline:"none",
            fontFamily:"Nunito,sans-serif",background:"white"}}>
          <option value="mood">⬇ Por ánimo</option>
          <option value="recency">🕐 Por reciente</option>
          <option value="alpha">🔤 Alfabético</option>
        </select>
      </div>

      {loading && <Loader/>}
      {!loading && filtered.length === 0 && <Empty msg="Ningún alumno coincide"/>}
      {!loading && filtered.map(s => (
        <ExplorarCard key={s.id} s={s}
          expanded={expanded===s.id}
          onExpand={()=>setExpanded(expanded===s.id?null:s.id)}/>
      ))}
    </div>
  );
}

function ExplorarCard({ s, expanded, onExpand }) {
  const e      = s.entry;
  const notes  = s.notes || [];
  const isLow  = e && e.mood <= 2;
  const isHR   = e && (e.categories||[]).some(c => ["miedo","soledad","presion"].includes(c));
  const hasHRNote = notes.some(n => (n.categories||[]).some(c => ["miedo","soledad","presion"].includes(c)));
  const border = isLow ? "#ef4444" : (isHR||hasHRNote) ? "#f97316" : notes.length ? "#8b5cf6" : "#e8e8e8";
  const PREVIEW_NOTES = 2;
  const showMore = !expanded && notes.length > PREVIEW_NOTES;

  return (
    <div style={{background:"white",borderRadius:16,padding:"12px 14px",
      marginBottom:8,boxShadow:"0 1px 8px rgba(0,0,0,.05)",borderLeft:`4px solid ${border}`}}>

      {/* Fila principal: avatar + nombre + mood */}
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
          background: e ? MOOD_COLOR[e.mood]+"22":"#f0f0f0",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
          {e ? MOOD_EMOJI[e.mood] : "❓"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{s.nombre}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {notes.length > 0 && (
                <span style={{fontSize:10,fontWeight:800,color:"#8b5cf6",
                  background:"#f3e8ff",borderRadius:99,padding:"1px 7px"}}>
                  {notes.length} nota{notes.length>1?"s":""}
                </span>
              )}
              <div style={{fontSize:10,color:"#aaa"}}>{e ? e.date : "—"}</div>
            </div>
          </div>
          {e ? (
            <>
              <div style={{fontWeight:700,fontSize:12,color:MOOD_COLOR[e.mood],marginTop:2}}>
                {MOOD_EMOJI[e.mood]} {MOOD_LABEL[e.mood]}
              </div>
              {(e.categories||[]).length > 0 && (
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>
                  {e.categories.map(c=>(
                    <span key={c} style={{fontSize:10,fontWeight:700,borderRadius:99,padding:"1px 6px",
                      background:CAT_NEG.has(c)?"#fef2f2":"#f0fdf4",
                      color:CAT_NEG.has(c)?"#ef4444":"#10b981"}}>
                      {CAT_LABEL[c]||c}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{fontSize:11,color:"#aaa",marginTop:2}}>No registró ánimo en este período</div>
          )}
        </div>
      </div>

      {/* Sección de notas */}
      {notes.length > 0 && (
        <div style={{marginTop:8,borderTop:"1px solid #f0f0f0",paddingTop:8}}>
          <div style={{fontSize:10,fontWeight:800,color:"#8b5cf6",marginBottom:6,letterSpacing:".05em"}}>
            NOTAS
          </div>
          {(expanded ? notes : notes.slice(0, PREVIEW_NOTES)).map((n, i) => (
            <div key={n.id||i} style={{marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:13}}>{n.mood ? MOOD_EMOJI[n.mood] : "💬"}</span>
                {(n.categories||[]).filter(c=>CAT_NEG.has(c)).map(c=>(
                  <span key={c} style={{fontSize:9,fontWeight:800,color:"#ef4444",
                    background:"#fef2f2",borderRadius:99,padding:"1px 5px"}}>
                    {CAT_LABEL[c]||c}
                  </span>
                ))}
                <span style={{fontSize:10,color:"#bbb",marginLeft:"auto"}}>
                  {n.date} {n.time}
                </span>
              </div>
              {n.nota ? (
                <div style={{fontSize:12,color:"#333",fontStyle:"italic",lineHeight:1.5,
                  background:"#f8f0ff",borderRadius:8,padding:"7px 10px",
                  borderLeft:"3px solid #8b5cf6"}}>
                  "{n.nota}"
                </div>
              ) : (
                <div style={{fontSize:11,color:"#aaa",fontStyle:"italic"}}>
                  🔒 Nota privada — activá "Notas visibles" en Configuración
                </div>
              )}
            </div>
          ))}
          {showMore && (
            <button onClick={onExpand}
              style={{background:"none",border:"none",color:"#8b5cf6",
                fontSize:11,fontWeight:700,cursor:"pointer",
                fontFamily:"Nunito,sans-serif",padding:"2px 0"}}>
              Ver {notes.length - PREVIEW_NOTES} nota{notes.length-PREVIEW_NOTES>1?"s":""} más ↓
            </button>
          )}
          {expanded && notes.length > PREVIEW_NOTES && (
            <button onClick={onExpand}
              style={{background:"none",border:"none",color:"#8b5cf6",
                fontSize:11,fontWeight:700,cursor:"pointer",
                fontFamily:"Nunito,sans-serif",padding:"2px 0"}}>
              Mostrar menos ↑
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECCIÓN: SMART — algoritmo de riesgo
// ══════════════════════════════════════════════════════════════
function SmartDashboard({ onNav, refreshTick }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.wellnessAdminDashboard()
      .then(setData)
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  // Recargar cuando llegue un wellness_update (refreshTick cambia)
  useEffect(load, [refreshTick]);

  if (loading) return <Loader/>;
  if (!data) return <Empty msg="No se pudo cargar el dashboard"/>;

  const moodTotal = data.mood_dist.reduce((s,d)=>s+d.cnt,0);
  const pct = n => data.total_students ? Math.round(n/data.total_students*100) : 0;

  return (
    <div style={{padding:"14px 14px 24px"}}>
      {/* Botón de refresh manual */}
      <button onClick={load}
        style={{width:"100%",background:"white",border:"1.5px solid #e8e8e8",
          borderRadius:12,padding:"8px",fontSize:12,fontWeight:700,color:"#8b5cf6",
          cursor:"pointer",fontFamily:"Nunito,sans-serif",marginBottom:12}}>
        ↺ Actualizar dashboard
      </button>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {icon:"🧠",val:`${data.checked_today} / ${data.total_students}`,
           sub:`${pct(data.checked_today)}% reportó hoy`,col:"#8b5cf6"},
          {icon:"📊",val:data.avg_mood_today?`${data.avg_mood_today} / 5`:"Sin datos",
           sub:"Ánimo promedio hoy",
           col:data.avg_mood_today?MOOD_COLOR[Math.round(data.avg_mood_today)]:"#aaa"},
          {icon:"📬",val:data.unread_reports,sub:"Reportes sin revisar",
           col:data.unread_reports>0?"#ef4444":"#10b981"},
          {icon:"⚠️",val:data.recent_alerts.length,sub:"Alumnos 3+ días bajo ánimo",
           col:data.recent_alerts.length?"#f97316":"#10b981"},
        ].map(s=>(
          <div key={s.sub} style={{background:"white",borderRadius:18,padding:"14px",
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
            <div style={{fontWeight:900,fontSize:18,color:s.col}}>{s.val}</div>
            <div style={{fontSize:10,color:"#aaa",fontWeight:700,marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Distribución de ánimo */}
      {moodTotal > 0 && (
        <div style={{background:"white",borderRadius:18,padding:"14px 16px",
          marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>
            😐 Distribución de ánimo hoy
          </div>
          <MoodBar dist={data.mood_dist} total={moodTotal}/>
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            {[1,2,3,4,5].map(m=>{
              const cnt = data.mood_dist.find(d=>d.mood===m)?.cnt||0;
              if(!cnt) return null;
              return (
                <span key={m} style={{fontSize:11,fontWeight:700,color:MOOD_COLOR[m],
                  background:MOOD_COLOR[m]+"18",borderRadius:99,padding:"2px 8px"}}>
                  {MOOD_EMOJI[m]} {cnt}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Top categorías */}
      {data.top_categories.length > 0 && (
        <div style={{background:"white",borderRadius:18,padding:"14px 16px",
          marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>
            🏷 Categorías más frecuentes (últimos 7 días)
          </div>
          {data.top_categories.map(({cat,cnt})=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:700,color:"#555",width:140,flexShrink:0}}>
                {CAT_LABEL[cat]||cat}
              </div>
              <div style={{flex:1,background:"#f0f0f0",borderRadius:99,height:8}}>
                <div style={{width:`${Math.min(100,cnt/Math.max(data.checked_today,1)*100)}%`,
                  background:CAT_NEG.has(cat)?"#ef4444":"#8b5cf6",
                  height:"100%",borderRadius:99,minWidth:6}}/>
              </div>
              <div style={{fontSize:11,fontWeight:800,color:"#666",width:24,textAlign:"right"}}>{cnt}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alertas recientes */}
      {data.recent_alerts.length > 0 && (
        <div style={{background:"#fef2f2",borderRadius:18,padding:"14px 16px",
          marginBottom:12,border:"1.5px solid #fecaca"}}>
          <div style={{fontWeight:800,fontSize:13,color:"#dc2626",marginBottom:8}}>
            🚨 Alumnos con 3+ días de ánimo bajo (últimos 7 días)
          </div>
          {data.recent_alerts.map(a=>(
            <div key={a.id} onClick={()=>onNav("student",a.id)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
                background:"white",borderRadius:12,marginBottom:6,cursor:"pointer"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#fee2e2",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>😟</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{a.nombre}</div>
                <div style={{fontSize:11,color:"#ef4444",fontWeight:700}}>{a.low_days} días de ánimo bajo</div>
              </div>
              <span style={{color:"#ddd",fontSize:16}}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Accesos rápidos por nivel */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {icon:"🔴",label:"Urgentes",    filter:"urgent",    col:"#ef4444"},
          {icon:"🟠",label:"Prioritarios",filter:"priority",  col:"#f97316"},
          {icon:"🟡",label:"Atención",    filter:"attention", col:"#f59e0b"},
          {icon:"🟢",label:"Normal",      filter:"normal",    col:"#10b981"},
        ].map(({icon,label,filter,col})=>(
          <div key={filter} onClick={()=>onNav("list",filter)}
            style={{background:"white",borderRadius:16,padding:"14px",cursor:"pointer",
              boxShadow:"0 1px 8px rgba(0,0,0,.06)",borderTop:`3px solid ${col}`}}>
            <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
            <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lista de alumnos por riesgo ───────────────────────────────
function StudentList({ filter, onNav, refreshKey }) {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(()=>{
    setLoading(true);
    api.wellnessAdminStudents(filter)
      .then(d=>setStudents(Array.isArray(d)?d:[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[filter, refreshKey]);

  if (loading) return <Loader/>;
  if (!students.length) return <Empty msg={`Sin alumnos con nivel "${filter}"`}/>;

  const groups = filter!=="all"
    ? [{label:RISK_CFG[filter]?.label||filter, list:students}]
    : [
        {label:"🔴 Urgentes",     list:students.filter(s=>s.risk_level==="urgent")},
        {label:"🟠 Prioritarios", list:students.filter(s=>s.risk_level==="priority")},
        {label:"🟡 Atención",     list:students.filter(s=>s.risk_level==="attention")},
        {label:"🟢 Normal",       list:students.filter(s=>s.risk_level==="normal")},
      ].filter(g=>g.list.length);

  return (
    <div style={{padding:"14px 14px 24px"}}>
      {groups.map(group=>(
        <div key={group.label} style={{marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:13,color:"#555",marginBottom:8}}>
            {group.label} ({group.list.length})
          </div>
          {group.list.map(s=><StudentCard key={s.id} s={s} onNav={onNav}/>)}
        </div>
      ))}
    </div>
  );
}

function StudentCard({ s, onNav }) {
  const rc = RISK_CFG[s.risk_level]||RISK_CFG.normal;
  const tr = TREND_CFG[s.trend]||TREND_CFG.stable;
  return (
    <div onClick={()=>onNav("student",s.id)}
      style={{background:"white",borderRadius:16,padding:"12px 14px",
        marginBottom:8,cursor:"pointer",boxShadow:"0 1px 8px rgba(0,0,0,.06)",
        borderLeft:`4px solid ${rc.color}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
          background:s.avatar_bg||"#e0f7fe",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
          {s.last_mood?MOOD_EMOJI[s.last_mood]:"❓"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.nombre}</div>
            {s.unread_reports>0&&(
              <span style={{background:"#ef4444",color:"white",borderRadius:99,
                padding:"1px 6px",fontSize:9,fontWeight:900,flexShrink:0}}>
                {s.unread_reports} rep
              </span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
            <RiskBadge level={s.risk_level}/>
            <span style={{fontSize:11,color:tr.color,fontWeight:700}}>{tr.icon} {tr.label}</span>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontWeight:900,fontSize:16,
            color:s.avg_7d?MOOD_COLOR[Math.round(s.avg_7d)]:"#aaa"}}>
            {s.avg_7d??"—"}
          </div>
          <div style={{fontSize:9,color:"#aaa",fontWeight:700}}>prom 7d</div>
        </div>
      </div>
      {s.high_risk_cats.length>0&&(
        <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
          {s.high_risk_cats.map(c=>(
            <span key={c} style={{background:"#fef2f2",color:"#ef4444",
              borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:700}}>
              ⚠ {CAT_LABEL[c]||c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Perfil detallado de alumno ────────────────────────────────
function StudentDetail({ userId, showToast }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("timeline");
  const [days,    setDays]    = useState(30);

  const load = () => {
    setLoading(true);
    api.wellnessAdminStudentDays(userId, days)
      .then(setData).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load,[userId, days]);

  const markReviewed = async(id) => {
    try {
      await api.wellnessMarkReviewed(id);
      setData(prev=>({...prev,reports:prev.reports.map(r=>r.id===id?{...r,reviewed:true}:r)}));
      showToast("Reporte marcado como revisado");
    } catch(e){ showToast(e.message||"Error","error"); }
  };

  const [copied, setCopied] = useState(false);
  const copyId = () => {
    navigator.clipboard.writeText(data?.student?.id||"").then(()=>{
      setCopied(true); setTimeout(()=>setCopied(false),1500);
    }).catch(()=>{});
  };

  if (loading) return <Loader/>;
  if (!data) return <Empty msg="No se pudo cargar"/>;

  const { student, risk, entries, notes, reports } = data;
  const notesList = notes || [];
  const rc = RISK_CFG[risk.risk_level]||RISK_CFG.normal;
  const tr = TREND_CFG[risk.trend]||TREND_CFG.stable;

  return (
    <div style={{paddingBottom:32}}>
      {/* Cabecera */}
      <div style={{background:"white",padding:"16px 16px 0",
        boxShadow:"0 1px 8px rgba(0,0,0,.06)",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <div style={{width:52,height:52,borderRadius:"50%",flexShrink:0,
            background:student.avatar_bg||"#e0f7fe",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
            {risk.last_mood?MOOD_EMOJI[risk.last_mood]:"❓"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:17,color:"#1a1a1a"}}>{student.nombre}</div>
            <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
              <RiskBadge level={risk.risk_level}/>
              <span style={{fontSize:11,color:tr.color,fontWeight:700}}>{tr.icon} {tr.label}</span>
            </div>
            {/* Copiar ID */}
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:4}}>
              <span style={{fontSize:9,color:"#bbb",fontFamily:"monospace"}}>
                {student.id?.slice(0,16)}…
              </span>
              <button onClick={copyId}
                style={{background:copied?"#10b981":"#f0f0f0",border:"none",borderRadius:6,
                  padding:"2px 7px",fontSize:9,fontWeight:800,cursor:"pointer",
                  color:copied?"white":"#555",fontFamily:"Nunito,sans-serif",
                  transition:"background .2s"}}>
                {copied?"✓ Copiado":"Copiar ID"}
              </button>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontWeight:900,fontSize:22,
              color:risk.avg_7d?MOOD_COLOR[Math.round(risk.avg_7d)]:"#aaa"}}>
              {risk.avg_7d??"—"}
            </div>
            <div style={{fontSize:9,color:"#aaa",fontWeight:700}}>prom 7d</div>
          </div>
        </div>

        {/* Métricas */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:12}}>
          {[
            {val:risk.consecutive_low||0,  label:"días bajos\nconsecut.", col:"#ef4444"},
            {val:risk.total_entries||0,    label:"entradas\n30 días",     col:"#8b5cf6"},
            {val:notesList.length,         label:`notas\n${days}d`,        col:"#06b6d4"},
            {val:risk.unread_reports||0,   label:"reportes\nsin leer",    col:risk.unread_reports?"#ef4444":"#10b981"},
          ].map(({val,label,col})=>(
            <div key={label} style={{textAlign:"center",background:"#fafafa",borderRadius:12,padding:"8px 4px"}}>
              <div style={{fontWeight:900,fontSize:16,color:col}}>{val}</div>
              <div style={{fontSize:9,color:"#aaa",fontWeight:700,lineHeight:1.3,whiteSpace:"pre-line"}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Selector de período */}
        <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
          {[[30,"30d"],[60,"60d"],[120,"120d"],[365,"1a"],[730,"2a"]].map(([v,l])=>(
            <button key={v} onClick={()=>setDays(v)}
              style={{flexShrink:0,border:"none",borderRadius:99,padding:"5px 12px",
                background:days===v?"#8b5cf6":"#f0f0f0",
                color:days===v?"white":"#555",
                fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {l}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #f0f0f0"}}>
          {[
            ["timeline","📅 Timeline"],
            ["notas",   `💬 Notas${notesList.length?` (${notesList.length})`:""`],
            ["cats",    "🏷 Categorías"],
            ["reports", `📬${reports.filter(r=>!r.reviewed).length>0?` (${reports.filter(r=>!r.reviewed).length})`:""}`],
          ].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:1,border:"none",background:"none",cursor:"pointer",
                padding:"10px 2px",fontFamily:"Nunito,sans-serif",
                fontWeight:800,fontSize:11,
                color:tab===id?"#8b5cf6":"#999",
                borderBottom:tab===id?"2px solid #8b5cf6":"2px solid transparent"}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Timeline — entradas de humor (una por día) */}
      {tab==="timeline"&&(
        <div style={{padding:"0 14px"}}>
          {entries.length===0&&<Empty msg="Sin entradas registradas"/>}
          {entries.map((e,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:32,height:32,borderRadius:"50%",
                  background:MOOD_COLOR[e.mood]+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  {MOOD_EMOJI[e.mood]}
                </div>
                {i<entries.length-1&&<div style={{width:1,flex:1,background:"#e8e8e8",margin:"2px 0"}}/>}
              </div>
              <div style={{flex:1,background:"white",borderRadius:14,padding:"10px 12px",
                boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:4}}>
                  <span style={{fontWeight:800,fontSize:13,color:MOOD_COLOR[e.mood]}}>{MOOD_LABEL[e.mood]}</span>
                  <span style={{fontSize:10,color:"#aaa"}}>{e.date}</span>
                </div>
                {(e.categories||[]).length>0&&(
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {e.categories.map(c=>(
                      <span key={c} style={{fontSize:10,fontWeight:700,borderRadius:99,padding:"1px 7px",
                        background:CAT_NEG.has(c)?"#fef2f2":"#f0fdf4",
                        color:CAT_NEG.has(c)?"#ef4444":"#10b981"}}>
                        {CAT_LABEL[c]||c}
                      </span>
                    ))}
                  </div>
                )}
                {e.has_nota&&(
                  <div style={{fontSize:10,color:"#8b5cf6",marginTop:4,fontWeight:700}}>
                    💬 Tiene nota — ver en tab "Notas"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Notas — historial completo de notas (últimos 20 días) */}
      {tab==="notas"&&(
        <div style={{padding:"0 14px"}}>
          {notesList.length===0&&<Empty msg={`Sin notas en los últimos ${days} días`}/>}
          <div style={{fontSize:11,color:"#aaa",fontWeight:700,marginBottom:10,textAlign:"center"}}>
            Últimos {days} días · {notesList.length} nota{notesList.length!==1?"s":""}
          </div>
          {notesList.map((n,i)=>(
            <div key={n.id||i} style={{marginBottom:10}}>
              {/* Separador de fecha si cambia */}
              {(i===0 || notesList[i-1].date!==n.date) && (
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{flex:1,height:1,background:"#f0f0f0"}}/>
                  <span style={{fontSize:10,fontWeight:800,color:"#aaa"}}>{n.date}</span>
                  <div style={{flex:1,height:1,background:"#f0f0f0"}}/>
                </div>
              )}
              <div style={{background:"white",borderRadius:14,padding:"10px 12px",
                boxShadow:"0 1px 4px rgba(0,0,0,.04)",
                borderLeft:`3px solid ${n.mood?MOOD_COLOR[n.mood]:"#8b5cf6"}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:16}}>{n.mood?MOOD_EMOJI[n.mood]:"💬"}</span>
                  {n.mood&&<span style={{fontSize:11,fontWeight:700,color:MOOD_COLOR[n.mood]}}>{MOOD_LABEL[n.mood]}</span>}
                  {(n.categories||[]).filter(c=>CAT_NEG.has(c)).map(c=>(
                    <span key={c} style={{fontSize:9,fontWeight:800,color:"#ef4444",
                      background:"#fef2f2",borderRadius:99,padding:"1px 5px"}}>
                      ⚠ {CAT_LABEL[c]||c}
                    </span>
                  ))}
                  <span style={{fontSize:10,color:"#bbb",marginLeft:"auto"}}>{n.time}</span>
                </div>
                {n.nota ? (
                  <div style={{fontSize:13,color:"#333",lineHeight:1.6,fontStyle:"italic"}}>
                    "{n.nota}"
                  </div>
                ) : (
                  <div style={{fontSize:11,color:"#aaa",fontStyle:"italic"}}>
                    🔒 Nota privada — activá "Notas visibles" en Configuración
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Categorías */}
      {tab==="cats"&&(
        <div style={{padding:"0 14px"}}>
          {risk.top_cats.length===0&&<Empty msg="Sin categorías registradas"/>}
          {risk.top_cats.map(({id,cnt})=>{
            const neg = CAT_NEG.has(id);
            return(
              <div key={id} style={{background:"white",borderRadius:14,padding:"12px 14px",
                marginBottom:8,borderLeft:`4px solid ${neg?"#ef4444":"#10b981"}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{CAT_LABEL[id]||id}</div>
                    <div style={{fontSize:11,color:neg?"#ef4444":"#10b981",fontWeight:700}}>
                      {neg?"⚠ Señal de alerta":"✓ Señal positiva"}
                    </div>
                  </div>
                  <div style={{fontWeight:900,fontSize:22,color:neg?"#ef4444":"#10b981"}}>{cnt}×</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Reportes */}
      {tab==="reports"&&(
        <div style={{padding:"0 14px"}}>
          {reports.length===0&&<Empty msg="Sin reportes de este alumno"/>}
          {reports.map(r=>(
            <div key={r.id} style={{background:r.reviewed?"white":"#fffbeb",
              borderRadius:14,padding:"12px 14px",marginBottom:8,
              border:r.reviewed?"1px solid #f0f0f0":"1.5px solid #f59e0b",
              boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:6}}>
                <span style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>
                  {TIPO_LABEL[r.tipo]||r.tipo}
                </span>
                {r.reviewed
                  ?<span style={{fontSize:10,color:"#10b981",fontWeight:800}}>✓ Revisado</span>
                  :<span style={{fontSize:10,color:"#f59e0b",fontWeight:800}}>● Sin revisar</span>}
              </div>
              <div style={{fontSize:12,color:"#444",lineHeight:1.5,
                background:"#fafafa",borderRadius:8,padding:"8px 10px",marginBottom:8}}>
                {r.descripcion}
                {r.is_anonymous&&<div style={{fontSize:10,color:"#aaa",marginTop:4}}>🔒 Anónimo</div>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:"#aaa"}}>
                  {new Date(r.created_at).toLocaleDateString("es-AR")}
                </span>
                {!r.reviewed&&(
                  <button onClick={()=>markReviewed(r.id)}
                    style={{background:"#10b981",border:"none",borderRadius:99,
                      color:"white",padding:"5px 14px",fontSize:11,
                      fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    Marcar revisado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reportes globales ─────────────────────────────────────────
function GlobalReports({ showToast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("pending");

  useEffect(()=>{
    api.wellnessReports()
      .then(d=>setReports(Array.isArray(d)?d:[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  const markReviewed = async(id) => {
    try {
      await api.wellnessMarkReviewed(id);
      setReports(prev=>prev.map(r=>r.id===id?{...r,reviewed:true}:r));
      showToast("Reporte marcado como revisado");
    } catch(e){ showToast(e.message||"Error","error"); }
  };

  const filtered = reports.filter(r=>filter==="pending"?!r.reviewed:r.reviewed);

  if (loading) return <Loader/>;

  return (
    <div style={{padding:"14px 14px 24px"}}>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["pending","⏳ Pendientes"],["reviewed","✓ Revisados"]].map(([f,l])=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{flex:1,border:"none",borderRadius:99,padding:"8px",
              background:filter===f?"#8b5cf6":"#f0f0f0",
              color:filter===f?"white":"#555",
              fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            {l} ({reports.filter(r=>f==="pending"?!r.reviewed:r.reviewed).length})
          </button>
        ))}
      </div>
      {filtered.length===0&&<Empty msg={filter==="pending"?"Sin reportes pendientes":"Sin reportes revisados"}/>}
      {filtered.map(r=>(
        <div key={r.id} style={{background:r.reviewed?"white":"#fffbeb",
          borderRadius:16,padding:"14px 16px",marginBottom:10,
          border:r.reviewed?"1px solid #f0f0f0":"1.5px solid #f59e0b",
          boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"flex-start",marginBottom:6}}>
            <div>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>
                {TIPO_LABEL[r.tipo]||r.tipo}
              </div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>
                {r.is_anonymous?"🔒 Anónimo":`👤 ${r.nombre||"Sin nombre"}`}
                {" · "}{new Date(r.created_at).toLocaleDateString("es-AR")}
              </div>
            </div>
            {r.reviewed
              ?<span style={{background:"#f0fdf4",color:"#10b981",borderRadius:99,
                  padding:"3px 8px",fontSize:10,fontWeight:800,flexShrink:0}}>✓ Revisado</span>
              :<span style={{background:"#fef3c7",color:"#d97706",borderRadius:99,
                  padding:"3px 8px",fontSize:10,fontWeight:800,flexShrink:0}}>Sin revisar</span>
            }
          </div>
          <div style={{fontSize:13,color:"#444",lineHeight:1.6,
            background:"#fafafa",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            {r.descripcion}
          </div>
          {!r.reviewed&&(
            <button onClick={()=>markReviewed(r.id)}
              style={{background:"#10b981",border:"none",borderRadius:99,
                color:"white",padding:"7px 18px",fontSize:12,
                fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              Marcar como revisado ✓
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Configuración del algoritmo ───────────────────────────────
function WellnessConfig({ showToast, onSaved }) {
  const [cfg,     setCfg]     = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.wellnessAdminConfig().then(setCfg).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const save = async() => {
    setSaving(true);
    try {
      const updated = await api.wellnessAdminConfigUpdate(cfg);
      setCfg(updated);
      showToast("Configuración guardada ✓");
      if (onSaved) onSaved();
    } catch(e){ showToast(e.message||"Error","error"); }
    finally{ setSaving(false); }
  };

  const setW = (key,val) => setCfg(c=>({...c,weights:{...c.weights,[key]:parseInt(val)||0}}));
  const setL = (key,val) => setCfg(c=>({...c,risk_levels:{...c.risk_levels,[key]:parseInt(val)||0}}));

  if (loading||!cfg) return <Loader/>;

  return (
    <div style={{padding:"14px 14px 40px"}}>
      <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:14,
        padding:"10px 14px",marginBottom:16,fontSize:12,color:"#92400e"}}>
        ⚙️ Estos parámetros controlan cómo el algoritmo clasifica el riesgo.
        Al guardar, la lista Smart se recalcula automáticamente con los nuevos valores.
      </div>

      <Section title="Umbral de ánimo bajo">
        <div style={{fontSize:12,color:"#555",marginBottom:8}}>
          Ánimo ≤ este valor se considera "bajo" (afecta todos los cálculos)
        </div>
        <div style={{display:"flex",gap:6}}>
          {[1,2,3,4].map(v=>(
            <button key={v} onClick={()=>setCfg(c=>({...c,low_mood_threshold:v}))}
              style={{flex:1,border:"none",borderRadius:10,padding:"10px 0",
                background:cfg.low_mood_threshold===v?MOOD_COLOR[v]+"33":"#f0f0f0",
                color:cfg.low_mood_threshold===v?MOOD_COLOR[v]:"#555",
                fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                outline:cfg.low_mood_threshold===v?`2px solid ${MOOD_COLOR[v]}`:"none"}}>
              {MOOD_EMOJI[v]} {v}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Puntajes mínimos por nivel">
        <div style={{fontSize:12,color:"#555",marginBottom:10}}>
          Desde qué puntaje se clasifica cada nivel de riesgo
        </div>
        {[
          ["attention","🟡 Atención"],
          ["priority", "🟠 Prioritario"],
          ["urgent",   "🔴 Urgente"],
        ].map(([key,label])=>(
          <NumRow key={key} label={label} val={cfg.risk_levels[key]} onChange={v=>setL(key,v)}/>
        ))}
      </Section>

      <Section title="Pesos del algoritmo">
        <div style={{fontSize:12,color:"#555",marginBottom:10}}>
          Cuántos puntos suma cada factor de riesgo al puntaje final
        </div>
        {[
          ["low_avg_7d",      "📉 Promedio bajo últimos 7 días",   "Máx. de este valor si el promedio es muy bajo"],
          ["consecutive_low", "🔁 Por cada día consecutivo bajo",  "Se multiplica por cantidad de días"],
          ["consecutive_cap", "🔝 Tope acumulable por días seguidos","Límite máximo de este factor"],
          ["unread_report",   "📬 Por reporte formal sin revisar",  "Cada reporte no revisado suma este valor"],
          ["high_risk_cat",   "⚠ Por categoría de alto riesgo",   "Por cada categoría (miedo, soledad, presión...)"],
          ["sudden_drop",     "📉 Caída repentina de ánimo",       "Si cayó ≥2 puntos vs semana anterior"],
          ["no_data",         "❓ Sin datos en 7+ días",           "Si no registró nada en una semana"],
        ].map(([key,label,hint])=>(
          <NumRow key={key} label={label} hint={hint} val={cfg.weights[key]} onChange={v=>setW(key,v)}/>
        ))}
      </Section>

      <Section title="Categorías de alto riesgo">
        <div style={{fontSize:12,color:"#555",marginBottom:10}}>
          Cuáles se consideran señal de alerta (suman puntos al puntaje de riesgo)
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {["miedo","soledad","presion","tristeza","enojo","cansancio"].map(c=>{
            const active=(cfg.high_risk_categories||[]).includes(c);
            return(
              <button key={c} onClick={()=>setCfg(prev=>({
                ...prev,
                high_risk_categories:active
                  ?(prev.high_risk_categories||[]).filter(x=>x!==c)
                  :[...(prev.high_risk_categories||[]),c]
              }))}
                style={{border:"none",borderRadius:99,padding:"6px 14px",
                  fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                  background:active?"#fef2f2":"#f0f0f0",color:active?"#ef4444":"#555",
                  outline:active?"1.5px solid #ef4444":"none"}}>
                {CAT_LABEL[c]||c}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Privacidad de notas">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setCfg(c=>({...c,show_notas:!c.show_notas}))}
            style={{width:46,height:26,borderRadius:99,border:"none",cursor:"pointer",
              padding:0,position:"relative",flexShrink:0,
              background:cfg.show_notas?"#8b5cf6":"#ddd",transition:"background .2s"}}>
            <span style={{position:"absolute",top:3,
              left:cfg.show_notas?"calc(100% - 23px)":3,
              width:20,height:20,borderRadius:"50%",
              background:"white",transition:"left .2s"}}/>
          </button>
          <div>
            <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>
              {cfg.show_notas?"Notas visibles para el equipo":"Notas ocultas"}
            </div>
            <div style={{fontSize:11,color:"#aaa"}}>
              {cfg.show_notas
                ?"El equipo puede leer el texto libre de los alumnos en Explorar y Timeline"
                :"Solo se indica que existe una nota, no su contenido"}
            </div>
          </div>
        </div>
      </Section>

      <button onClick={save} disabled={saving}
        style={{width:"100%",background:saving?"#ccc":"#8b5cf6",border:"none",
          borderRadius:99,color:"white",padding:"14px",
          fontWeight:800,fontSize:15,cursor:saving?"not-allowed":"pointer",
          fontFamily:"Nunito,sans-serif"}}>
        {saving?"Guardando...":"Guardar configuración ✓"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECCIÓN: BACKUPS — cifrados con AES-256-GCM
// ══════════════════════════════════════════════════════════════
function BackupsView({ showToast }) {
  const [backups,     setBackups]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [days,        setDays]        = useState(30);
  const [deleting,    setDeleting]    = useState(null);
  const [downloading, setDownloading] = useState(null);

  const load = () => {
    setLoading(true);
    api.wellnessAdminBackups()
      .then(d => setBackups(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    setCreating(true);
    try {
      await api.wellnessAdminBackupCreate(days);
      showToast("Backup generado ✓");
      load();
    } catch(e) { showToast(e.message||"Error","error"); }
    finally { setCreating(false); }
  };

  const del = async (id) => {
    setDeleting(id);
    try {
      await api.wellnessAdminBackupDelete(id);
      setBackups(b => b.filter(x => x.id !== id));
      showToast("Backup eliminado");
    } catch(e) { showToast(e.message||"Error","error"); }
    finally { setDeleting(null); }
  };

  const download = async (id) => {
    setDownloading(id);
    try {
      const url = api.wellnessAdminBackupDownload(id);
      const token = localStorage.getItem("ec_token");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Error al descargar");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `wellness_backup_${id.slice(0,8)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch(e) { showToast(e.message||"Error al descargar","error"); }
    finally { setDownloading(null); }
  };

  return (
    <div style={{padding:"14px 14px 40px"}}>
      <div style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:14,
        padding:"10px 14px",marginBottom:16,fontSize:12,color:"#0369a1"}}>
        💾 Los backups se generan automáticamente cada 14 días y se cifran con AES-256-GCM.
        Podés generar uno manual en cualquier momento. Se conservan los últimos 10.
      </div>

      {/* Generar backup manual */}
      <div style={{background:"white",borderRadius:16,padding:"14px 16px",
        marginBottom:14,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
        <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>
          🆕 Generar backup manual
        </div>
        <div style={{fontSize:11,color:"#555",marginBottom:8}}>Período de datos a incluir:</div>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          {[[30,"30 días"],[60,"60 días"],[120,"120 días"],[365,"1 año"],[730,"2 años"]].map(([v,l])=>(
            <button key={v} onClick={()=>setDays(v)}
              style={{border:"none",borderRadius:99,padding:"6px 14px",
                background:days===v?"#8b5cf6":"#f0f0f0",
                color:days===v?"white":"#555",
                fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={create} disabled={creating}
          style={{width:"100%",background:creating?"#ccc":"#8b5cf6",border:"none",
            borderRadius:99,color:"white",padding:"10px",fontSize:12,fontWeight:800,
            cursor:creating?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
          {creating?"Generando...":"Generar backup ahora"}
        </button>
      </div>

      {/* Lista */}
      <div style={{fontWeight:800,fontSize:13,color:"#555",marginBottom:8}}>
        Backups guardados ({backups.length})
      </div>
      {loading && <Loader/>}
      {!loading && backups.length===0 && <Empty msg="No hay backups guardados aún"/>}
      {!loading && backups.map(b=>(
        <div key={b.id} style={{background:"white",borderRadius:14,padding:"12px 14px",
          marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:22,flexShrink:0}}>💾</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>
                {b.period_days} días de datos
              </div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>
                {new Date(b.created_at).toLocaleString("es-AR")}
                {" · "}{b.record_count ?? "?"} registros
                {b.size_bytes ? ` · ${(b.size_bytes/1024).toFixed(1)} KB` : ""}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>download(b.id)} disabled={!!downloading}
                style={{background:"#e0f2fe",border:"none",borderRadius:10,
                  padding:"7px 12px",fontSize:13,fontWeight:800,
                  color:downloading===b.id?"#aaa":"#0369a1",
                  cursor:downloading?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                {downloading===b.id?"⏳":"⬇"}
              </button>
              <button onClick={()=>del(b.id)} disabled={!!deleting}
                style={{background:"#fef2f2",border:"none",borderRadius:10,
                  padding:"7px 12px",fontSize:13,fontWeight:800,
                  color:deleting===b.id?"#aaa":"#ef4444",
                  cursor:deleting?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                {deleting===b.id?"⏳":"🗑"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RAÍZ — AdminPsicologia
// ══════════════════════════════════════════════════════════════
function AdminPsicologia({ showToast, onBack }) {
  const [mainTab,    setMainTab]    = useState("smart");   // "smart" | "explorar"
  const [smartView,  setSmartView]  = useState("dashboard"); // dashboard|list|student|reports|config
  const [smartFilter,setSmartFilter]= useState("all");
  const [stuId,      setStuId]      = useState(null);
  const [refreshTick,setRefreshTick]= useState(0);  // socket mood updates
  const [configKey,  setConfigKey]  = useState(0);  // re-fetch lista tras guardar config

  // Socket: escuchar wellness_update → refrescar dashboard
  useEffect(()=>{
    const token = localStorage.getItem("ec_token");
    if (!token) return;
    const s = connectSocket(token);
    const handler = () => setRefreshTick(t=>t+1);
    s.on("wellness_update", handler);
    return () => s.off("wellness_update", handler);
  },[]);

  // Navegación interna Smart
  const navSmart = (view, param) => {
    if (view==="list")    { setSmartFilter(param||"all"); setSmartView("list"); }
    else if (view==="student") { setStuId(param); setSmartView("student"); }
    else setSmartView(view);
  };

  const goBack = () => {
    if (smartView==="student") setSmartView("list");
    else if (["list","reports","config","backups"].includes(smartView)) setSmartView("dashboard");
    else onBack();
  };

  const SMART_TITLES = {
    dashboard:"Dashboard",list:"Alumnos",student:"Perfil",reports:"Reportes",config:"Configuración",backups:"Backups"
  };

  const showingSmartDetail = mainTab==="smart" && smartView!=="dashboard";

  return (
    <div style={{minHeight:"100vh",background:"#F0F0F0",fontFamily:"Nunito,sans-serif"}}>

      {/* Header */}
      <div style={{background:"#8b5cf6",color:"white",
        padding:"22px 16px 0",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <button onClick={showingSmartDetail?goBack:onBack}
            style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
              color:"white",width:34,height:34,cursor:"pointer",fontSize:18,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,fontWeight:900,fontSize:18}}>
            🧠 Psicología
            {showingSmartDetail && <span style={{fontSize:13,opacity:.8,fontWeight:700}}>
              {" · "}{SMART_TITLES[smartView]}
            </span>}
          </div>
          {mainTab==="smart"&&smartView==="dashboard"&&(
            <div style={{display:"flex",gap:6}}>
              <IconBtn icon="💾" onClick={()=>navSmart("backups")} title="Backups"/>
              <IconBtn icon="📬" onClick={()=>navSmart("reports")} title="Reportes"/>
              <IconBtn icon="⚙️" onClick={()=>navSmart("config")}  title="Configurar"/>
            </div>
          )}
          {mainTab==="smart"&&smartView==="list"&&(
            <div style={{display:"flex",gap:4}}>
              {["all","urgent","priority","attention","normal"].map(f=>(
                <button key={f} onClick={()=>setSmartFilter(f)}
                  style={{border:"none",borderRadius:99,padding:"3px 8px",cursor:"pointer",
                    fontFamily:"Nunito,sans-serif",fontSize:10,fontWeight:800,
                    background:smartFilter===f?"rgba(255,255,255,.35)":"rgba(255,255,255,.12)",
                    color:"white"}}>
                  {f==="all"?"Todos":RISK_CFG[f]?.icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main tabs: Smart | Explorar */}
        <div style={{display:"flex",borderBottom:"none"}}>
          {[["smart","⚡ Smart"],["explorar","🔍 Explorar"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setMainTab(id)}
              style={{flex:1,border:"none",background:"none",cursor:"pointer",
                padding:"10px 4px",fontFamily:"Nunito,sans-serif",
                fontWeight:900,fontSize:13,color:"white",
                opacity:mainTab===id?1:.6,
                borderBottom:mainTab===id?"3px solid white":"3px solid transparent"}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {mainTab==="explorar" && (
        <ExplorarView refreshTick={refreshTick}/>
      )}

      {mainTab==="smart" && (
        <>
          {smartView==="dashboard" && (
            <SmartDashboard onNav={navSmart} refreshTick={refreshTick}/>
          )}
          {smartView==="list" && (
            <StudentList filter={smartFilter} onNav={navSmart} refreshKey={configKey}/>
          )}
          {smartView==="student" && (
            <StudentDetail userId={stuId} showToast={showToast}/>
          )}
          {smartView==="reports" && (
            <GlobalReports showToast={showToast}/>
          )}
          {smartView==="config" && (
            <WellnessConfig showToast={showToast} onSaved={()=>{
              setConfigKey(k=>k+1);      // re-fetch lista Smart
              setSmartView("dashboard"); // volver al dashboard
            }}/>
          )}
          {smartView==="backups" && (
            <BackupsView showToast={showToast}/>
          )}
        </>
      )}
    </div>
  );
}

export default AdminPsicologia;
