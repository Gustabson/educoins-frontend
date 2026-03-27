import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_SECTIONS } from "../../constants";
import { api, connectSocket, getSocket } from "../../api";;
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, Sheet, Toast, WCard, displayName, useToast } from "../shared/index";


function useChatSocket(token, onMessage, onTyping) {
  const socketRef  = useRef(null);
  const onMsgRef   = useRef(onMessage);
  const onTypRef   = useRef(onTyping);

  // Mantener las refs actualizadas sin re-subscribir
  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypRef.current = onTyping;  }, [onTyping]);

  useEffect(() => {
    const s = connectSocket(token);
    socketRef.current = s;

    const handleMsg    = (m) => onMsgRef.current(m);
    const handleTyping = (d) => onTypRef.current(d);

    s.on('new_message',  handleMsg);
    s.on('user_typing',  handleTyping);

    // Unirse a rooms cuando el socket esté listo
    if (s.connected) {
      s.emit('join_global');
      s.emit('join_classroom');
    } else {
      s.once('connect', () => {
        s.emit('join_global');
        s.emit('join_classroom');
      });
    }

    return () => {
      s.off('new_message',  handleMsg);
      s.off('user_typing',  handleTyping);
    };
  }, [token]); // solo se ejecuta una vez por token

  return socketRef;
}

function AChat({me, showToast, onBack, nameColorConfig, onOpenPerfil, initialFriend, onChatOpened}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg, inputBg, inputBd, navBord, navInact} = useTheme();
  const [sec, setSec]           = useState(0);
  const [friend, setFriend]     = useState(null);
  const [friends, setFriends]   = useState([]);
  const [pendientes, setPend]   = useState([]);
  const [classInfo, setClass]   = useState(null);
  const [globalMsgs, setGlobal] = useState([]);
  const globalConvIdRef = useRef(null);
  const classConvIdRef  = useRef(null);
  const personalConvIdRef = useRef(null);
  const [classMsgs,  setClass_] = useState([]);
  const [personMsgs, setPerson] = useState([]);
  const [convId, setConvId]     = useState(null);
  const [msg, setMsg]           = useState("");
  const [typing, setTyping]     = useState(null);
  const [search, setSearch]     = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);
  // perfilUserId manejado en Alumno via onOpenPerfil prop
  // Emoji picker
  const [emojiOpen,    setEmojiOpen]    = useState(false);
  const [optionsOpen,  setOptionsOpen]  = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [addOpen,       setAddOpen]      = useState(false);
  const [groups,        setGroups]       = useState([]);
  const [activeGroup,   setActiveGroup]  = useState(null);
  const [groupMsgs,     setGroupMsgs]    = useState([]);
  const [groupPanel,    setGroupPanel]   = useState(false); // panel de admin/info
  const [groupFriends,  setGroupFriends] = useState([]);    // mis amigos para invitar
  const groupConvIdRef = useRef(null);
  const [emojiPacks, setEmojiPacks]   = useState([]); // packs desbloqueados
  const bottomRef               = useRef(null);
  const typingTimer             = useRef(null);
  const token                   = localStorage.getItem("ec_token");

  const bg       = pageBg;
  const inputBord= navBord;

  // Cargar emoji packs del usuario
  useEffect(()=>{
    api.customMe().then(d=>{
      const owned = (d.data||d)?.owned||[];
      const packs = owned.filter(o=>o.tipo==="emoji_pack").map(o=>{
        const cfg = typeof o.config==="string"?JSON.parse(o.config||"{}"):o.config||{};
        return { id:o.id, nombre:o.nombre, emojis:cfg.emojis||[], preview:cfg.preview||o.preview };
      });
      setEmojiPacks(packs);
    }).catch(()=>{});
  },[]);

  // WebSocket — onMessage SIN dependencias, solo usa refs
  const onMessage = useCallback((m) => {
    if (!m?.conversation_id) return;
    if (globalConvIdRef.current === m.conversation_id) {
      setGlobal(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    } else if (classConvIdRef.current === m.conversation_id) {
      setClass_(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    } else if (personalConvIdRef.current === m.conversation_id) {
      setPerson(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    } else if (groupConvIdRef.current === m.conversation_id) {
      setGroupMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    }
  }, []); // sin dependencias — nunca se re-registra

  const onTyping = useCallback(({nombre, conversation_id}) => {
    setTyping(nombre);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(null), 2000);
  }, []);

  const socketRef = useChatSocket(token, onMessage, onTyping);

  // Cargar datos iniciales
  useEffect(() => {
    Promise.all([
      api.chatFriends().catch(()=>({data:[]})),
      api.chatClassroomInfo().catch(()=>({data:null})),
      api.chatGlobalMsgs().catch(()=>({data:[]})),
    ]).then(([fr, cl, gl]) => {
      const all = fr.data || fr || [];
      setFriends(all.filter(f=>f.estado==='accepted'));
      setPend(all.filter(f=>f.estado==='pending' && !f.soy_requester));
      setClass(cl.data || cl);
      if ((cl.data||cl)?.conversation_id) classConvIdRef.current = (cl.data||cl).conversation_id;
      const gMsgs = (gl.data || gl || []);
      setGlobal(gMsgs);
      setLoading(false);
    });
    // Obtener el conversation_id del global por separado (funciona aunque no haya mensajes)
    api.chatGlobalInfo().then(d => {
      const cid = d.conversation_id || d.data?.conversation_id;
      if (cid) globalConvIdRef.current = cid;
    }).catch(()=>{});

    // Cargar grupos y joinear sus rooms de socket
    api.myGroups().then(d => {
      const gs = d || [];
      setGroups(gs);
      const s = getSocket();
      if (s) gs.forEach(g => s.emit('join_group', g.conversation_id));
    }).catch(()=>{});
  }, []);

  // Cargar mensajes del aula cuando se selecciona esa tab
  useEffect(() => {
    if (sec === 2 && classInfo && classMsgs.length === 0) {
      api.chatClassroomMsgs().then(d => {
        setClass_((d.data||d||[]).map(m=>({...m,conversation_id:classInfo.conversation_id})));
        const s = getSocket();
        if (s) s.emit('join_classroom');
      }).catch(()=>{});
    }
  }, [sec, classInfo]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  }, [globalMsgs, classMsgs, personMsgs, sec, friend]);

  // Abrir directamente con initialFriend si viene de AAmigos
  useEffect(() => {
    if (initialFriend) {
      openFriend(initialFriend);
      onChatOpened?.();
    }
  }, []); // eslint-disable-line

  // Recargar grupos al entrar a la tab Grupos
  useEffect(() => {
    if (sec === 1) {
      api.myGroups().then(d => {
        const gs = d || [];
        setGroups(gs);
        const s = getSocket();
        if (s) gs.forEach(g => s.emit('join_group', g.conversation_id));
      }).catch(()=>{});
    }
  }, [sec]);

  // Escuchar group_added para refrescar la lista en tiempo real
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onGroupAdded = (data) => {
      api.myGroups().then(d => {
        const gs = d || [];
        setGroups(gs);
        if (data?.conversation_id) s.emit('join_group', data.conversation_id);
      }).catch(()=>{});
    };
    s.on('group_added', onGroupAdded);
    return () => s.off('group_added', onGroupAdded);
  }, []);

  // Abrir chat personal con un amigo
  const openFriend = async (f) => {
    setFriend(f);
    setPerson([]);
    setConvId(null);
    try {
      const d = await api.chatPersonalMsgs(f.user_id);
      const data = d.data || d;
      // El backend devuelve { messages: [...], conversation_id: "..." }
      const msgs = data.messages || (Array.isArray(data) ? data : []);
      const cid  = data.conversation_id || msgs[0]?.conversation_id || null;
      setPerson(msgs);
      setConvId(cid);
      if (cid) {
        personalConvIdRef.current = cid;
        const s = getSocket();
        if (s) s.emit('join_personal', cid);
      }
    } catch(e) {
      showToast("Error al cargar el chat","error");
      console.error("openFriend error:", e);
    }
  };

  const openGroup = async (g) => {
    setActiveGroup(g);
    setGroupMsgs([]);
    groupConvIdRef.current = null;
    try {
      const d = await api.groupMsgs(g.conversation_id);
      const data = d.data || d;
      const msgs = data.messages || [];
      setGroupMsgs(msgs);
      groupConvIdRef.current = g.conversation_id;
      const s = getSocket();
      if (s) s.emit('join_group', g.conversation_id);
    } catch(e) {
      showToast("Error al cargar el grupo","error");
    }
  };

  const sendMsg = () => {
    const s = getSocket();
    const textoClean = msg.trim();
    if (!textoClean) return;

    let type, conversation_id;
    if (friend) {
      type = 'personal';
      conversation_id = convId;
    } else if (activeGroup) {
      type = 'group';
      conversation_id = activeGroup.conversation_id;
    } else if (sec === 2) {
      type = 'classroom';
      conversation_id = classInfo?.conversation_id;
    } else {
      type = 'global';
      conversation_id = globalConvIdRef.current ||
        globalMsgs.find(m => m.conversation_id)?.conversation_id;
    }

    if (!conversation_id) {
      showToast("No se pudo obtener la conversacion","error");
      return;
    }

    if (s) {
      s.emit('send_message', { conversation_id, texto: textoClean, type });
    }
    setMsg("");
  };

  const emitTyping = () => {
    const s = getSocket();
    if (!s) return;
    let type, cid;
    if (friend)       { type='personal';  cid=convId; }
    else if(activeGroup){ type='group';   cid=activeGroup.conversation_id; }
    else if(sec===2)  { type='classroom'; cid=classInfo?.conversation_id; }
    else              { type='global';    cid=null; }
    s.emit('typing', { conversation_id: cid, type });
  };

  // Buscar usuarios para agregar
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      api.chatSearch(search).then(d=>setResults(d.data||d||[])).catch(()=>[]);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const sendFriendReq = async (userId) => {
    try {
      await api.chatFriendReq(userId);
      showToast("Solicitud enviada 📨");
      setResults(prev => prev.map(u => u.id===userId ? {...u, friendship_estado:'pending'} : u));
    } catch(e) {
      showToast(e.message||"Error al enviar solicitud","error");
    }
  };

  const acceptFriend = async (friendshipId) => {
    try {
      await api.chatFriendAccept(friendshipId);
      showToast("Amistad aceptada! 🎉");
      // Recargar lista con pequeño delay para que el backend procese
      setTimeout(async () => {
        const updated = await api.chatFriends();
        const all = updated.data || updated || [];
        setFriends(all.filter(f=>f.estado==='accepted'));
        setPend(all.filter(f=>f.estado==='pending'&&!f.soy_requester));
      }, 500);
    } catch(e) {
      // Si ya fue aceptada (ej: doble click), refrescar silenciosamente
      if (e.message?.includes('NOT_FOUND') || e.message?.includes('404')) {
        const updated = await api.chatFriends().catch(()=>({data:[]}));
        const all = updated.data || updated || [];
        setFriends(all.filter(f=>f.estado==='accepted'));
        setPend(all.filter(f=>f.estado==='pending'&&!f.soy_requester));
      } else {
        showToast(e.message||"Error al aceptar","error");
      }
    }
  };

  const rejectFriend = async (friendshipId) => {
    try {
      await api.chatFriendReject(friendshipId);
      setPend(prev => prev.filter(f=>f.friendship_id!==friendshipId));
      showToast("Solicitud rechazada");
    } catch(e) {
      showToast(e.message||"Error","error");
    }
  };

  // ── Render chat grupal ───────────────────────────────────────
  if (activeGroup) {
    const isAdmin = activeGroup.my_rol === 'owner';
    const canInvite = isAdmin || activeGroup.allow_invites;

    const inviteMember = async (friendId) => {
      try {
        await api.groupAddMember(activeGroup.conversation_id, friendId);
        showToast("Miembro agregado 🎉");
        setGroupFriends(prev => prev.filter(f => f.user_id !== friendId));
        setActiveGroup(g => ({...g, total_miembros: g.total_miembros + 1}));
        setGroups(gs => gs.map(g => g.conversation_id === activeGroup.conversation_id
          ? {...g, total_miembros: g.total_miembros + 1} : g));
      } catch(e) { showToast(e.message || "Error al agregar", "error"); }
    };

    const toggleInvites = async () => {
      try {
        const d = await api.groupSettings(activeGroup.conversation_id, { allow_invites: !activeGroup.allow_invites });
        setActiveGroup(g => ({...g, allow_invites: d.allow_invites}));
        setGroups(gs => gs.map(g => g.conversation_id === activeGroup.conversation_id
          ? {...g, allow_invites: d.allow_invites} : g));
      } catch(e) { showToast(e.message || "Error", "error"); }
    };

    return(
      <div style={{background:bg,height:"100%",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{background:accent,color:"white",flexShrink:0,position:"sticky",top:0,zIndex:10}}>
          <div style={{padding:"22px 16px 14px",display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{setActiveGroup(null);setGroupMsgs([]);groupConvIdRef.current=null;setGroupPanel(false);setGroupFriends([]);}}
              style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,
                color:"white",width:34,height:34,cursor:"pointer",fontSize:18,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {activeGroup.icono} {activeGroup.nombre}
              </div>
              <div style={{fontSize:11,opacity:.65}}>{activeGroup.total_miembros} miembros · {isAdmin?"Admin":"Miembro"}</div>
            </div>
            <button onClick={()=>{
              setGroupPanel(o=>!o);
              if (!groupPanel && canInvite) {
                api.chatFriends().then(d=>{
                  const all = (d.data||d||[]).filter(f=>f.estado==='accepted');
                  setGroupFriends(all);
                }).catch(()=>{});
              }
            }}
              style={{background:groupPanel?"rgba(255,255,255,.35)":"rgba(255,255,255,.2)",
                border:"none",borderRadius:50,color:"white",width:34,height:34,
                cursor:"pointer",fontSize:18,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>⋯</button>
          </div>

          {/* Panel de opciones del grupo */}
          {groupPanel&&(
            <div style={{background:"rgba(0,0,0,.25)",backdropFilter:"blur(8px)",
              padding:"10px 14px 14px",borderTop:"1px solid rgba(255,255,255,.15)"}}>

              {/* Admin: toggle invitaciones */}
              {isAdmin&&(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  marginBottom:10,padding:"8px 12px",background:"rgba(255,255,255,.1)",
                  borderRadius:12}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:12}}>Permitir que miembros inviten</div>
                    <div style={{fontSize:10,opacity:.7}}>Si está off, solo el admin puede agregar</div>
                  </div>
                  <button onClick={toggleInvites}
                    style={{background: activeGroup.allow_invites?"#10b981":"rgba(255,255,255,.2)",
                      border:"none",borderRadius:99,color:"white",
                      padding:"5px 14px",fontWeight:800,fontSize:11,cursor:"pointer"}}>
                    {activeGroup.allow_invites?"ON":"OFF"}
                  </button>
                </div>
              )}

              {/* Invitar amigos */}
              {canInvite&&(
                <div>
                  <div style={{fontSize:10,fontWeight:800,opacity:.7,marginBottom:6}}>
                    AGREGAR AMIGOS AL GRUPO
                  </div>
                  {groupFriends.length===0?(
                    <div style={{fontSize:11,opacity:.6}}>No hay amigos para agregar</div>
                  ):(
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {groupFriends.slice(0,8).map(f=>(
                        <button key={f.friendship_id} onClick={()=>inviteMember(f.user_id)}
                          style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:99,
                            padding:"5px 12px",color:"white",fontSize:11,fontWeight:700,
                            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                          + {f.apodo||f.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mensajes */}
        <div style={{flex:1,padding:"12px 14px 12px",overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
          {groupMsgs.length===0&&(
            <div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>Empezá la conversación 💬</div>
          )}
          {groupMsgs.map((m,i)=>{
            const isMe = m.sender_id===me.id;
            return(
              <div key={m.id||i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
                {!isMe&&<Av user={{skin:m.skin,border:m.border,nombre:m.sender_nombre||"",avatar_bg:m.avatar_bg||null,foto_url:m.foto_url||null}} sz={28} avatarBg={m.avatar_bg||null}/>}
                <div style={{maxWidth:"72%"}}>
                  {!isMe&&<div style={{fontSize:10,marginBottom:2,marginLeft:4,fontWeight:700,color:sub}}>{m.sender_nombre}</div>}
                  <div style={{padding:"9px 13px",
                    borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                    background:isMe?accent:cardBg,color:isMe?"white":txt,
                    fontSize:13,fontWeight:600,boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
                    {m.texto}
                    <div style={{fontSize:9,opacity:.6,marginTop:2,textAlign:"right"}}>
                      {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{flexShrink:0,padding:"6px 14px 20px",background:cardBg,borderTop:`1px solid ${inputBg}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
              onKeyDown={e=>e.key==="Enter"&&sendMsg()}
              placeholder="Escribi un mensaje..."
              style={{flex:1,background:inputBg,border:`1.5px solid ${inputBord}`,borderRadius:50,
                padding:"10px 16px",fontSize:13,outline:"none",color:txt,
                fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
            <button onClick={sendMsg} style={{width:42,height:42,borderRadius:"50%",background:accent,
              border:"none",color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render chat individual v2 ─────────────────────────────────
  if (friend) return(
    <div style={{background:bg,height:"100%",display:"flex",flexDirection:"column"}}>
      {/* ── Header fijo — 3 zonas ─────────────────────────── */}
      <div style={{background:accent,color:"white",flexShrink:0,
        position:"sticky",top:0,zIndex:10}}>

        {/* Zona principal: ← | Perfil | ⋯ */}
        <div style={{padding:"22px 16px 14px",display:"flex",alignItems:"center",gap:10}}>

          {/* 1. Volver */}
          <button onClick={()=>{setFriend(null);setPerson([]);setConvId(null);personalConvIdRef.current=null;setOptionsOpen(false);setSearchQuery("");}}
            style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,
              color:"white",width:34,height:34,cursor:"pointer",fontSize:18,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>

          {/* 2. Perfil del amigo */}
          <div onClick={()=>{ onOpenPerfil&&onOpenPerfil(friend.user_id); }}
            style={{flex:1,display:"flex",alignItems:"center",gap:10,cursor:"pointer",
              minWidth:0}}>
            <div style={{flexShrink:0}}><Av user={friend} sz={36} avatarBg={friend?.avatar_bg||null}/></div>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:15,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {friend.nombre}
              </div>
              {typing
                ? <div style={{fontSize:11,opacity:.8}}>escribiendo...</div>
                : <div style={{fontSize:11,opacity:.65}}>Toca para ver perfil</div>
              }
            </div>
          </div>

          {/* 3. Opciones */}
          <button onClick={()=>setOptionsOpen(o=>!o)}
            style={{background:optionsOpen?"rgba(255,255,255,.35)":"rgba(255,255,255,.2)",
              border:"none",borderRadius:50,color:"white",width:34,height:34,
              cursor:"pointer",fontSize:18,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"background .2s"}}>
            ⋯
          </button>
        </div>

        {/* Panel de opciones — se despliega debajo del header */}
        {optionsOpen&&(
          <div style={{background:"rgba(0,0,0,.25)",backdropFilter:"blur(8px)",
            padding:"8px 14px 14px",borderTop:"1px solid rgba(255,255,255,.15)"}}>

            {/* Buscador */}
            <div style={{display:"flex",alignItems:"center",gap:8,
              background:"rgba(255,255,255,.15)",borderRadius:50,padding:"7px 14px",
              marginBottom:10}}>
              <span style={{fontSize:14}}>🔍</span>
              <input
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                placeholder="Buscar en la conversación..."
                style={{flex:1,background:"none",border:"none",outline:"none",
                  color:"white",fontSize:13,fontWeight:600,fontFamily:"Nunito,sans-serif"}}/>
              {searchQuery&&(
                <button onClick={()=>setSearchQuery("")}
                  style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",
                    cursor:"pointer",fontSize:14,padding:0}}>✕</button>
              )}
            </div>

            {/* Resultados de búsqueda */}
            {searchQuery.trim()&&(()=>{
              const hits = personMsgs.filter(m=>
                m.texto?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              return hits.length>0?(
                <div style={{maxHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                  {hits.slice(-10).map((m,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,.12)",borderRadius:10,
                      padding:"6px 10px",fontSize:12,color:"white"}}>
                      <span style={{opacity:.7,marginRight:6}}>
                        {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                      </span>
                      {m.texto}
                    </div>
                  ))}
                </div>
              ):(
                <div style={{fontSize:11,color:"rgba(255,255,255,.6)",textAlign:"center",padding:"4px 0"}}>
                  Sin resultados para "{searchQuery}"
                </div>
              );
            })()}

            {/* Acciones rápidas */}
            {!searchQuery&&(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[
                  {icon:"🗑️", label:"Limpiar chat", action:()=>{setPerson([]);setOptionsOpen(false);showToast("Chat limpiado localmente");}},
                  {icon:"👤", label:"Ver perfil",    action:()=>{onOpenPerfil&&onOpenPerfil(friend.user_id);setOptionsOpen(false);}},
                  {icon:"🔕", label:"Silenciar",     action:()=>{showToast("Próximamente");setOptionsOpen(false);}},
                ].map(opt=>(
                  <button key={opt.label} onClick={opt.action}
                    style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:99,
                      padding:"7px 14px",color:"white",fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif",
                      display:"flex",alignItems:"center",gap:5}}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{flex:1,padding:"12px 14px 12px",overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {personMsgs.length===0&&(
          <div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>
            Empeza la conversacion 💬
          </div>
        )}
        {personMsgs.map((m,i)=>{
          const isMe = m.sender_id===me.id;
          return(
            <div key={m.id||i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
              {!isMe&&<Av user={{skin:m.skin,border:m.border,nombre:m.sender_nombre||"",avatar_bg:m.avatar_bg||null,foto_url:m.foto_url||null}} sz={28} avatarBg={m.avatar_bg||null}/>}
              <div style={{maxWidth:"72%"}}>
                {!isMe&&<div style={{fontSize:10,marginBottom:2,marginLeft:4,fontWeight:700,
                  color: m.sender_name_color
                    ? (typeof m.sender_name_color==='string'
                        ? JSON.parse(m.sender_name_color||'{}')
                        : m.sender_name_color)?.color || sub
                    : sub
                }}>{m.sender_nombre}</div>}
                <div style={{padding:"9px 13px",
                  borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background:isMe?accent:cardBg,color:isMe?"white":txt,
                  fontSize:13,fontWeight:600,boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
                  {m.texto}
                  <div style={{fontSize:9,opacity:.6,marginTop:2,textAlign:"right"}}>
                    {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{flexShrink:0,padding:"6px 14px 20px",
        background:cardBg,borderTop:`1px solid ${inputBg}`,
        boxSizing:"border-box"}}>
        {/* Panel de emojis */}
        {emojiOpen&&(
          <div style={{marginBottom:8,background:inputBg,borderRadius:14,
            padding:"10px 12px",maxHeight:160,overflowY:"auto"}}>
            {emojiPacks.length===0?(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:11,color:sub}}>No tenés packs desbloqueados</span>
                <button onClick={()=>showToast("Comprá packs en Personalización → 😄 Emojis")}
                  style={{background:accent,border:"none",borderRadius:99,color:"white",
                    padding:"4px 10px",fontSize:10,fontWeight:800,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif",flexShrink:0}}>
                  + Ver packs
                </button>
              </div>
            ):(
              <>
                {emojiPacks.map(pack=>(
                  <div key={pack.id} style={{marginBottom:8}}>
                    <div style={{fontSize:9,color:sub,fontWeight:700,marginBottom:4}}>
                      {pack.nombre}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {pack.emojis.map((em,i)=>(
                        <button key={i} onClick={()=>{setMsg(m=>m+em);setEmojiOpen(false);}}
                          style={{fontSize:22,background:"none",border:"none",cursor:"pointer",
                            padding:2,lineHeight:1}}>
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* Botón emoji */}
          <button onClick={()=>setEmojiOpen(o=>!o)}
            style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
              background:emojiOpen?accent:(inputBg),
              border:"none",fontSize:20,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            😄
          </button>
          <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
            onKeyDown={e=>e.key==="Enter"&&sendMsg()}
            placeholder="Escribi un mensaje..."
            style={{flex:1,background:inputBg,border:`1.5px solid ${inputBord}`,borderRadius:50,
              padding:"10px 16px",fontSize:13,outline:"none",color:txt,
              fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
          <button onClick={sendMsg} style={{width:42,height:42,borderRadius:"50%",background:accent,
            border:"none",color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
        </div>
      </div>
    </div>
  );

  // ── Render mensajes de sala (Aula o Global) ───────────────────
  const renderMessages = (msgs, type) => (
    <div style={{display:"flex",flexDirection:"column",
      height:"calc(100vh - 180px)", // altura fija, no crece
      position:"relative"}}>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px 80px",
        display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0&&(
          <div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>
            Sin mensajes aun. Sea el primero! 🎉
          </div>
        )}
        {msgs.map((m,i)=>{
          const isMe = m.sender_id===me.id;
          return(
            <div key={m.id||i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",
              gap:8,alignItems:"flex-end"}}>
              {!isMe&&<Av user={{skin:m.skin,border:m.border,nombre:m.sender_nombre||"",avatar_bg:m.avatar_bg||null,foto_url:m.foto_url||null}} sz={28} avatarBg={m.avatar_bg||null}/>}
              <div style={{maxWidth:"75%"}}>
                {!isMe&&(
                  <div style={{fontSize:10,marginBottom:2,marginLeft:4,
                    fontWeight:m.sender_rol==='teacher'?800:600,
                    color: m.sender_name_color
                      ? (typeof m.sender_name_color==='string'
                          ? JSON.parse(m.sender_name_color||'{}')
                          : m.sender_name_color)?.color || sub
                      : m.sender_rol==='teacher'?accent:sub
                  }}>
                    {m.sender_nombre}{m.sender_rol==='teacher'?' 👩‍🏫':''}
                  </div>
                )}
                <div style={{padding:"9px 13px",
                  borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background:isMe?accent:cardBg,color:isMe?"white":txt,
                  fontSize:13,fontWeight:600,boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
                  {m.texto}
                  <div style={{fontSize:9,opacity:.6,marginTop:2,textAlign:"right"}}>
                    {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {typing&&<div style={{fontSize:11,color:sub,paddingLeft:8}}>💬 {typing} esta escribiendo...</div>}
        <div ref={bottomRef}/>
      </div>
      {/* Input fijo al fondo */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,
        padding:"6px 14px 16px",
        background:cardBg,borderTop:`1px solid ${inputBg}`}}>
        {/* Panel de emojis */}
        {emojiOpen&&(
          <div style={{marginBottom:8,background:inputBg,borderRadius:14,
            padding:"10px 12px",maxHeight:140,overflowY:"auto"}}>
            {emojiPacks.length===0?(
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:sub}}>Sin packs desbloqueados</span>
                <button onClick={()=>showToast("Personalización → 😄 Emojis")}
                  style={{background:accent,border:"none",borderRadius:99,color:"white",
                    padding:"3px 8px",fontSize:10,fontWeight:800,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>+ Packs</button>
              </div>
            ):(
              emojiPacks.map(pack=>(
                <div key={pack.id} style={{marginBottom:6}}>
                  <div style={{fontSize:9,color:sub,marginBottom:3}}>{pack.nombre}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {pack.emojis.map((em,i)=>(
                      <button key={i} onClick={()=>{setMsg(m=>m+em);setEmojiOpen(false);}}
                        style={{fontSize:20,background:"none",border:"none",cursor:"pointer",padding:1}}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setEmojiOpen(o=>!o)}
            style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
              background:emojiOpen?accent:(inputBg),
              border:"none",fontSize:20,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            😄
          </button>
          <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
            onKeyDown={e=>e.key==="Enter"&&sendMsg()}
            placeholder="Escribi un mensaje..."
            style={{flex:1,background:inputBg,border:`1.5px solid ${inputBord}`,borderRadius:50,
              padding:"10px 16px",fontSize:13,outline:"none",color:txt,
              fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
          <button onClick={sendMsg} style={{width:42,height:42,borderRadius:"50%",background:accent,
            border:"none",color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
        </div>
      </div>
    </div>
  );

  // ── Render principal ──────────────────────────────────────────
  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="💬 Chat" onBack={onBack}/>

      {/* Tabs */}
      <div style={{display:"flex",background:cardBg,
        borderBottom:`1px solid ${inputBg}`}}>
        {CHAT_SECTIONS.map((s,i)=>(
          <button key={s} onClick={()=>setSec(i)} style={{flex:1,padding:"11px 0",fontWeight:800,
            fontSize:13,background:"none",border:"none",cursor:"pointer",
            fontFamily:"Nunito,sans-serif",color:sec===i?accent:sub,
            borderBottom:`2.5px solid ${sec===i?accent:"transparent"}`,transition:"all .2s"}}>
            {s}
            {i===0&&pendientes.length>0&&(
              <span style={{background:"#ef4444",color:"white",borderRadius:99,
                fontSize:9,fontWeight:900,padding:"1px 5px",marginLeft:4}}>
                {pendientes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* PERSONAL */}
      {sec===0&&(
        <div style={{padding:"10px 14px"}}>
          {/* Solicitudes pendientes */}
          {pendientes.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontWeight:800,color:txt,fontSize:12,marginBottom:6}}>
                Solicitudes pendientes
              </div>
              {pendientes.map(f=>(
                <div key={f.friendship_id} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"10px 14px",background:cardBg,borderRadius:16,marginBottom:6,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
                  <Av user={f} sz={36} avatarBg={f?.avatar_bg||null}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:13,color:txt}}>{f.nombre}</div>
                    <div style={{fontSize:11,color:sub}}>quiere ser tu amigo</div>
                  </div>
                  <button onClick={()=>acceptFriend(f.friendship_id)}
                    style={{background:"#10b981",border:"none",borderRadius:99,color:"white",
                      padding:"5px 12px",fontWeight:800,fontSize:11,cursor:"pointer",marginRight:4}}>✓</button>
                  <button onClick={()=>rejectFriend(f.friendship_id)}
                    style={{background:"#ef4444",border:"none",borderRadius:99,color:"white",
                      padding:"5px 12px",fontWeight:800,fontSize:11,cursor:"pointer"}}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Lista de amigos */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:800,color:txt,fontSize:13}}>
              Mis contactos ({friends.length})
            </div>
            <button onClick={()=>setAddOpen(true)} style={{background:accent,border:"none",
              borderRadius:99,color:"white",padding:"5px 13px",fontWeight:800,fontSize:11,cursor:"pointer"}}>
              + Agregar
            </button>
          </div>

          {loading&&<div style={{textAlign:"center",color:sub,padding:20}}>Cargando...</div>}
          {!loading&&friends.length===0&&(
            <div style={{textAlign:"center",color:sub,padding:24,fontSize:13}}>
              Sin amigos todavia. Agrega a tus companeros! 👋
            </div>
          )}
          {friends.map(f=>(
            <div key={f.friendship_id} onClick={()=>openFriend(f)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
                background:cardBg,borderRadius:16,marginBottom:8,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <Av user={f} sz={42} avatarBg={f?.avatar_bg||null}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,color:txt}}>{f.nombre}</div>
                <div style={{fontSize:11,color:sub}}>Toca para chatear</div>
              </div>
              <span style={{color:navInact,fontSize:16}}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* GRUPOS */}
      {sec===1&&(
        <div style={{padding:"10px 14px"}}>
          {groups.length===0&&(
            <div style={{textAlign:"center",color:sub,padding:32,fontSize:13}}>
              <div style={{fontSize:36,marginBottom:8}}>👥</div>
              <div style={{fontWeight:700}}>No tenés grupos todavía</div>
              <div style={{fontSize:12,marginTop:4}}>Creá uno desde la pantalla de Amigos</div>
            </div>
          )}
          {groups.map(g=>(
            <div key={g.conversation_id} onClick={()=>openGroup(g)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
                background:cardBg,borderRadius:16,marginBottom:8,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:accent+"22",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {g.icono}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13,color:txt,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.nombre}</div>
                <div style={{fontSize:11,color:sub}}>{g.total_miembros} miembros · {g.my_rol==='owner'?'Admin':'Miembro'}</div>
              </div>
              <span style={{color:sub,fontSize:16}}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* AULA */}
      {sec===2&&(
        <div>
          {!classInfo?(
            <div style={{padding:32,textAlign:"center",color:sub,fontSize:13}}>
              No estas asignado a ningun aula aun
            </div>
          ):(
            <>
              <div style={{padding:"8px 14px 0",display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontWeight:800,color:txt,fontSize:13}}>{classInfo.nombre}</div>
                <span style={{background:inputBg,color:sub,borderRadius:99,
                  padding:"2px 9px",fontSize:10,fontWeight:700}}>
                  {classInfo.total_miembros} miembros
                </span>
              </div>
              {renderMessages(classMsgs, 'classroom')}
            </>
          )}
        </div>
      )}

      {/* GLOBAL */}
      {sec===3&&(
        <div>
          <div style={{padding:"8px 14px 0"}}>
            <div style={{fontSize:11,color:sub}}>Toda la escuela puede leer y escribir</div>
          </div>
          {renderMessages(globalMsgs, 'global')}
        </div>
      )}

    </div>
  );
}

// ── NOTICIAS ──────────────────────────────────────────────────

export default AChat;
