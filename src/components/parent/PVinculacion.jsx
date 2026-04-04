import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, WCard, displayName } from "../shared/index";

const EST_STYLE = {
  pendiente:{ bg:"#fef3c7", color:"#b45309", label:"Pendiente" },
  aprobado: { bg:"#d1fae5", color:"#065f46", label:"Aprobado"  },
  rechazado:{ bg:"#fee2e2", color:"#991b1b", label:"Rechazado" },
};

export default function PVinculacion({ me, showToast, setTab }) {
  const { primary, txt, sub, cardBg, pageBg } = useTheme();
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [confirming,  setConfirming]  = useState(null);
  const [requests,    setRequests]    = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [linked,      setLinked]      = useState([]);
  const accent = primary;

  useEffect(() => {
    Promise.all([
      api.parentLinkRequests().catch(()=>[]),
      api.parentChildren().catch(()=>[]),
    ]).then(([reqs,children]) => {
      setRequests(Array.isArray(reqs)?reqs:[]);
      setLinked(Array.isArray(children)?children:[]);
    }).finally(()=>setLoadingReqs(false));
  }, []);

  const search = async () => {
    if (!query.trim() || query.trim().length < 2) {
      showToast("Escribí al menos 2 caracteres","error"); return;
    }
    setSearching(true); setResults([]);
    try {
      const d = await api.parentLinkSearch(query.trim());
      setResults(Array.isArray(d)?d:[]);
      if (!Array.isArray(d)||d.length===0) showToast("No se encontraron alumnos","error");
    } catch(e) { showToast(e.message||"Error al buscar","error"); }
    finally { setSearching(false); }
  };

  const confirm = async (studentId) => {
    setConfirming(studentId);
    try {
      await api.parentLinkConfirm(studentId);
      showToast("Solicitud enviada. El admin la revisará pronto.");
      setResults([]); setQuery("");
      const reqs = await api.parentLinkRequests().catch(()=>[]);
      setRequests(Array.isArray(reqs)?reqs:[]);
    } catch(e) { showToast(e.message||"Error al enviar solicitud","error"); }
    finally { setConfirming(null); }
  };

  const cancel = async (id) => {
    try {
      await api.parentLinkCancel(id);
      setRequests(rs=>rs.filter(r=>r.id!==id));
      showToast("Solicitud cancelada");
    } catch(e) { showToast(e.message||"Error al cancelar","error"); }
  };

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:accent, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-50, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>🔗 Vincular hijo</div>
            <div style={{ fontSize:13, opacity:.85 }}>Conectá tu cuenta con la de tu hijo/a</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"16px 14px" }}>
        {linked.length > 0 && (
          <>
            <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:8,
              transition:"color .3s" }}>✅ Hijos vinculados</div>
            {linked.map(c=>(
              <WCard key={c.id} style={{ marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
                <Av user={c} sz={40} avatarBg={c.avatar_bg}/>
                <div style={{ fontWeight:800, color:txt, flex:1, transition:"color .3s" }}>
                  {displayName(c)}
                </div>
                <span style={{ background:"#d1fae5", color:"#065f46",
                  borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:800 }}>
                  Vinculado
                </span>
              </WCard>
            ))}
            <div style={{ height:12 }}/>
          </>
        )}
        <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:8,
          transition:"color .3s" }}>🔍 Buscar alumno</div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input value={query} onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&search()}
            placeholder="Nombre del alumno..."
            style={{ flex:1, border:"1.5px solid #e8e8e8", borderRadius:12,
              padding:"10px 14px", fontSize:14, outline:"none",
              fontFamily:"Nunito,sans-serif", background:cardBg, color:txt,
              transition:"background .3s, color .3s" }}/>
          <button onClick={search} disabled={searching}
            style={{ background:searching?"#ccc":accent, border:"none", borderRadius:12,
              color:"white", padding:"10px 18px", fontWeight:800, fontSize:14,
              cursor:searching?"not-allowed":"pointer", fontFamily:"Nunito,sans-serif" }}>
            {searching?"...":"Buscar"}
          </button>
        </div>
        {results.map(s=>(
          <WCard key={s.id} style={{ marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
            <Av user={s} sz={40} avatarBg={s.avatar_bg}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, color:txt, transition:"color .3s" }}>{displayName(s)}</div>
              <div style={{ fontSize:11, color:sub, transition:"color .3s" }}>Alumno</div>
            </div>
            <button onClick={()=>confirm(s.id)} disabled={confirming===s.id}
              style={{ background:confirming===s.id?"#ccc":accent, border:"none",
                borderRadius:50, color:"white", padding:"8px 16px", fontWeight:800,
                fontSize:12, cursor:confirming===s.id?"not-allowed":"pointer",
                fontFamily:"Nunito,sans-serif" }}>
              {confirming===s.id?"...":"Solicitar"}
            </button>
          </WCard>
        ))}
        {!loadingReqs && requests.length > 0 && (
          <>
            <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:8, marginTop:16,
              transition:"color .3s" }}>📋 Mis solicitudes</div>
            {requests.map(r=>{
              const est = EST_STYLE[r.estado]||EST_STYLE.pendiente;
              return (
                <WCard key={r.id} style={{ marginBottom:8, display:"flex",
                  alignItems:"center", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, color:txt, transition:"color .3s" }}>
                      {r.student_nombre||r.student_name||"Alumno"}
                    </div>
                    <div style={{ fontSize:11, color:sub, transition:"color .3s" }}>
                      {new Date(r.created_at).toLocaleDateString("es-AR")}
                    </div>
                  </div>
                  <span style={{ background:est.bg, color:est.color,
                    borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:800 }}>
                    {est.label}
                  </span>
                  {r.estado==="pendiente" && (
                    <button onClick={()=>cancel(r.id)}
                      style={{ background:"#fee2e2", border:"none", borderRadius:50,
                        color:"#991b1b", padding:"6px 12px", fontWeight:800,
                        fontSize:11, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                      Cancelar
                    </button>
                  )}
                </WCard>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
