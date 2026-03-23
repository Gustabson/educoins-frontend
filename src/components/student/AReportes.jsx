import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";
import { REPORTE_TIPOS, ESTADO_LABEL, ESTADO_COLOR } from "../../constants";

function AReportes({me,showToast,onBack}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, inputBd, navBord} = useTheme();
  const [vista,setVista]       = useState("lista"); // "lista" | "nuevo" | "chat"
  const [reporteSel,setRepSel] = useState(null);
  const [tipo,setTipo]         = useState(null);
  const [desc,setDesc]         = useState("");
  const [anon,setAnon]         = useState(false);
  const [enviados,setEnviados] = useState([]);
  const [msgs,setMsgs]         = useState([]);
  const [newMsg,setNewMsg]     = useState("");
  const [loading,setLoading]   = useState(true);
  const [enviando,setEnviando] = useState(false);
  const [sending,setSending]   = useState(false);
  const bottomRef              = useRef(null);


  const loadList = () => {
    api.myReports()
      .then(d=>setEnviados(d.data||d||[]))
      .catch(()=>setEnviados([]))
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ loadList(); },[]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  const openChat = async(r) => {
    setRepSel(r);
    setMsgs([]);
    setVista("chat");
    try{
      const d = await api.reportMessages(r.id);
      setMsgs(d.data||d||[]);
    }catch(e){ showToast("Error al cargar mensajes","error"); }
  };

  const enviar = async() => {
    if(!tipo){showToast("Elegí un tipo","error");return;}
    if(!desc.trim()||desc.length<10){showToast("Descripción muy corta (mín. 10 caracteres)","error");return;}
    setEnviando(true);
    try{
      await api.createReport({tipo:tipo.id, descripcion:desc.trim(), anonimo:anon});
      showToast("Reporte enviado ✅");
      setTipo(null);setDesc("");setAnon(false);
      setVista("lista");
      if(!anon) loadList();
    }catch(e){ showToast(e.message||"Error","error"); }
    finally{ setEnviando(false); }
  };

  const sendMsg = async() => {
    if(!newMsg.trim()) return;
    setSending(true);
    try{
      const d = await api.sendReportMsg(reporteSel.id, newMsg.trim());
      const nuevoMsg = d.data || d;
      setMsgs(prev=>[...prev, nuevoMsg]);
      setNewMsg("");
      // Refrescar el reporte para tener el estado actualizado
      const lista = await api.myReports().catch(()=>({data:[]}));
      const todos = lista.data || lista || [];
      setEnviados(todos);
      const actualizado = todos.find(r=>r.id===reporteSel.id);
      if(actualizado) setRepSel(actualizado);
    }catch(e){ showToast("Error al enviar","error"); }
    finally{ setSending(false); }
  };

  // ── Vista: correo de un reporte ──────────────────────────
  if(vista==="chat"&&reporteSel){
    const tipoInfo = REPORTE_TIPOS.find(t=>t.id===reporteSel.tipo)||REPORTE_TIPOS[4];
    const estCol   = ESTADO_COLOR[reporteSel.estado]||"#94a3b8";
    const abierto  = reporteSel.estado!=="resuelto"&&reporteSel.estado!=="descartado";
    return(
      <div style={{background:bg,minHeight:"100vh"}}>
        {/* Header */}
        <div style={{background:accent,position:"sticky",top:0,zIndex:50,
          padding:"16px 16px 20px",color:"white",
          textShadow:dark?"none":"0 1px 4px rgba(0,60,100,.4)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>{setVista("lista");loadList();}}
              style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
                color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:15}}>Caso #{reporteSel.id?.slice(0,8).toUpperCase()}</div>
              <div style={{fontSize:11,opacity:.85}}>{tipoInfo.icon} {tipoInfo.label}</div>
            </div>
            <span style={{background:"rgba(255,255,255,.2)",borderRadius:99,
              padding:"3px 10px",fontSize:10,fontWeight:800}}>
              {ESTADO_LABEL[reporteSel.estado]}
            </span>
          </div>
        </div>

        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>

          {/* Mensaje inicial — como un correo */}
          <div style={{background:cardBg,borderRadius:16,overflow:"hidden",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)"}}>
            {/* Cabecera del correo */}
            <div style={{background:inputBg,padding:"12px 16px",
              borderBottom:`1px solid ${navBord}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:tipoInfo.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                  {tipoInfo.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:txt}}>Tú</div>
                  <div style={{fontSize:10,color:sub}}>Para: Administración escolar</div>
                </div>
                <div style={{fontSize:10,color:sub,textAlign:"right"}}>
                  {new Date(reporteSel.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                  <br/>{new Date(reporteSel.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:sub}}>
                Asunto: <span style={{color:tipoInfo.col}}>[{tipoInfo.label.toUpperCase()}]</span> Reporte #{reporteSel.id?.slice(0,8).toUpperCase()}
              </div>
            </div>
            {/* Cuerpo */}
            <div style={{padding:"14px 16px",fontSize:13,color:txt,lineHeight:1.7}}>
              {reporteSel.descripcion}
            </div>
          </div>

          {/* Respuestas — estilo hilo de correo */}
          {msgs.length===0&&(
            <div style={{background:cardBg,borderRadius:16,padding:"20px 16px",textAlign:"center",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:24,marginBottom:6}}>📬</div>
              <div style={{fontSize:13,fontWeight:700,color:txt}}>Esperando respuesta</div>
              <div style={{fontSize:11,color:sub,marginTop:3}}>La administración revisará tu reporte pronto</div>
            </div>
          )}

          {msgs.map((m,i)=>{
            const esAdmin = m.sender_rol==="admin";
            return(
              <div key={m.id||i} style={{background:cardBg,borderRadius:16,overflow:"hidden",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)",
                borderLeft:esAdmin?`4px solid ${accent}`:`4px solid ${navBord}`}}>
                {/* Cabecera del mensaje */}
                <div style={{background:inputBg,padding:"10px 16px",
                  borderBottom:`1px solid ${navBord}`,
                  display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                    background:esAdmin?accent+"22":navBord,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                    {esAdmin?"👨‍💼":"👤"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:12,color:esAdmin?accent:txt}}>
                      {esAdmin?"Administración escolar":m.sender_nombre}
                    </div>
                    <div style={{fontSize:10,color:sub}}>
                      {new Date(m.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short",year:"numeric"})}
                      {" a las "}
                      {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  {i===msgs.length-1&&<span style={{fontSize:10,color:sub}}>Último</span>}
                </div>
                {/* Cuerpo */}
                <div style={{padding:"12px 16px",fontSize:13,color:txt,lineHeight:1.7}}>
                  {m.texto}
                </div>
              </div>
            );
          })}

          {/* Responder */}
          {abierto?(
            <div style={{background:cardBg,borderRadius:16,overflow:"hidden",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)"}}>
              <div style={{background:inputBg,padding:"10px 16px",
                borderBottom:`1px solid ${navBord}`,
                fontSize:11,fontWeight:800,color:sub}}>
                ↩ RESPONDER
              </div>
              <div style={{padding:"12px 16px"}}>
                <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                  placeholder="Escribí tu respuesta..."
                  rows={3} style={{width:"100%",boxSizing:"border-box",
                    background:inputBg,border:`1.5px solid ${inputBd}`,borderRadius:12,
                    padding:"10px 14px",fontSize:13,outline:"none",resize:"none",
                    color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600,marginBottom:10}}/>
                <button onClick={sendMsg} disabled={sending||!newMsg.trim()}
                  style={{width:"100%",background:sending?"#ccc":accent,border:"none",
                    borderRadius:50,color:"white",padding:"11px",fontWeight:800,fontSize:13,
                    cursor:sending?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {sending?"Enviando...":"Enviar respuesta ↩"}
                </button>
              </div>
            </div>
          ):(
            <div style={{background:cardBg,borderRadius:16,padding:"16px",textAlign:"center",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <span style={{background:estCol+"22",color:estCol,borderRadius:99,
                padding:"5px 14px",fontSize:12,fontWeight:800}}>
                Caso {ESTADO_LABEL[reporteSel.estado]} — cerrado
              </span>
            </div>
          )}

          <div style={{height:20}}/>
        </div>
      </div>
    );
  }

  // ── Vista: formulario nuevo reporte ──────────────────────
  if(vista==="nuevo") return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🚩 Nuevo Reporte" onBack={()=>setVista("lista")}/>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:cardBg,borderRadius:20,padding:16,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>

          <div style={{fontWeight:800,color:txt,marginBottom:10,fontSize:13}}>¿Qué querés reportar?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {REPORTE_TIPOS.map(t=>(
              <div key={t.id} onClick={()=>setTipo(t)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:14,
                  cursor:"pointer",transition:"all .2s",
                  background:tipo?.id===t.id?t.col+"22":inputBg,
                  border:`1.5px solid ${tipo?.id===t.id?t.col:navBord}`}}>
                <span style={{fontSize:18}}>{t.icon}</span>
                <span style={{fontSize:12,fontWeight:800,color:tipo?.id===t.id?t.col:txt}}>{t.label}</span>
              </div>
            ))}
          </div>

          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="Describí lo que pasó con el mayor detalle posible..."
            rows={5} style={{width:"100%",boxSizing:"border-box",background:inputBg,
              border:`1.5px solid ${inputBd}`,borderRadius:14,padding:"11px 14px",fontSize:13,
              outline:"none",color:txt,fontFamily:"Nunito,sans-serif",resize:"none",fontWeight:600,marginBottom:10}}/>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,cursor:"pointer"}}
            onClick={()=>setAnon(a=>!a)}>
            <div style={{width:22,height:22,borderRadius:6,transition:"all .2s",
              border:`2px solid ${anon?"#3b82f6":navBord}`,
              background:anon?"#3b82f6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {anon&&<span style={{color:"white",fontSize:12,fontWeight:900}}>✓</span>}
            </div>
            <span style={{fontSize:13,fontWeight:700,color:txt}}>Enviar de forma anónima</span>
            <span style={{fontSize:11,color:sub}}>(sin respuesta)</span>
          </div>

          <button onClick={enviar} disabled={enviando}
            style={{width:"100%",background:enviando?"#ccc":accent,border:"none",borderRadius:50,
              color:"white",padding:"13px",fontWeight:800,fontSize:14,
              cursor:enviando?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif",
              boxShadow:enviando?"none":`0 4px 16px ${accent}44`}}>
            {enviando?"Enviando...":"Enviar reporte 🚩"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Vista: lista de reportes ──────────────────────────────
  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🚩 Reportes" onBack={onBack}/>
      <div style={{padding:"12px 14px"}}>
        <button onClick={()=>setVista("nuevo")}
          style={{width:"100%",background:accent,border:"none",borderRadius:16,
            color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
            fontFamily:"Nunito,sans-serif",marginBottom:14,
            boxShadow:`0 4px 16px ${accent}44`}}>
          + Nuevo reporte
        </button>

        <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:8}}>Mis reportes</div>
        {loading&&<div style={{textAlign:"center",color:sub,padding:20}}>Cargando...</div>}
        {!loading&&enviados.length===0&&(
          <div style={{background:cardBg,borderRadius:16,padding:24,textAlign:"center",
            color:sub,fontSize:13,boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            No tenés reportes enviados aún
          </div>
        )}
        {enviados.map((r,i)=>{
          const t = REPORTE_TIPOS.find(x=>x.id===r.tipo)||REPORTE_TIPOS[4];
          const estCol = ESTADO_COLOR[r.estado]||"#94a3b8";
          return(
            <div key={i} onClick={()=>!r.anonimo&&openChat(r)}
              style={{background:cardBg,borderRadius:16,padding:"12px 14px",marginBottom:8,
                cursor:r.anonimo?"default":"pointer",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                border:`1.5px solid ${dark?"transparent":"#f0f0f0"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:12,background:t.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {t.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:13,color:txt}}>{t.label}</div>
                  <div style={{fontSize:11,color:sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {r.descripcion}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <span style={{background:estCol+"22",color:estCol,borderRadius:99,
                    padding:"3px 8px",fontSize:10,fontWeight:800,display:"block",marginBottom:4}}>
                    {ESTADO_LABEL[r.estado]||r.estado}
                  </span>
                  {!r.anonimo&&<span style={{fontSize:10,color:accent}}>Ver chat →</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VISTA MAESTRA
// ════════════════════════════════════════════════════════════

export default AReportes;
