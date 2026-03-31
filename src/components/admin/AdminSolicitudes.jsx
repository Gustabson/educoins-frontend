import { useState, useEffect } from "react";
import { api } from "../../api";

const SECCIONES = [
  "psicologia", "economia", "administracion", "tienda", "ranking", "otro"
];

const ESTADO_CFG = {
  pending:  { color:"#f59e0b", bg:"#fffbeb", icon:"⏳", label:"Pendiente"  },
  approved: { color:"#10b981", bg:"#f0fdf4", icon:"✅", label:"Aprobada"   },
  rejected: { color:"#ef4444", bg:"#fef2f2", icon:"❌", label:"Rechazada"  },
};

function Loader() {
  return <div style={{padding:40,textAlign:"center",color:"#aaa",fontWeight:700,fontSize:13}}>Cargando...</div>;
}
function Empty({ msg }) {
  return <div style={{padding:"32px 16px",textAlign:"center",color:"#aaa",fontWeight:700,fontSize:13}}>{msg}</div>;
}

// ── Vista: superadmin revisa propuestas ───────────────────────
function ReviewView({ showToast }) {
  const [proposals, setProposals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("pending");
  const [resolving, setResolving] = useState(null);
  const [respuesta, setRespuesta] = useState({});

  useEffect(() => {
    api.adminProposals()
      .then(d => setProposals(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id, estado) => {
    setResolving(id + estado);
    try {
      const updated = await api.adminResolveProposal(id, { estado, respuesta: respuesta[id] || "" });
      setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      showToast(estado === "approved" ? "Solicitud aprobada ✓" : "Solicitud rechazada");
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setResolving(null); }
  };

  const filtered = proposals.filter(p => p.estado === filter);
  const counts = { pending: 0, approved: 0, rejected: 0 };
  proposals.forEach(p => { if (counts[p.estado] !== undefined) counts[p.estado]++; });

  if (loading) return <Loader/>;

  return (
    <div style={{padding:"14px 14px 40px"}}>
      {/* Filtros */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["pending","⏳ Pendientes"],["approved","✅ Aprobadas"],["rejected","❌ Rechazadas"]].map(([f,l])=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{flex:1,border:"none",borderRadius:99,padding:"8px 4px",
              background:filter===f?"#8b5cf6":"#f0f0f0",
              color:filter===f?"white":"#555",
              fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            {l} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length===0 && <Empty msg="Sin solicitudes en esta categoría"/>}

      {filtered.map(p => {
        const ec = ESTADO_CFG[p.estado] || ESTADO_CFG.pending;
        return (
          <div key={p.id} style={{background:"white",borderRadius:16,padding:"14px 16px",
            marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)",
            borderLeft:`4px solid ${ec.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{p.titulo}</div>
                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>
                  {p.from_nombre}
                  {" · "}<span style={{fontWeight:700,color:"#8b5cf6",textTransform:"capitalize"}}>{p.seccion}</span>
                  {" · "}{new Date(p.created_at).toLocaleDateString("es-AR")}
                </div>
              </div>
              <span style={{background:ec.bg,color:ec.color,borderRadius:99,
                padding:"3px 10px",fontSize:10,fontWeight:800,flexShrink:0}}>
                {ec.icon} {ec.label}
              </span>
            </div>

            <div style={{background:"#fafafa",borderRadius:10,padding:"10px 12px",
              fontSize:12,color:"#444",lineHeight:1.6,marginBottom:10}}>
              {p.descripcion}
            </div>

            {p.estado === "pending" && (
              <div style={{marginTop:8}}>
                <textarea
                  placeholder="Respuesta (opcional)..."
                  value={respuesta[p.id]||""}
                  onChange={e=>setRespuesta(r=>({...r,[p.id]:e.target.value}))}
                  style={{width:"100%",border:"1.5px solid #e8e8e8",borderRadius:10,
                    padding:"8px 10px",fontSize:12,fontFamily:"Nunito,sans-serif",
                    resize:"vertical",minHeight:60,boxSizing:"border-box",
                    outline:"none",marginBottom:8}}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>resolve(p.id,"approved")}
                    disabled={!!resolving}
                    style={{flex:1,background:"#10b981",border:"none",borderRadius:99,
                      color:"white",padding:"10px",fontSize:12,fontWeight:800,
                      cursor:resolving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {resolving===p.id+"approved"?"...":"✅ Aprobar"}
                  </button>
                  <button onClick={()=>resolve(p.id,"rejected")}
                    disabled={!!resolving}
                    style={{flex:1,background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:99,
                      color:"#ef4444",padding:"10px",fontSize:12,fontWeight:800,
                      cursor:resolving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {resolving===p.id+"rejected"?"...":"❌ Rechazar"}
                  </button>
                </div>
              </div>
            )}

            {p.estado !== "pending" && p.respuesta && (
              <div style={{background:ec.bg,borderRadius:10,padding:"8px 12px",
                fontSize:12,color:ec.color,fontStyle:"italic"}}>
                💬 "{p.respuesta}"
                <div style={{fontSize:10,color:"#aaa",marginTop:2,fontStyle:"normal"}}>
                  — {p.resolved_nombre || "Superadmin"} · {new Date(p.resolved_at).toLocaleDateString("es-AR")}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Vista: staff envía una solicitud ─────────────────────────
function SendView({ showToast, onBack }) {
  const [form,    setForm]    = useState({ seccion:"", titulo:"", descripcion:"" });
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingH,setLoadingH]= useState(true);

  useEffect(() => {
    api.staffMyProposals()
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, [sent]);

  const send = async () => {
    if (!form.seccion || !form.titulo.trim() || !form.descripcion.trim()) {
      showToast("Completá todos los campos", "error"); return;
    }
    setSending(true);
    try {
      await api.staffSendProposal(form);
      showToast("Solicitud enviada ✓");
      setForm({ seccion:"", titulo:"", descripcion:"" });
      setSent(s => !s); // re-fetch history
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setSending(false); }
  };

  return (
    <div style={{padding:"14px 14px 40px"}}>
      <div style={{background:"#f3e8ff",border:"1.5px solid #c4b5fd",borderRadius:14,
        padding:"10px 14px",marginBottom:16,fontSize:12,color:"#6d28d9"}}>
        ✉ Enviá una solicitud al superadmin para proponer cambios, reportar problemas
        o pedir nuevas funcionalidades. Recibirás una respuesta en el historial.
      </div>

      <div style={{background:"white",borderRadius:16,padding:"14px 16px",
        marginBottom:14,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
        <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:12}}>
          Nueva solicitud
        </div>

        <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:6}}>Sección</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {SECCIONES.map(s=>(
            <button key={s} onClick={()=>setForm(f=>({...f,seccion:s}))}
              style={{border:"none",borderRadius:99,padding:"6px 14px",
                background:form.seccion===s?"#8b5cf6":"#f0f0f0",
                color:form.seccion===s?"white":"#555",
                fontWeight:800,fontSize:11,cursor:"pointer",
                fontFamily:"Nunito,sans-serif",textTransform:"capitalize"}}>
              {s}
            </button>
          ))}
        </div>

        <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:4}}>Título</div>
        <input
          value={form.titulo}
          onChange={e=>setForm(f=>({...f,titulo:e.target.value.slice(0,100)}))}
          placeholder="Resumí la solicitud en una frase..."
          style={{width:"100%",border:"1.5px solid #e8e8e8",borderRadius:10,
            padding:"9px 12px",fontSize:13,fontFamily:"Nunito,sans-serif",
            outline:"none",boxSizing:"border-box",marginBottom:12}}/>

        <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:4}}>Descripción y justificación</div>
        <textarea
          value={form.descripcion}
          onChange={e=>setForm(f=>({...f,descripcion:e.target.value.slice(0,1000)}))}
          placeholder="Explicá en detalle qué necesitás y por qué..."
          style={{width:"100%",border:"1.5px solid #e8e8e8",borderRadius:10,
            padding:"9px 12px",fontSize:13,fontFamily:"Nunito,sans-serif",
            outline:"none",resize:"vertical",minHeight:100,boxSizing:"border-box",marginBottom:16}}/>

        <button onClick={send} disabled={sending}
          style={{width:"100%",background:sending?"#ccc":"#8b5cf6",border:"none",
            borderRadius:99,color:"white",padding:"12px",fontSize:13,fontWeight:800,
            cursor:sending?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
          {sending?"Enviando...":"Enviar solicitud ✉"}
        </button>
      </div>

      {/* Historial propio */}
      <div style={{fontWeight:800,fontSize:13,color:"#555",marginBottom:8}}>
        Mis solicitudes anteriores
      </div>
      {loadingH && <div style={{color:"#aaa",fontSize:12,padding:8}}>Cargando...</div>}
      {!loadingH && history.length===0 && (
        <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>Sin solicitudes anteriores</div>
      )}
      {!loadingH && history.map(p=>{
        const ec = ESTADO_CFG[p.estado]||ESTADO_CFG.pending;
        return (
          <div key={p.id} style={{background:"white",borderRadius:14,padding:"12px 14px",
            marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,.05)",borderLeft:`3px solid ${ec.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{p.titulo}</div>
              <span style={{fontSize:10,fontWeight:800,color:ec.color}}>{ec.icon} {ec.label}</span>
            </div>
            <div style={{fontSize:11,color:"#aaa",marginTop:2,textTransform:"capitalize"}}>
              {p.seccion} · {new Date(p.created_at).toLocaleDateString("es-AR")}
            </div>
            {p.respuesta && (
              <div style={{background:ec.bg,borderRadius:8,padding:"7px 10px",
                marginTop:8,fontSize:12,color:ec.color,fontStyle:"italic"}}>
                💬 "{p.respuesta}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Raíz ─────────────────────────────────────────────────────
function AdminSolicitudes({ showToast, onBack, me, mode = "review" }) {
  const isSuperAdmin = me?.rol === "admin";
  const view = mode === "send" && !isSuperAdmin ? "send" : "review";

  return (
    <div style={{minHeight:"100vh",background:"#F0F0F0",fontFamily:"Nunito,sans-serif"}}>
      <div style={{background:"#8b5cf6",color:"white",padding:"22px 16px 14px",
        position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack}
            style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
              color:"white",width:34,height:34,cursor:"pointer",fontSize:18,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{fontWeight:900,fontSize:18}}>
            {view==="send" ? "✉ Enviar solicitud" : "📨 Solicitudes"}
          </div>
        </div>
      </div>

      {view==="review" && <ReviewView showToast={showToast}/>}
      {view==="send"   && <SendView   showToast={showToast} onBack={onBack}/>}
    </div>
  );
}

export default AdminSolicitudes;
