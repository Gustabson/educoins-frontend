import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";




function AdminReportes({showToast, onBack}){
  const [reports,setReports]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filtro,setFiltro]=useState("todos");
  const [sel,setSel]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [newMsg,setNewMsg]=useState("");
  const [resolucion,setResolucion]=useState("");
  const [saving,setSaving]=useState(false);
  const bottomRef=useRef(null);

  const ESTADOS=["recibido","en_revision","resuelto","descartado"];

  const load=()=>{
    const q = filtro==="todos" ? "" : `?estado=${filtro}`;
    api.allReports(q)
      .then(d=>setReports(d.reports||d.data?.reports||[]))
      .catch(()=>[])
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ setLoading(true); load(); },[filtro]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const openSel = async(r) => {
    setSel(r); setMsgs([]); setResolucion("");
    try{
      const d = await api.reportMessages(r.id);
      setMsgs(d.data||d||[]);
    }catch(e){}
  };

  const cambiarEstado=async(id,estado)=>{
    setSaving(true);
    try{
      await api.updateReport(id,{estado,resolucion:resolucion.trim()||null});
      showToast("Reporte actualizado ✅");
      setSel(prev=>({...prev,estado}));
      setResolucion("");load();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const sendMsg=async()=>{
    if(!newMsg.trim()) return;
    setSaving(true);
    try{
      const d = await api.sendReportMsg(sel.id, newMsg.trim());
      const nuevoMsg = d.data||d;
      setMsgs(prev=>[...prev, nuevoMsg]);
      setNewMsg("");
      if(sel.estado==='recibido') setSel(prev=>({...prev,estado:'en_revision'}));
      load();
    }catch(e){showToast("Error al enviar","error");}
    finally{setSaving(false);}
  };

  if(sel){
    const tipoInfo = REPORTE_TIPOS.find(t=>t.id===sel.tipo)||{icon:"📋",label:sel.tipo,col:"#64748b"};
    const abierto  = sel.estado!=="resuelto"&&sel.estado!=="descartado";
    return(
      <div style={{minHeight:"100vh",background:"#eef2f7"}}>
        <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",
          position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>{setSel(null);load();}} style={{background:"rgba(0,0,0,.15)",border:"none",
              borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:15}}>Caso #{sel.id?.slice(0,8).toUpperCase()}</div>
              <div style={{fontSize:11,opacity:.85}}>{tipoInfo.icon} {tipoInfo.label} · {sel.reporter_nombre||"Anónimo"}</div>
            </div>
            <span style={{background:"rgba(255,255,255,.2)",borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:800}}>
              {ESTADO_LABEL2[sel.estado]}
            </span>
          </div>
        </div>
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {ESTADOS.map(e=>(
              <button key={e} onClick={()=>cambiarEstado(sel.id,e)} disabled={saving||sel.estado===e}
                style={{background:sel.estado===e?ESTADO_COL[e]:"white",color:sel.estado===e?"white":"#555",
                  border:`1.5px solid ${sel.estado===e?ESTADO_COL[e]:"#e8e8e8"}`,borderRadius:99,
                  padding:"5px 13px",fontSize:11,fontWeight:800,cursor:sel.estado===e?"default":"pointer",
                  fontFamily:"Nunito,sans-serif"}}>{ESTADO_LABEL2[e]}</button>
            ))}
          </div>
          <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.08)"}}>
            <div style={{background:"#f8f9fa",padding:"12px 16px",borderBottom:"1px solid #e8e8e8"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:tipoInfo.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{sel.reporter_nombre||"Anónimo"}</div>
                  <div style={{fontSize:10,color:"#777"}}>Para: Administración</div>
                </div>
                <div style={{fontSize:10,color:"#aaa",textAlign:"right"}}>
                  {new Date(sel.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                  <br/>{new Date(sel.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:"#777"}}>
                Asunto: <span style={{color:tipoInfo.col}}>[{tipoInfo.label.toUpperCase()}]</span> #{sel.id?.slice(0,8).toUpperCase()}
              </div>
            </div>
            <div style={{padding:"14px 16px",fontSize:13,color:"#333",lineHeight:1.7}}>{sel.descripcion}</div>
          </div>
          {msgs.length===0&&(
            <div style={{background:"white",borderRadius:16,padding:"20px",textAlign:"center",boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:11,color:"#aaa"}}>Sin mensajes — respondé abajo para iniciar el diálogo</div>
            </div>
          )}
          {msgs.map((m,i)=>{
            const esAdmin = m.sender_rol==="admin";
            return(
              <div key={m.id||i} style={{background:"white",borderRadius:16,overflow:"hidden",
                boxShadow:"0 1px 8px rgba(0,0,0,.06)",borderLeft:`4px solid ${esAdmin?"#00c1fc":"#e0e0e0"}`}}>
                <div style={{background:"#f8f9fa",padding:"10px 16px",borderBottom:"1px solid #e8e8e8",
                  display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                    background:esAdmin?"#00c1fc22":"#e8e8e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>
                    {esAdmin?"👨‍💼":"👤"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:12,color:esAdmin?"#00c1fc":"#1a1a1a"}}>
                      {esAdmin?"Administración":m.sender_nombre}
                    </div>
                    <div style={{fontSize:10,color:"#aaa"}}>
                      {new Date(m.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                      {" · "}{new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                </div>
                <div style={{padding:"12px 16px",fontSize:13,color:"#333",lineHeight:1.7}}>{m.texto}</div>
              </div>
            );
          })}
          {abierto&&(
            <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.08)"}}>
              <div style={{background:"#f8f9fa",padding:"10px 16px",borderBottom:"1px solid #e8e8e8",
                fontSize:11,fontWeight:800,color:"#777"}}>↩ RESPONDER COMO ADMINISTRACIÓN</div>
              <div style={{padding:"12px 16px"}}>
                <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                  placeholder="Escribí tu respuesta oficial..."
                  rows={3} style={{width:"100%",boxSizing:"border-box",background:"#f7f7f7",
                    border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px 14px",fontSize:13,
                    outline:"none",resize:"none",color:"#1a1a1a",fontFamily:"Nunito,sans-serif",fontWeight:600,marginBottom:10}}/>
                <button onClick={sendMsg} disabled={saving||!newMsg.trim()}
                  style={{width:"100%",background:saving?"#ccc":"#00c1fc",border:"none",borderRadius:50,
                    color:"white",padding:"11px",fontWeight:800,fontSize:13,
                    cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {saving?"Enviando...":"Enviar respuesta oficial ↩"}
                </button>
              </div>
            </div>
          )}
          <div style={{height:16}}/>
        </div>
      </div>
    );
  }  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20}}>🚩 Reportes</div>
        </div>
        {/* Resumen de conteos */}
        <div style={{display:"flex",gap:6,marginTop:12,overflowX:"auto"}}>
          {[["todos","Todos",null],...ESTADOS.map(e=>[e,ESTADO_LABEL2[e],ESTADO_COL[e]])].map(([val,label,col])=>(
            <button key={val} onClick={()=>setFiltro(val)}
              style={{background:filtro===val?"rgba(255,255,255,.3)":"rgba(255,255,255,.12)",
                border:`1.5px solid ${filtro===val?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`,
                borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:800,
                color:"white",cursor:"pointer",whiteSpace:"nowrap",
                fontFamily:"Nunito,sans-serif",flexShrink:0}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {!loading&&reports.length===0&&(
          <div style={{textAlign:"center",color:"#aaa",padding:32,background:"white",borderRadius:16,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            Sin reportes {filtro!=="todos"?`en estado "${ESTADO_LABEL2[filtro]}"`:""} 
          </div>
        )}
        {reports.map(r=>{
          const tipoInfo = REPORTE_TIPOS.find(t=>t.id===r.tipo)||{icon:"📋",label:r.tipo,col:"#64748b"};
          const estCol   = ESTADO_COL[r.estado]||"#94a3b8";
          return(
            <div key={r.id} onClick={()=>openSel(r)}
              style={{background:"white",borderRadius:16,marginBottom:8,cursor:"pointer",
                boxShadow:"0 1px 8px rgba(0,0,0,.06)",overflow:"hidden",
                borderLeft:`4px solid ${estCol}`}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:12,background:tipoInfo.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {tipoInfo.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <span style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{tipoInfo.label}</span>
                    <span style={{background:estCol+"22",color:estCol,borderRadius:99,
                      padding:"1px 7px",fontSize:10,fontWeight:800}}>{ESTADO_LABEL2[r.estado]}</span>
                  </div>
                  <div style={{fontSize:11,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {r.descripcion}
                  </div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>
                    {r.reporter_nombre||"Anónimo"} · {new Date(r.created_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <span style={{color:"#ddd",fontSize:18,flexShrink:0}}>›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — AULAS
// ════════════════════════════════════════════════════════════

export default AdminReportes;
