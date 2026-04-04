import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

export default function PDiwy({ me, showToast, setTab }) {
  const { primary:accent, txt, sub, cardBg, pageBg } = useTheme();
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedId,  setExpandedId]  = useState(null);
  const [requesting,  setRequesting]  = useState({});
  const [rateLimited, setRateLimited] = useState({});

  useEffect(() => {
    api.diwyParentReports()
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const byStudent = reports.reduce((acc,r) => {
    if (!acc[r.student_id]) acc[r.student_id] = { nombre:r.alumno_nombre, reports:[] };
    acc[r.student_id].reports.push(r);
    return acc;
  }, {});

  const requestReport = async (studentId) => {
    setRequesting(p=>({...p,[studentId]:true}));
    setRateLimited(p=>({...p,[studentId]:null}));
    try {
      await api.diwyParentRequest(studentId);
      showToast("Solicitud enviada. El equipo generará el reporte pronto.");
    } catch(e) {
      if (e.code==="RATE_LIMITED") setRateLimited(p=>({...p,[studentId]:e.message}));
      else showToast(e.message||"Error al enviar solicitud","error");
    } finally { setRequesting(p=>({...p,[studentId]:false})); }
  };

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"}) : "";

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:accent, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>🐾 Diwy</div>
            <div style={{ fontSize:13, opacity:.85 }}>Reportes de seguimiento</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"16px 14px" }}>
        {loading && <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>}
        {!loading && Object.keys(byStudent).length === 0 && (
          <WCard style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🐾</div>
            <div style={{ fontWeight:900, fontSize:17, color:txt, marginBottom:8,
              transition:"color .3s" }}>Bienvenido a Diwy</div>
            <div style={{ fontSize:13, color:sub, lineHeight:1.6, transition:"color .3s" }}>
              Diwy genera reportes semanales personalizados sobre el progreso de tus hijos.
              Todavía no hay reportes aprobados.
            </div>
          </WCard>
        )}
        {Object.entries(byStudent).map(([studentId,{nombre,reports:sr}]) => {
          const latest = sr[0];
          const isExp  = expandedId === latest?.id;
          return (
            <div key={studentId} style={{ marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:8, paddingLeft:4,
                transition:"color .3s" }}>👧 {nombre}</div>
              {latest && (
                <WCard style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:txt,
                        transition:"color .3s" }}>{latest.periodo_label}</div>
                      <div style={{ fontSize:11, color:sub, marginTop:2,
                        transition:"color .3s" }}>
                        Publicado el {fmtDate(latest.approved_at)}
                      </div>
                    </div>
                    <span style={{ background:accent+"18", color:accent,
                      borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:800 }}>
                      Aprobado
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:txt, lineHeight:1.6,
                    overflow:"hidden", maxHeight:isExp?"none":80, position:"relative",
                    transition:"color .3s" }}>
                    <div style={{ whiteSpace:"pre-wrap" }}>{latest.reporte_final}</div>
                    {!isExp && (
                      <div style={{ position:"absolute", bottom:0, left:0, right:0,
                        height:40, background:"linear-gradient(transparent, var(--card-bg,white))" }}/>
                    )}
                  </div>
                  <button onClick={()=>setExpandedId(isExp?null:latest.id)}
                    style={{ background:"none", border:"none", color:accent,
                      fontWeight:800, fontSize:12, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif", padding:"8px 0 0", display:"block" }}>
                    {isExp?"Ver menos ▲":"Ver completo ▼"}
                  </button>
                </WCard>
              )}
              {rateLimited[studentId] && (
                <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px",
                  marginBottom:8, fontSize:12, color:"#92400e" }}>
                  ⏳ {rateLimited[studentId]}
                </div>
              )}
              <button onClick={()=>requestReport(studentId)} disabled={requesting[studentId]}
                style={{ width:"100%", background:requesting[studentId]?"#ccc":accent+"18",
                  border:`1.5px dashed ${accent}55`, borderRadius:14, padding:"12px",
                  cursor:requesting[studentId]?"not-allowed":"pointer",
                  fontFamily:"Nunito,sans-serif", color:accent, fontWeight:800, fontSize:13 }}>
                {requesting[studentId] ? "Enviando..." : "📨 Solicitar nuevo reporte"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
