import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, displayName } from "../shared/index";

// ── Toque ──────────────────────────────────────────────────────
function ConfirmToque({friend, onConfirm, onCancel, accent, cardBg, txt, sub, inputBg}){
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onCancel();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
        display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:cardBg,borderRadius:"20px 20px 0 0",padding:24,
        width:"100%",maxWidth:480,fontFamily:"Nunito,sans-serif"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:36,marginBottom:8}}>👋</div>
          <div style={{fontWeight:900,fontSize:17,color:txt,marginBottom:4}}>
            Mandar un toque a {displayName(friend)}
          </div>
          <div style={{fontSize:13,color:sub,lineHeight:1.5}}>
            Le vas a avisar que pasaste por su perfil. ¿Confirmás?
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel}
            style={{flex:1,background:inputBg,border:"none",borderRadius:50,
              color:sub,padding:"13px",fontWeight:800,fontSize:14,
              cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{flex:1,background:accent,border:"none",borderRadius:50,
              color:"white",padding:"13px",fontWeight:800,fontSize:14,
              cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            👋 Mandar
          </button>
        </div>
      </div>
    </div>
  );
}

function AAmigos({me, showToast, onBack, onOpenPerfil, onOpenChat}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg,inputBg,inputBd,navBord} = useTheme();

  const [tab,       setTab]     = useState("amigos"); // amigos | solicitudes | grupos
  const [friends,   setFriends] = useState([]);
  const [pending,   setPending] = useState([]);  // recibidas
  const [sent,      setSent]    = useState([]);   // enviadas
  const [groups,    setGroups]  = useState([]);
  const [search,    setSearch]  = useState("");
  const [results,   setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading,   setLoading] = useState(true);
  const [toqueTarget, setToqueTarget] = useState(null); // amigo para confirmar toque

  // Cargar amigos
  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const d = await api.chatFriends();
      const all = Array.isArray(d) ? d : (d?.data||[]);
      setFriends(all.filter(f=>f.estado==="accepted"));
      setPending(all.filter(f=>f.estado==="pending"&&!f.soy_requester));
      setSent(all.filter(f=>f.estado==="pending"&&f.soy_requester));
    }catch(e){}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{ load(); },[load]);

  // Buscar usuarios
  useEffect(()=>{
    if(search.trim().length<2){ setResults([]); return; }
    setSearching(true);
    const t = setTimeout(()=>{
      api.chatSearch(search.trim())
        .then(d=>setResults(Array.isArray(d)?d:(d?.data||[])))
        .catch(()=>[])
        .finally(()=>setSearching(false));
    }, 350);
    return ()=>clearTimeout(t);
  },[search]);

  const sendRequest = async(userId)=>{
    try{
      await api.chatFriendReq(userId);
      showToast("Solicitud enviada ✅");
      setResults(prev=>prev.map(u=>u.id===userId
        ? {...u, friendship_estado:"pending"} : u));
    }catch(e){ showToast(e.message||"Error","error"); }
  };

  const accept = async(friendshipId)=>{
    try{
      await api.chatFriendAccept(friendshipId);
      showToast("¡Ahora son amigos! 🎉");
      load();
    }catch(e){ showToast(e.message||"Error","error"); }
  };

  const reject = async(friendshipId)=>{
    try{
      await api.chatFriendReject(friendshipId);
      load();
    }catch(e){ showToast(e.message||"Error","error"); }
  };

  const sendToque = async()=>{
    if(!toqueTarget) return;
    try{
      // Send notification via API
      await api.sendNotification?.({
        to_user_id: toqueTarget.user_id,
        type: "toque",
        message: `${displayName(me)} te mandó un 👋 toque`,
      }).catch(()=>{});
      showToast(`👋 Toque enviado a ${displayName(toqueTarget)}`);
    }catch(e){ showToast("Toque enviado 👋"); }
    finally{ setToqueTarget(null); }
  };

  const card = {background:cardBg,borderRadius:16,
    boxShadow:dark?"0 2px 12px rgba(0,0,0,.25)":"0 2px 12px rgba(0,0,0,.06)"};

  const TABS = [
    {id:"amigos",     label:`👥 Amigos${friends.length?` (${friends.length})`:""}` },
    {id:"solicitudes",label:`📩 Solicitudes${pending.length?` (${pending.length})`:""}` },
    {id:"grupos",     label:"🫂 Grupos"},
  ];

  return(
    <div style={{background:bg,minHeight:"100vh",fontFamily:"Nunito,sans-serif"}}>
      <OHdrA title="👥 Amigos" onBack={onBack}/>

      {/* Buscador */}
      <div style={{padding:"12px 14px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,
          background:inputBg,borderRadius:50,padding:"10px 16px",
          border:`1.5px solid ${inputBd}`}}>
          <span style={{fontSize:16}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar compañeros..."
            style={{flex:1,background:"none",border:"none",outline:"none",
              fontSize:14,fontWeight:600,color:txt,fontFamily:"Nunito,sans-serif"}}/>
          {search&&(
            <button onClick={()=>setSearch("")}
              style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:14}}>✕</button>
          )}
        </div>

        {/* Resultados de búsqueda */}
        {(search.length>=2)&&(
          <div style={{marginTop:10}}>
            {searching&&<div style={{textAlign:"center",color:sub,fontSize:13,padding:8}}>Buscando...</div>}
            {!searching&&results.length===0&&search.length>=2&&(
              <div style={{textAlign:"center",color:sub,fontSize:13,padding:8}}>Sin resultados</div>
            )}
            {results.map(u=>(
              <div key={u.id} style={{...card,padding:"10px 14px",marginBottom:8,
                display:"flex",alignItems:"center",gap:10}}>
                <Av user={u} sz={40} avatarBg={u.avatar_bg}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {displayName(u)}
                  </div>
                  <div style={{fontSize:11,color:sub}}>
                    {u.rol==="teacher"?"👨‍🏫 Docente":u.rol==="admin"?"⚙️ Admin":"🎓 Alumno"}
                  </div>
                </div>
                {u.friendship_estado==="accepted"
                  ? <span style={{fontSize:11,color:"#10b981",fontWeight:800}}>👥 Amigos</span>
                  : u.friendship_estado==="pending"
                  ? <span style={{fontSize:11,color:sub,fontWeight:700}}>⏳ Pendiente</span>
                  : <button onClick={()=>sendRequest(u.id)}
                      style={{background:accent,border:"none",borderRadius:99,
                        color:"white",padding:"6px 14px",fontSize:12,fontWeight:800,
                        cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      + Agregar
                    </button>
                }
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${navBord}`,
        background:cardBg,marginTop:12,padding:"0 4px"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"11px 4px",background:"none",border:"none",
              fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif",
              color:tab===t.id?accent:sub,
              borderBottom:`2.5px solid ${tab===t.id?accent:"transparent"}`}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px 32px"}}>

        {/* ── Tab Amigos ─────────────────────────────────── */}
        {tab==="amigos"&&(
          <>
            {loading&&<div style={{textAlign:"center",color:sub,padding:24}}>Cargando...</div>}
            {!loading&&friends.length===0&&(
              <div style={{textAlign:"center",padding:32,color:sub}}>
                <div style={{fontSize:40,marginBottom:8}}>👋</div>
                <div style={{fontWeight:700}}>Todavía no tenés amigos</div>
                <div style={{fontSize:12,marginTop:4}}>Buscá a tus compañeros arriba</div>
              </div>
            )}
            {friends.map(f=>(
              <div key={f.friendship_id} style={{...card,padding:"12px 14px",
                marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                <div onClick={()=>onOpenPerfil&&onOpenPerfil(f.user_id)}
                  style={{cursor:"pointer",flexShrink:0}}>
                  <Av user={f} sz={44} avatarBg={f.avatar_bg}/>
                </div>
                <div onClick={()=>onOpenPerfil&&onOpenPerfil(f.user_id)}
                  style={{flex:1,minWidth:0,cursor:"pointer"}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {displayName(f)}
                  </div>
                  <div style={{fontSize:11,color:sub,marginTop:1}}>
                    Toca para ver perfil
                  </div>
                </div>
                {/* Acciones */}
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>setToqueTarget(f)}
                    title="Mandar toque"
                    style={{background:inputBg,border:"none",borderRadius:99,
                      padding:"7px 10px",fontSize:14,cursor:"pointer"}}>
                    👋
                  </button>
                  <button onClick={()=>onOpenChat&&onOpenChat(f)}
                    title="Abrir chat"
                    style={{background:accent+"22",border:"none",borderRadius:99,
                      padding:"7px 10px",fontSize:14,cursor:"pointer"}}>
                    💬
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Tab Solicitudes ────────────────────────────── */}
        {tab==="solicitudes"&&(
          <>
            {pending.length>0&&(
              <>
                <div style={{fontSize:12,fontWeight:700,color:sub,marginBottom:8}}>
                  📩 Recibidas ({pending.length})
                </div>
                {pending.map(f=>(
                  <div key={f.friendship_id} style={{...card,padding:"12px 14px",
                    marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                    <Av user={f} sz={40} avatarBg={f.avatar_bg}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:800,fontSize:14,color:txt}}>
                        {displayName(f)}
                      </div>
                      <div style={{fontSize:11,color:sub}}>Quiere ser tu amigo</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>accept(f.friendship_id)}
                        style={{background:"#10b981",border:"none",borderRadius:99,
                          color:"white",padding:"7px 14px",fontSize:12,fontWeight:800,
                          cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                        ✓
                      </button>
                      <button onClick={()=>reject(f.friendship_id)}
                        style={{background:inputBg,border:"none",borderRadius:99,
                          color:sub,padding:"7px 12px",fontSize:12,fontWeight:700,
                          cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {sent.length>0&&(
              <>
                <div style={{fontSize:12,fontWeight:700,color:sub,
                  marginBottom:8,marginTop:pending.length?16:0}}>
                  📤 Enviadas ({sent.length})
                </div>
                {sent.map(f=>(
                  <div key={f.friendship_id} style={{...card,padding:"12px 14px",
                    marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                    <Av user={f} sz={40} avatarBg={f.avatar_bg}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:14,color:txt}}>
                        {displayName(f)}
                      </div>
                    </div>
                    <span style={{fontSize:11,color:sub,fontWeight:700}}>⏳ Pendiente</span>
                  </div>
                ))}
              </>
            )}
            {pending.length===0&&sent.length===0&&(
              <div style={{textAlign:"center",padding:32,color:sub}}>
                <div style={{fontSize:40,marginBottom:8}}>📭</div>
                <div style={{fontWeight:700}}>Sin solicitudes</div>
              </div>
            )}
          </>
        )}

        {/* ── Tab Grupos ─────────────────────────────────── */}
        {tab==="grupos"&&(
          <div style={{textAlign:"center",padding:32,color:sub}}>
            <div style={{fontSize:40,marginBottom:8}}>🫂</div>
            <div style={{fontWeight:700,color:txt,marginBottom:4}}>Grupos</div>
            <div style={{fontSize:12,lineHeight:1.6}}>
              Próximamente podés crear grupos con tus amigos para chatear juntos.
            </div>
            <button style={{marginTop:16,background:accent+"22",border:"none",
              borderRadius:99,padding:"10px 20px",color:accent,fontWeight:800,
              fontSize:13,cursor:"default",fontFamily:"Nunito,sans-serif"}}>
              🔜 Próximamente
            </button>
          </div>
        )}
      </div>

      {/* Modal confirmar toque */}
      {toqueTarget&&(
        <ConfirmToque
          friend={toqueTarget}
          onConfirm={sendToque}
          onCancel={()=>setToqueTarget(null)}
          accent={accent} cardBg={cardBg} txt={txt} sub={sub} inputBg={inputBg}
        />
      )}
    </div>
  );
}

export default AAmigos;
