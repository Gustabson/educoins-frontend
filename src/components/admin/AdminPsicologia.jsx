import { useState, useEffect } from "react";
import { api } from "../../api";

const RISK_CFG = {
  normal:    { color:"#10b981", bg:"#f0fdf4", label:"Normal",    icon:"🟢" },
  attention: { color:"#f59e0b", bg:"#fffbeb", label:"Atención",  icon:"🟡" },
  priority:  { color:"#f97316", bg:"#fff7ed", label:"Prioritario",icon:"🟠" },
  urgent:    { color:"#ef4444", bg:"#fef2f2", label:"Urgente",   icon:"🔴" },
};

const MOOD_LABEL = { 1:"Muy mal", 2:"Mal", 3:"Regular", 4:"Bien", 5:"Muy bien" };
const MOOD_COLOR = { 1:"#ef4444", 2:"#f97316", 3:"#eab308", 4:"#22c55e", 5:"#06b6d4" };
const MOOD_EMOJI = { 1:"😞", 2:"😟", 3:"😐", 4:"😊", 5:"😄" };

const CAT_LABEL = {
  presion:"Presionado/a", tristeza:"Triste", enojo:"Enojado/a",
  miedo:"Miedo", cansancio:"Agotado/a", soledad:"Solo/a",
  logro:"Logré algo", apoyo:"Me ayudaron", alegria:"Algo genial",
  querido:"Me sentí querido/a", orgulloso:"Orgulloso/a", energia:"Mucha energía",
};

const TIPO_LABEL = {
  bullying:"🚫 Bullying", violencia_domestica:"🏠 Problema en casa",
  maltrato_docente:"👨‍🏫 Maltrato de adulto", acoso:"😰 Acoso/Amenazas", otro:"💬 Otro",
};

const TREND_CFG = {
  improving: { icon:"↗", color:"#10b981", label:"Mejorando" },
  stable:    { icon:"→", color:"#64748b", label:"Estable"   },
  declining: { icon:"↘", color:"#ef4444", label:"Empeorando"},
};

function RiskBadge({ level }) {
  const c = RISK_CFG[level] || RISK_CFG.normal;
  return (
    <span style={{ background:c.bg, color:c.color, borderRadius:99,
      padding:"3px 10px", fontSize:11, fontWeight:800 }}>
      {c.icon} {c.label}
    </span>
  );
}

function MoodBar({ dist, total }) {
  if (!total) return null;
  return (
    <div style={{ display:"flex", height:8, borderRadius:99, overflow:"hidden", gap:1 }}>
      {[1,2,3,4,5].map(m => {
        const cnt = dist.find(d=>d.mood===m)?.cnt || 0;
        if (!cnt) return null;
        return (
          <div key={m} style={{ flex:cnt, background:MOOD_COLOR[m], minWidth:2 }}
               title={`${MOOD_LABEL[m]}: ${cnt}`}/>
        );
      })}
    </div>
  );
}

// ── Vista dashboard ──────────────────────────────────────────
function Dashboard({ onNav }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.wellnessAdminDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader/>;
  if (!data) return <Err msg="No se pudo cargar el dashboard"/>;

  const moodTotal = data.mood_dist.reduce((s,d)=>s+d.cnt,0);
  const pct = n => data.total_students ? Math.round(n/data.total_students*100) : 0;

  return (
    <div style={{ padding:"14px 14px 24px" }}>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        {[
          { icon:"🧠", val:`${data.checked_today} / ${data.total_students}`,
            sub:`${pct(data.checked_today)}% reportó hoy`, col:"#8b5cf6" },
          { icon:"📊", val: data.avg_mood_today ? `${data.avg_mood_today} / 5` : "Sin datos",
            sub:"Ánimo promedio hoy", col: data.avg_mood_today
              ? MOOD_COLOR[Math.round(data.avg_mood_today)] : "#aaa" },
          { icon:"📬", val: data.unread_reports,
            sub:"Reportes sin revisar", col: data.unread_reports > 0 ? "#ef4444" : "#10b981" },
          { icon:"⚠️", val: data.recent_alerts.length,
            sub:"Alumnos 3+ días bajo ánimo", col: data.recent_alerts.length ? "#f97316" : "#10b981" },
        ].map(s => (
          <div key={s.sub} style={{ background:"white", borderRadius:18, padding:"14px",
            boxShadow:"0 1px 8px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontWeight:900, fontSize:18, color:s.col }}>{s.val}</div>
            <div style={{ fontSize:10, color:"#aaa", fontWeight:700, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Distribución de ánimo hoy */}
      {moodTotal > 0 && (
        <div style={{ background:"white", borderRadius:18, padding:"14px 16px",
          marginBottom:12, boxShadow:"0 1px 8px rgba(0,0,0,.06)" }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a", marginBottom:10 }}>
            😐 Distribución de ánimo hoy
          </div>
          <MoodBar dist={data.mood_dist} total={moodTotal}/>
          <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
            {[1,2,3,4,5].map(m => {
              const cnt = data.mood_dist.find(d=>d.mood===m)?.cnt || 0;
              if (!cnt) return null;
              return (
                <span key={m} style={{ fontSize:11, fontWeight:700,
                  color:MOOD_COLOR[m], background:MOOD_COLOR[m]+"18",
                  borderRadius:99, padding:"2px 8px" }}>
                  {MOOD_EMOJI[m]} {cnt}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Top categorías */}
      {data.top_categories.length > 0 && (
        <div style={{ background:"white", borderRadius:18, padding:"14px 16px",
          marginBottom:12, boxShadow:"0 1px 8px rgba(0,0,0,.06)" }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a", marginBottom:10 }}>
            🏷 Categorías más frecuentes (últimos 7 días)
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {data.top_categories.map(({ cat, cnt }) => (
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#555", width:140, flexShrink:0 }}>
                  {CAT_LABEL[cat] || cat}
                </div>
                <div style={{ flex:1, background:"#f0f0f0", borderRadius:99, height:8 }}>
                  <div style={{ width:`${Math.min(100,cnt/data.checked_today*100)}%`,
                    background: ["miedo","soledad","presion","tristeza"].includes(cat)
                      ? "#ef4444" : "#8b5cf6",
                    height:"100%", borderRadius:99, minWidth:6 }}/>
                </div>
                <div style={{ fontSize:11, fontWeight:800, color:"#666", width:24, textAlign:"right" }}>
                  {cnt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas recientes */}
      {data.recent_alerts.length > 0 && (
        <div style={{ background:"#fef2f2", borderRadius:18, padding:"14px 16px",
          marginBottom:12, border:"1.5px solid #fecaca" }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#dc2626", marginBottom:8 }}>
            🚨 Alumnos con 3+ días de ánimo bajo (últimos 7 días)
          </div>
          {data.recent_alerts.map(a => (
            <div key={a.id} onClick={() => onNav("student", a.id)}
              style={{ display:"flex", alignItems:"center", gap:8,
                padding:"8px 10px", background:"white", borderRadius:12,
                marginBottom:6, cursor:"pointer" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#fee2e2",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                😟
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>{a.nombre}</div>
                <div style={{ fontSize:11, color:"#ef4444", fontWeight:700 }}>
                  {a.low_days} días de ánimo bajo
                </div>
              </div>
              <span style={{ color:"#ddd", fontSize:16 }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Accesos rápidos */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { icon:"🔴", label:"Urgentes", filter:"urgent",    col:"#ef4444" },
          { icon:"🟠", label:"Prioritarios", filter:"priority",  col:"#f97316" },
          { icon:"🟡", label:"Atención",  filter:"attention", col:"#f59e0b" },
          { icon:"📬", label:"Reportes",  filter:"reports",   col:"#8b5cf6" },
        ].map(({ icon, label, filter, col }) => (
          <div key={filter} onClick={() => onNav("list", filter)}
            style={{ background:"white", borderRadius:16, padding:"14px",
              cursor:"pointer", boxShadow:"0 1px 8px rgba(0,0,0,.06)",
              borderTop:`3px solid ${col}` }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
            <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lista de alumnos por nivel de riesgo ─────────────────────
function StudentList({ filter, onNav }) {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    api.wellnessAdminStudents(filter)
      .then(d => setStudents(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <Loader/>;

  const urgent    = students.filter(s=>s.risk_level==="urgent");
  const priority  = students.filter(s=>s.risk_level==="priority");
  const attention = students.filter(s=>s.risk_level==="attention");
  const normal    = students.filter(s=>s.risk_level==="normal");

  const groups = filter !== "all"
    ? [{ label: RISK_CFG[filter]?.label || filter, list: students }]
    : [
        { label:"🔴 Urgentes",     list: urgent    },
        { label:"🟠 Prioritarios", list: priority  },
        { label:"🟡 Atención",     list: attention },
        { label:"🟢 Normal",       list: normal    },
      ].filter(g => g.list.length);

  if (!students.length)
    return <Err msg={`No hay alumnos con nivel "${filter}"`}/>;

  return (
    <div style={{ padding:"14px 14px 24px" }}>
      {groups.map(group => (
        <div key={group.label} style={{ marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#555", marginBottom:8 }}>
            {group.label} ({group.list.length})
          </div>
          {group.list.map(s => <StudentCard key={s.id} s={s} onNav={onNav}/>)}
        </div>
      ))}
    </div>
  );
}

function StudentCard({ s, onNav }) {
  const rc = RISK_CFG[s.risk_level] || RISK_CFG.normal;
  const tr = TREND_CFG[s.trend] || TREND_CFG.stable;

  return (
    <div onClick={() => onNav("student", s.id)}
      style={{ background:"white", borderRadius:16, padding:"12px 14px",
        marginBottom:8, cursor:"pointer", boxShadow:"0 1px 8px rgba(0,0,0,.06)",
        borderLeft:`4px solid ${rc.color}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:38, height:38, borderRadius:"50%",
          background: s.avatar_bg || "#e0f7fe",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
          {s.last_mood ? MOOD_EMOJI[s.last_mood] : "❓"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1a1a1a",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {s.nombre}
            </div>
            {s.unread_reports > 0 && (
              <span style={{ background:"#ef4444", color:"white", borderRadius:99,
                padding:"1px 6px", fontSize:9, fontWeight:900, flexShrink:0 }}>
                {s.unread_reports} rep
              </span>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
            <RiskBadge level={s.risk_level}/>
            <span style={{ fontSize:11, color:tr.color, fontWeight:700 }}>
              {tr.icon} {tr.label}
            </span>
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:16,
            color: s.avg_7d ? MOOD_COLOR[Math.round(s.avg_7d)] : "#aaa" }}>
            {s.avg_7d ?? "—"}
          </div>
          <div style={{ fontSize:9, color:"#aaa", fontWeight:700 }}>prom 7d</div>
        </div>
      </div>
      {s.high_risk_cats.length > 0 && (
        <div style={{ marginTop:6, display:"flex", gap:4, flexWrap:"wrap" }}>
          {s.high_risk_cats.map(c => (
            <span key={c} style={{ background:"#fef2f2", color:"#ef4444",
              borderRadius:99, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
              ⚠ {CAT_LABEL[c]||c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Perfil detallado de un alumno ────────────────────────────
function StudentDetail({ userId, onBack, showToast }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("timeline");

  const load = () => {
    setLoading(true);
    api.wellnessAdminStudent(userId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [userId]);

  const markReviewed = async (id) => {
    try {
      await api.wellnessMarkReviewed(id);
      setData(prev => ({
        ...prev,
        reports: prev.reports.map(r => r.id===id ? {...r, reviewed:true} : r),
      }));
      showToast("Reporte marcado como revisado");
    } catch(e) { showToast(e.message||"Error","error"); }
  };

  if (loading) return <Loader/>;
  if (!data) return <Err msg="No se pudo cargar el alumno"/>;

  const { student, risk, entries, reports } = data;
  const rc = RISK_CFG[risk.risk_level] || RISK_CFG.normal;
  const tr = TREND_CFG[risk.trend] || TREND_CFG.stable;

  return (
    <div style={{ paddingBottom:32 }}>
      {/* Cabecera alumno */}
      <div style={{ background:"white", padding:"16px 16px 0",
        boxShadow:"0 1px 8px rgba(0,0,0,.06)", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ width:52, height:52, borderRadius:"50%",
            background: student.avatar_bg || "#e0f7fe",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
            {risk.last_mood ? MOOD_EMOJI[risk.last_mood] : "❓"}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:17, color:"#1a1a1a" }}>{student.nombre}</div>
            <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
              <RiskBadge level={risk.risk_level}/>
              <span style={{ fontSize:11, color:tr.color, fontWeight:700 }}>
                {tr.icon} {tr.label}
              </span>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontWeight:900, fontSize:22,
              color: risk.avg_7d ? MOOD_COLOR[Math.round(risk.avg_7d)] : "#aaa" }}>
              {risk.avg_7d ?? "—"}
            </div>
            <div style={{ fontSize:9, color:"#aaa", fontWeight:700 }}>prom 7d</div>
          </div>
        </div>

        {/* Stats rápidos */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4, marginBottom:12 }}>
          {[
            { val: risk.consecutive_low || 0, label:"días bajos\nconsecut.", col:"#ef4444" },
            { val: risk.total_entries   || 0, label:"entradas\n30 días", col:"#8b5cf6" },
            { val: risk.unread_reports  || 0, label:"reportes\nsin leer", col: risk.unread_reports ? "#ef4444":"#10b981" },
            { val: risk.risk_score      || 0, label:"puntaje\nriesgo", col:rc.color },
          ].map(({ val, label, col }) => (
            <div key={label} style={{ textAlign:"center", background:"#fafafa",
              borderRadius:12, padding:"8px 4px" }}>
              <div style={{ fontWeight:900, fontSize:16, color:col }}>{val}</div>
              <div style={{ fontSize:9, color:"#aaa", fontWeight:700, lineHeight:1.3,
                whiteSpace:"pre-line" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #f0f0f0" }}>
          {[["timeline","📅 Timeline"],["cats","🏷 Categorías"],["reports","📬 Reportes"]].map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, border:"none", background:"none", cursor:"pointer",
                padding:"10px 4px", fontFamily:"Nunito,sans-serif",
                fontWeight:800, fontSize:12,
                color: tab===id ? "#8b5cf6" : "#999",
                borderBottom: tab===id ? "2px solid #8b5cf6" : "2px solid transparent" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Timeline */}
      {tab==="timeline" && (
        <div style={{ padding:"0 14px" }}>
          {entries.length === 0 && <Err msg="Sin entradas registradas"/>}
          {entries.map((e, i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ width:32, height:32, borderRadius:"50%",
                  background: MOOD_COLOR[e.mood]+"22",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                  {MOOD_EMOJI[e.mood]}
                </div>
                {i < entries.length-1 && (
                  <div style={{ width:1, flex:1, background:"#e8e8e8", margin:"2px 0" }}/>
                )}
              </div>
              <div style={{ flex:1, background:"white", borderRadius:14,
                padding:"10px 12px", marginBottom:0, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontWeight:800, fontSize:13,
                    color:MOOD_COLOR[e.mood] }}>{MOOD_LABEL[e.mood]}</span>
                  <span style={{ fontSize:10, color:"#aaa" }}>{e.date}</span>
                </div>
                {e.categories?.length > 0 && (
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:4 }}>
                    {e.categories.map(c => (
                      <span key={c} style={{ fontSize:10, fontWeight:700,
                        background: ["miedo","soledad","presion","tristeza","enojo"].includes(c)
                          ? "#fef2f2":"#f0fdf4",
                        color: ["miedo","soledad","presion","tristeza","enojo"].includes(c)
                          ? "#ef4444":"#10b981",
                        borderRadius:99, padding:"1px 7px" }}>
                        {CAT_LABEL[c]||c}
                      </span>
                    ))}
                  </div>
                )}
                {e.nota && (
                  <div style={{ fontSize:12, color:"#444", fontStyle:"italic",
                    background:"#fafafa", borderRadius:8, padding:"6px 8px",
                    borderLeft:"3px solid #8b5cf6" }}>
                    "{e.nota}"
                  </div>
                )}
                {e.has_nota && !e.nota && (
                  <div style={{ fontSize:11, color:"#aaa", fontStyle:"italic" }}>
                    🔒 Nota privada (visible según configuración)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Categorías */}
      {tab==="cats" && (
        <div style={{ padding:"0 14px" }}>
          {risk.top_cats.length === 0 && <Err msg="Sin categorías registradas"/>}
          {risk.top_cats.map(({ id, cnt }) => {
            const isNeg = ["miedo","soledad","presion","tristeza","enojo","cansancio"].includes(id);
            return (
              <div key={id} style={{ background:"white", borderRadius:14, padding:"12px 14px",
                marginBottom:8, borderLeft:`4px solid ${isNeg?"#ef4444":"#10b981"}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:"#1a1a1a" }}>
                      {CAT_LABEL[id]||id}
                    </div>
                    <div style={{ fontSize:11, color: isNeg?"#ef4444":"#10b981", fontWeight:700 }}>
                      {isNeg ? "⚠ Señal de alerta" : "✓ Señal positiva"}
                    </div>
                  </div>
                  <div style={{ fontWeight:900, fontSize:22,
                    color: isNeg?"#ef4444":"#10b981" }}>{cnt}×</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Reportes */}
      {tab==="reports" && (
        <div style={{ padding:"0 14px" }}>
          {reports.length === 0 && <Err msg="Sin reportes de este alumno"/>}
          {reports.map(r => (
            <div key={r.id} style={{ background: r.reviewed?"white":"#fffbeb",
              borderRadius:14, padding:"12px 14px", marginBottom:8,
              border: r.reviewed ? "1px solid #f0f0f0":"1.5px solid #f59e0b",
              boxShadow:"0 1px 6px rgba(0,0,0,.05)" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:6 }}>
                <span style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>
                  {TIPO_LABEL[r.tipo] || r.tipo}
                </span>
                {r.reviewed
                  ? <span style={{ fontSize:10, color:"#10b981", fontWeight:800 }}>✓ Revisado</span>
                  : <span style={{ fontSize:10, color:"#f59e0b", fontWeight:800 }}>● Sin revisar</span>
                }
              </div>
              <div style={{ fontSize:12, color:"#444", lineHeight:1.5,
                background:"#fafafa", borderRadius:8, padding:"8px 10px",
                marginBottom:8, fontStyle: r.is_anonymous ? "italic":"normal" }}>
                {r.descripcion}
                {r.is_anonymous && (
                  <div style={{ fontSize:10, color:"#aaa", marginTop:4 }}>🔒 Enviado anónimamente</div>
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:10, color:"#aaa" }}>
                  {new Date(r.created_at).toLocaleDateString("es-AR")}
                </span>
                {!r.reviewed && (
                  <button onClick={() => markReviewed(r.id)}
                    style={{ background:"#10b981", border:"none", borderRadius:99,
                      color:"white", padding:"5px 14px", fontSize:11,
                      fontWeight:800, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
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

// ── Reportes globales ────────────────────────────────────────
function GlobalReports({ showToast }) {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter,  setFilter]    = useState("pending");

  useEffect(() => {
    api.wellnessReports()
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markReviewed = async (id) => {
    try {
      await api.wellnessMarkReviewed(id);
      setReports(prev => prev.map(r => r.id===id ? {...r, reviewed:true, reviewed_at:new Date().toISOString()} : r));
      showToast("Reporte marcado como revisado");
    } catch(e) { showToast(e.message||"Error","error"); }
  };

  const filtered = reports.filter(r =>
    filter==="pending" ? !r.reviewed : r.reviewed
  );

  if (loading) return <Loader/>;

  return (
    <div style={{ padding:"14px 14px 24px" }}>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {[["pending","⏳ Pendientes"],["reviewed","✓ Revisados"]].map(([f,l]) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex:1, border:"none", borderRadius:99, padding:"8px",
              background: filter===f ? "#8b5cf6":"#f0f0f0",
              color: filter===f ? "white":"#555",
              fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
            {l} ({reports.filter(r=>f==="pending"?!r.reviewed:r.reviewed).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <Err msg={filter==="pending" ? "Sin reportes pendientes":"Sin reportes revisados"}/>}

      {filtered.map(r => (
        <div key={r.id} style={{ background: r.reviewed?"white":"#fffbeb",
          borderRadius:16, padding:"14px 16px", marginBottom:10,
          border: r.reviewed?"1px solid #f0f0f0":"1.5px solid #f59e0b",
          boxShadow:"0 1px 8px rgba(0,0,0,.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", marginBottom:6 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>
                {TIPO_LABEL[r.tipo] || r.tipo}
              </div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>
                {r.is_anonymous
                  ? "🔒 Anónimo"
                  : `👤 ${r.nombre || "Sin nombre"}`
                } · {new Date(r.created_at).toLocaleDateString("es-AR")}
              </div>
            </div>
            {!r.reviewed
              ? <span style={{ background:"#fef3c7", color:"#d97706",
                  borderRadius:99, padding:"3px 8px", fontSize:10, fontWeight:800, flexShrink:0 }}>
                  Sin revisar
                </span>
              : <span style={{ background:"#f0fdf4", color:"#10b981",
                  borderRadius:99, padding:"3px 8px", fontSize:10, fontWeight:800, flexShrink:0 }}>
                  ✓ Revisado
                </span>
            }
          </div>
          <div style={{ fontSize:13, color:"#444", lineHeight:1.6,
            background:"#fafafa", borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
            {r.descripcion}
          </div>
          {!r.reviewed && (
            <button onClick={() => markReviewed(r.id)}
              style={{ background:"#10b981", border:"none", borderRadius:99,
                color:"white", padding:"7px 18px", fontSize:12,
                fontWeight:800, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
              Marcar como revisado ✓
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Config del algoritmo ─────────────────────────────────────
function WellnessConfig({ showToast }) {
  const [cfg,     setCfg]     = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.wellnessAdminConfig()
      .then(setCfg)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.wellnessAdminConfigUpdate(cfg);
      setCfg(updated);
      showToast("Configuración guardada ✓");
    } catch(e) { showToast(e.message||"Error","error"); }
    finally { setSaving(false); }
  };

  const setW = (key, val) => setCfg(c => ({ ...c, weights: { ...c.weights, [key]: parseInt(val)||0 } }));
  const setL = (key, val) => setCfg(c => ({ ...c, risk_levels: { ...c.risk_levels, [key]: parseInt(val)||0 } }));

  if (loading || !cfg) return <Loader/>;

  return (
    <div style={{ padding:"14px 14px 40px" }}>

      <div style={{ background:"#fffbeb", border:"1.5px solid #fde68a",
        borderRadius:14, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#92400e" }}>
        ⚙️ Estos parámetros controlan cómo el algoritmo califica el riesgo de cada alumno.
        Ajustalos según el criterio del equipo psicológico.
      </div>

      {/* Umbral de ánimo bajo */}
      <Section title="Umbral de ánimo bajo">
        <div style={{ fontSize:12, color:"#555", marginBottom:8 }}>
          Ánimo ≤ este valor se considera "bajo" (1–4)
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[1,2,3,4].map(v => (
            <button key={v} onClick={() => setCfg(c=>({...c,low_mood_threshold:v}))}
              style={{ flex:1, border:"none", borderRadius:10, padding:"10px 0",
                background: cfg.low_mood_threshold===v ? MOOD_COLOR[v]+"33":"#f0f0f0",
                color: cfg.low_mood_threshold===v ? MOOD_COLOR[v]:"#555",
                fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"Nunito,sans-serif",
                outline: cfg.low_mood_threshold===v ? `2px solid ${MOOD_COLOR[v]}`:"none" }}>
              {MOOD_EMOJI[v]} {v}
            </button>
          ))}
        </div>
      </Section>

      {/* Niveles de riesgo (puntajes mínimos) */}
      <Section title="Puntajes mínimos por nivel">
        <div style={{ fontSize:12, color:"#555", marginBottom:10 }}>
          Desde qué puntaje se clasifica cada nivel
        </div>
        {[
          ["attention","🟡 Atención"],
          ["priority", "🟠 Prioritario"],
          ["urgent",   "🔴 Urgente"],
        ].map(([key, label]) => (
          <NumRow key={key} label={label} val={cfg.risk_levels[key]}
            onChange={v => setL(key, v)}/>
        ))}
      </Section>

      {/* Pesos del algoritmo */}
      <Section title="Pesos del algoritmo">
        <div style={{ fontSize:12, color:"#555", marginBottom:10 }}>
          Cuántos puntos suma cada factor de riesgo
        </div>
        {[
          ["low_avg_7d",      "📉 Prom. bajo últimos 7 días",      "Máx. de este valor si el promedio es muy bajo"],
          ["consecutive_low", "🔁 Por cada día consecutivo bajo",   "Se multiplica por nro de días"],
          ["consecutive_cap", "🔝 Tope días consecutivos",          "Máximo acumulable por días seguidos"],
          ["unread_report",   "📬 Por reporte sin revisar",         "Cada reporte no revisado suma este valor"],
          ["high_risk_cat",   "⚠ Por cat. de alto riesgo",         "Por cada categoría (miedo, soledad, presión)"],
          ["sudden_drop",     "📉 Caída repentina de ánimo",        "Si el ánimo cayó ≥2 puntos vs semana anterior"],
          ["no_data",         "❓ Sin datos en 7+ días",            "Si el alumno no registró nada en una semana"],
        ].map(([key, label, hint]) => (
          <NumRow key={key} label={label} hint={hint} val={cfg.weights[key]}
            onChange={v => setW(key, v)}/>
        ))}
      </Section>

      {/* Categorías de alto riesgo */}
      <Section title="Categorías de alto riesgo">
        <div style={{ fontSize:12, color:"#555", marginBottom:10 }}>
          Seleccioná cuáles se consideran señal de alerta
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {["miedo","soledad","presion","tristeza","enojo","cansancio"].map(c => {
            const active = (cfg.high_risk_categories||[]).includes(c);
            return (
              <button key={c} onClick={() => setCfg(prev => ({
                ...prev,
                high_risk_categories: active
                  ? (prev.high_risk_categories||[]).filter(x=>x!==c)
                  : [...(prev.high_risk_categories||[]), c]
              }))}
                style={{ border:"none", borderRadius:99, padding:"6px 14px",
                  fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  background: active ? "#fef2f2":"#f0f0f0",
                  color: active ? "#ef4444":"#555",
                  outline: active ? "1.5px solid #ef4444":"none" }}>
                {CAT_LABEL[c]||c}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Notas visibles */}
      <Section title="Privacidad de notas">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setCfg(c=>({...c,show_notas:!c.show_notas}))}
            style={{ width:46, height:26, borderRadius:99, border:"none", cursor:"pointer",
              padding:0, position:"relative", flexShrink:0,
              background: cfg.show_notas ? "#8b5cf6":"#ddd", transition:"background .2s" }}>
            <span style={{ position:"absolute", top:3,
              left: cfg.show_notas ? "calc(100% - 23px)":3,
              width:20, height:20, borderRadius:"50%",
              background:"white", transition:"left .2s" }}/>
          </button>
          <div>
            <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>
              {cfg.show_notas ? "Notas visibles para el equipo" : "Notas ocultas"}
            </div>
            <div style={{ fontSize:11, color:"#aaa" }}>
              {cfg.show_notas
                ? "El equipo psicológico puede leer las notas privadas de los alumnos"
                : "Solo se muestra que existe una nota, no su contenido"}
            </div>
          </div>
        </div>
      </Section>

      <button onClick={save} disabled={saving}
        style={{ width:"100%", background: saving?"#ccc":"#8b5cf6", border:"none",
          borderRadius:99, color:"white", padding:"14px",
          fontWeight:800, fontSize:15, cursor: saving?"not-allowed":"pointer",
          fontFamily:"Nunito,sans-serif" }}>
        {saving ? "Guardando..." : "Guardar configuración ✓"}
      </button>
    </div>
  );
}

// ── Componente raíz ──────────────────────────────────────────
function AdminPsicologia({ showToast, onBack }) {
  const [view,   setView]   = useState("dashboard"); // dashboard | list | student | reports | config
  const [filter, setFilter] = useState("all");
  const [stuId,  setStuId]  = useState(null);

  const nav = (v, param) => {
    if (v === "list")    { setFilter(param || "all"); setView("list"); }
    else if (v === "student") { setStuId(param); setView("student"); }
    else setView(v);
  };

  const goBack = () => {
    if (view === "student") setView("list");
    else if (["list","reports","config"].includes(view)) setView("dashboard");
    else onBack();
  };

  const TITLES = {
    dashboard: "🧠 Psicología",
    list:      `${RISK_CFG[filter]?.icon || "👥"} ${RISK_CFG[filter]?.label || "Todos"}`,
    student:   "👤 Perfil del alumno",
    reports:   "📬 Reportes",
    config:    "⚙️ Configuración",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F0F0F0" }}>
      {/* Header */}
      <div style={{ background:"#8b5cf6", color:"white",
        padding:"22px 16px 16px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={goBack}
            style={{ background:"rgba(0,0,0,.15)", border:"none", borderRadius:50,
              color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div style={{ flex:1, fontWeight:900, fontSize:18 }}>{TITLES[view]}</div>
          {view==="dashboard" && (
            <div style={{ display:"flex", gap:6 }}>
              <IconBtn icon="📬" onClick={() => setView("reports")} title="Reportes"/>
              <IconBtn icon="⚙️" onClick={() => setView("config")}  title="Configurar"/>
            </div>
          )}
          {view==="list" && (
            <div style={{ display:"flex", gap:6 }}>
              {["all","urgent","priority","attention"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ border:"none", borderRadius:99, padding:"4px 10px", cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", fontSize:10, fontWeight:800,
                    background: filter===f ? "rgba(255,255,255,.3)":"rgba(255,255,255,.1)",
                    color:"white" }}>
                  {f==="all" ? "Todos" : RISK_CFG[f]?.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view==="dashboard" && <Dashboard onNav={nav}/>}
      {view==="list"      && <StudentList filter={filter} onNav={nav}/>}
      {view==="student"   && <StudentDetail userId={stuId} onBack={goBack} showToast={showToast}/>}
      {view==="reports"   && <GlobalReports showToast={showToast}/>}
      {view==="config"    && <WellnessConfig showToast={showToast}/>}
    </div>
  );
}

// ── Helpers de UI ────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background:"white", borderRadius:16, padding:"14px 16px",
      marginBottom:12, boxShadow:"0 1px 8px rgba(0,0,0,.06)" }}>
      <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a", marginBottom:10 }}>{title}</div>
      {children}
    </div>
  );
}

function NumRow({ label, hint, val, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#333" }}>{label}</div>
        {hint && <div style={{ fontSize:10, color:"#aaa" }}>{hint}</div>}
      </div>
      <input type="number" min="0" value={val ?? 0} onChange={e=>onChange(e.target.value)}
        style={{ width:60, border:"1.5px solid #e8e8e8", borderRadius:10,
          padding:"7px 10px", fontSize:15, fontWeight:900, outline:"none",
          color:"#8b5cf6", textAlign:"center", fontFamily:"Nunito,sans-serif" }}/>
    </div>
  );
}

function IconBtn({ icon, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:50,
        color:"white", width:34, height:34, cursor:"pointer", fontSize:16,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
      {icon}
    </button>
  );
}

function Loader() {
  return (
    <div style={{ padding:40, textAlign:"center", color:"#aaa", fontWeight:700, fontSize:13 }}>
      Cargando...
    </div>
  );
}

function Err({ msg }) {
  return (
    <div style={{ padding:"32px 16px", textAlign:"center", color:"#aaa",
      fontWeight:700, fontSize:13 }}>
      {msg}
    </div>
  );
}

export default AdminPsicologia;
