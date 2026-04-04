import { useCallback, useEffect, useRef, useState } from "react";
import { api, connectSocket, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av } from "../shared/index";

// Orden: Privado · Grupos · Aula · Global
const SECTIONS = ["💬 Privado", "👥 Grupos", "🏫 Aula", "🌐 Global"];
const GROUP_ICONS = ["👥","👨‍👩‍👧","🏠","📚","🌟","🎉","💡","🤝","🏆","🌈","🎲","🔥"];

// ── Socket hook ───────────────────────────────────────────────
function usePChatSocket(token, onMessage, onTyping) {
  const socketRef = useRef(null);
  const onMsgRef  = useRef(onMessage);
  const onTypRef  = useRef(onTyping);
  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypRef.current = onTyping;  }, [onTyping]);
  useEffect(() => {
    const s = connectSocket(token);
    socketRef.current = s;
    const handleMsg    = m => onMsgRef.current(m);
    const handleTyping = d => onTypRef.current(d);
    s.on("new_message", handleMsg);
    s.on("user_typing", handleTyping);
    return () => {
      s.off("new_message", handleMsg);
      s.off("user_typing", handleTyping);
    };
  }, [token]);
  return socketRef;
}

export default function PChat2({ me, showToast, onBack }) {
  const { primary:accent, isDark:dark, txt, sub, cardBg, pageBg, inputBg, inputBd, navBord } = useTheme();
  const token = localStorage.getItem("ec_token");

  // sec: 0=Privado 1=Grupos 2=Aula 3=Global
  const [sec, setSec]               = useState(0);
  const [globalMsgs, setGlobal]     = useState([]);
  const [classMsgs,  setClassM]     = useState([]);
  const [personMsgs, setPerson]     = useState([]);
  const [groupMsgs,  setGroupMsgs]  = useState([]);
  const [classInfo,  setClassInfo]  = useState(null);
  const [friends,    setFriends]    = useState([]);
  const [pendientes, setPend]       = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [friend,     setFriend]     = useState(null);
  const [activeGroup,setActiveGroup]= useState(null);
  const [convId,     setConvId]     = useState(null);
  const [msg,        setMsg]        = useState("");
  const [typing,     setTyping]     = useState(null);
  const [search,     setSearch]     = useState("");
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [addOpen,    setAddOpen]    = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [groupName,  setGroupName]  = useState("");
  const [groupIcon,  setGroupIcon]  = useState("👥");
  const [groupSel,   setGroupSel]   = useState(new Set());
  const [groupPanel, setGroupPanel] = useState(false);
  const [groupFriends,setGroupFriends]=useState([]);

  const globalConvIdRef   = useRef(null);
  const classConvIdRef    = useRef(null);
  const personalConvIdRef = useRef(null);
  const groupConvIdRef    = useRef(null);
  const bottomRef         = useRef(null);
  const typingTimer       = useRef(null);

  // ── OHdrA-equivalent height for PChat2: header(~82px) + tabs(~38px) = 120px ──
  const ROOM_H = "calc(100vh - 120px)";

  // ── WebSocket ──────────────────────────────────────────────
  const onMessage = useCallback(m => {
    if (!m?.conversation_id) return;
    if      (globalConvIdRef.current   === m.conversation_id) setGlobal(p  => p.some(x=>x.id===m.id)?p:[...p,m]);
    else if (classConvIdRef.current    === m.conversation_id) setClassM(p  => p.some(x=>x.id===m.id)?p:[...p,m]);
    else if (personalConvIdRef.current === m.conversation_id) setPerson(p  => p.some(x=>x.id===m.id)?p:[...p,m]);
    else if (groupConvIdRef.current    === m.conversation_id) setGroupMsgs(p=> p.some(x=>x.id===m.id)?p:[...p,m]);
  }, []);

  const onTyping = useCallback(({ nombre }) => {
    setTyping(nombre);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(null), 2000);
  }, []);

  usePChatSocket(token, onMessage, onTyping);

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.chatFriends().catch(() => ({ data: [] })),
      api.parentGlobalMsgs().catch(() => ({ data: { messages:[], conversation_id:null } })),
      api.parentClassroomInfo().catch(() => ({ data: null })),
    ]).then(([fr, gl, cl]) => {
      const allFr = fr.data || fr || [];
      setFriends(allFr.filter(f => f.estado === "accepted"));
      setPend(allFr.filter(f => f.estado === "pending" && !f.soy_requester));

      const glData = gl.data || gl;
      const glMsgs = glData?.messages || (Array.isArray(glData) ? glData : []);
      const glConv = glData?.conversation_id || null;
      setGlobal(glMsgs);
      if (glConv) {
        globalConvIdRef.current = glConv;
        const s = getSocket();
        if (s) s.emit("join_personal", glConv);
      }

      const clData = cl.data || cl;
      setClassInfo(clData);
      if (clData?.conversation_id) classConvIdRef.current = clData.conversation_id;

      setLoading(false);
    });

    api.myGroups().then(d => {
      const gs = d || [];
      setGroups(gs);
      const s = getSocket();
      if (s) gs.forEach(g => s.emit("join_group", g.conversation_id));
    }).catch(() => {});
  }, []);

  // Cargar mensajes de aula al entrar a esa tab
  useEffect(() => {
    if (sec === 2 && classInfo && classMsgs.length === 0) {
      api.parentClassroomMsgs().then(d => {
        const data = d.data || d;
        const msgs = data?.messages || [];
        const cid  = data?.conversation_id || null;
        setClassM(msgs);
        if (cid) {
          classConvIdRef.current = cid;
          const s = getSocket();
          if (s) s.emit("join_personal", cid);
        }
      }).catch(() => {});
    }
  }, [sec, classInfo]);

  // Recargar grupos al entrar a esa tab
  useEffect(() => {
    if (sec === 1) {
      api.myGroups().then(d => {
        const gs = d || [];
        setGroups(gs);
        const s = getSocket();
        if (s) gs.forEach(g => s.emit("join_group", g.conversation_id));
      }).catch(() => {});
    }
  }, [sec]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [globalMsgs, classMsgs, personMsgs, groupMsgs, sec, friend]);

  // group_added
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onGroupAdded = data => {
      api.myGroups().then(d => {
        const gs = d || [];
        setGroups(gs);
        if (data?.conversation_id) s.emit("join_group", data.conversation_id);
      }).catch(() => {});
    };
    s.on("group_added", onGroupAdded);
    return () => s.off("group_added", onGroupAdded);
  }, []);

  // Búsqueda de padres
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      api.parentUsersSearch(search)
        .then(d => setResults(d.data || d || []))
        .catch(() => []);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Abrir chat privado ──────────────────────────────────────
  const openFriend = async f => {
    setFriend(f);
    setPerson([]);
    setConvId(null);
    try {
      const d = await api.chatPersonalMsgs(f.user_id);
      const data = d.data || d;
      const msgs = data.messages || (Array.isArray(data) ? data : []);
      const cid  = data.conversation_id || msgs[0]?.conversation_id || null;
      setPerson(msgs);
      setConvId(cid);
      if (cid) {
        personalConvIdRef.current = cid;
        const s = getSocket();
        if (s) s.emit("join_personal", cid);
      }
    } catch { showToast("Error al cargar el chat", "error"); }
  };

  const openGroup = async g => {
    setActiveGroup(g);
    setGroupMsgs([]);
    groupConvIdRef.current = null;
    try {
      const d = await api.groupMsgs(g.conversation_id);
      const data = d.data || d;
      setGroupMsgs(data.messages || []);
      groupConvIdRef.current = g.conversation_id;
      const s = getSocket();
      if (s) s.emit("join_group", g.conversation_id);
    } catch { showToast("Error al cargar el grupo", "error"); }
  };

  // ── Enviar mensaje ──────────────────────────────────────────
  const sendMsg = () => {
    const s = getSocket();
    const clean = msg.trim();
    if (!clean) return;
    let type, conversation_id;
    if (friend)           { type = "personal";         conversation_id = convId; }
    else if (activeGroup) { type = "group";             conversation_id = activeGroup.conversation_id; }
    else if (sec === 2)   { type = "classroom_parents"; conversation_id = classConvIdRef.current; }
    else                  { type = "global_parents";    conversation_id = globalConvIdRef.current || globalMsgs.find(m=>m.conversation_id)?.conversation_id; }
    if (!conversation_id) { showToast("No se pudo obtener la conversación","error"); return; }
    if (s) s.emit("send_message", { conversation_id, texto: clean, type });
    setMsg("");
  };

  const emitTyping = () => {
    const s = getSocket();
    if (!s) return;
    let type, cid;
    if (friend)           { type="personal";         cid=convId; }
    else if (activeGroup) { type="group";             cid=activeGroup.conversation_id; }
    else if (sec===2)     { type="classroom_parents"; cid=classConvIdRef.current; }
    else                  { type="global_parents";    cid=null; }
    s.emit("typing", { conversation_id: cid, type });
  };

  const sendFriendReq = async userId => {
    try {
      await api.chatFriendReq(userId);
      showToast("Solicitud enviada 📨");
      setResults(prev => prev.map(u => u.id===userId ? {...u,friendship_estado:"pending"} : u));
    } catch(e) { showToast(e.message||"Error","error"); }
  };

  const acceptFriend = async id => {
    try {
      await api.chatFriendAccept(id);
      showToast("¡Ahora son amigos! 🎉");
      const d = await api.chatFriends().catch(()=>({data:[]}));
      const all = d.data||d||[];
      setFriends(all.filter(f=>f.estado==="accepted"));
      setPend(all.filter(f=>f.estado==="pending"&&!f.soy_requester));
    } catch(e) { showToast(e.message||"Error","error"); }
  };

  const rejectFriend = async id => {
    try { await api.chatFriendReject(id); setPend(p=>p.filter(f=>f.friendship_id!==id)); } catch {}
  };

  const createGroup = async () => {
    if (groupName.trim().length < 2) { showToast("El nombre debe tener al menos 2 caracteres","error"); return; }
    if (groupSel.size === 0) { showToast("Seleccioná al menos un amigo","error"); return; }
    try {
      await api.createGroup({ nombre:groupName.trim(), icono:groupIcon, member_ids:[...groupSel] });
      showToast(`Grupo "${groupName.trim()}" creado 🎉`);
      setGroupModal(false); setGroupName(""); setGroupIcon("👥"); setGroupSel(new Set());
    } catch(e) { showToast(e.message||"Error","error"); }
  };

  // ── Burbuja de mensaje ──────────────────────────────────────
  const MsgBubble = ({ m, idx }) => {
    const isMe = m.sender_id === me.id;
    return (
      <div key={m.id||idx} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
        {!isMe && <Av user={{skin:m.skin,border:m.border,nombre:m.sender_nombre,avatar_bg:m.avatar_bg||null,foto_url:m.foto_url||null}} sz={28} avatarBg={m.avatar_bg||null}/>}
        <div style={{maxWidth:"72%"}}>
          {!isMe && <div style={{fontSize:10,marginBottom:2,marginLeft:4,fontWeight:700,color:sub}}>{m.sender_nombre}</div>}
          <div style={{padding:"9px 13px",
            borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
            background:isMe?accent:cardBg, color:isMe?"white":txt,
            fontSize:13, fontWeight:600, boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
            {m.texto}
            <div style={{fontSize:9,opacity:.6,marginTop:2,textAlign:"right"}}>
              {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render sala (fragmento — padre debe ser flex column) ─────
  const renderRoom = (msgs, emptyMsg) => (
    <>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0 && <div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>{emptyMsg}</div>}
        {msgs.map((m,i) => <MsgBubble key={m.id||i} m={m} idx={i}/>)}
        {typing && <div style={{fontSize:11,color:sub,paddingLeft:8}}>💬 {typing} está escribiendo...</div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{flexShrink:0,padding:"6px 14px 16px",background:cardBg,borderTop:`1px solid ${inputBg}`}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
            onKeyDown={e=>e.key==="Enter"&&sendMsg()}
            placeholder="Escribí un mensaje..."
            style={{flex:1,background:inputBg,border:`1.5px solid ${inputBd}`,borderRadius:50,
              padding:"10px 16px",fontSize:13,outline:"none",color:txt,
              fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
          <button onClick={sendMsg}
            style={{width:42,height:42,borderRadius:"50%",background:accent,border:"none",
              color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
        </div>
      </div>
    </>
  );

  // ── Render chat de grupo ────────────────────────────────────
  if (activeGroup) {
    const isAdmin  = activeGroup.my_rol === "owner";
    const canInvite = isAdmin || activeGroup.allow_invites;
    const inviteMember = async friendId => {
      try {
        await api.groupAddMember(activeGroup.conversation_id, friendId);
        showToast("Miembro agregado 🎉");
        setGroupFriends(p => p.filter(f => f.user_id !== friendId));
      } catch(e) { showToast(e.message||"Error","error"); }
    };
    const toggleInvites = async () => {
      try {
        const d = await api.groupSettings(activeGroup.conversation_id, {allow_invites:!activeGroup.allow_invites});
        setActiveGroup(g => ({...g,allow_invites:d.allow_invites}));
      } catch(e) { showToast(e.message||"Error","error"); }
    };
    return (
      <div style={{height:"100%",display:"flex",flexDirection:"column",background:pageBg}}>
        <div style={{flexShrink:0,background:accent,color:"white"}}>
          <div style={{padding:"22px 16px 14px",display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{setActiveGroup(null);setGroupMsgs([]);groupConvIdRef.current=null;setGroupPanel(false);setGroupFriends([]);}}
              style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,color:"white",
                width:34,height:34,cursor:"pointer",fontSize:18,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {activeGroup.icono} {activeGroup.nombre}
              </div>
              <div style={{fontSize:11,opacity:.65}}>{activeGroup.total_miembros} miembros · {isAdmin?"Admin":"Miembro"}</div>
            </div>
            <button onClick={()=>{
              const op=!groupPanel; setGroupPanel(op);
              if(op&&canInvite){
                Promise.all([api.chatFriends(),api.groupMembers(activeGroup.conversation_id)])
                  .then(([fr,mem])=>{
                    const ids=new Set((mem||[]).map(m=>m.user_id));
                    setGroupFriends((fr||[]).filter(f=>!ids.has(f.user_id)));
                  }).catch(()=>{});
              }
            }}
              style={{background:groupPanel?"rgba(255,255,255,.35)":"rgba(255,255,255,.2)",
                border:"none",borderRadius:50,color:"white",width:34,height:34,
                cursor:"pointer",fontSize:18,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>⋯</button>
          </div>
          {groupPanel&&(
            <div style={{background:"rgba(0,0,0,.25)",backdropFilter:"blur(8px)",
              padding:"10px 14px 14px",borderTop:"1px solid rgba(255,255,255,.15)"}}>
              {isAdmin&&(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  marginBottom:10,padding:"8px 12px",background:"rgba(255,255,255,.1)",borderRadius:12}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:12}}>Permitir que miembros inviten</div>
                    <div style={{fontSize:10,opacity:.7}}>Si está off, solo el admin puede agregar</div>
                  </div>
                  <button onClick={toggleInvites}
                    style={{background:activeGroup.allow_invites?"#10b981":"rgba(255,255,255,.2)",
                      border:"none",borderRadius:99,color:"white",padding:"5px 14px",fontWeight:800,fontSize:11,cursor:"pointer"}}>
                    {activeGroup.allow_invites?"ON":"OFF"}
                  </button>
                </div>
              )}
              {canInvite&&(
                <div>
                  <div style={{fontSize:10,fontWeight:800,opacity:.7,marginBottom:6}}>AGREGAR AL GRUPO</div>
                  {groupFriends.length===0
                    ? <div style={{fontSize:11,opacity:.6}}>No hay amigos para agregar</div>
                    : <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {groupFriends.slice(0,8).map(f=>(
                          <button key={f.friendship_id} onClick={()=>inviteMember(f.user_id)}
                            style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:99,
                              padding:"5px 12px",color:"white",fontSize:11,fontWeight:700,
                              cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                            + {f.apodo||f.nombre}
                          </button>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{flex:1,padding:"12px 14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
          {groupMsgs.length===0&&<div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>Empezá la conversación 💬</div>}
          {groupMsgs.map((m,i)=><MsgBubble key={m.id||i} m={m} idx={i}/>)}
          <div ref={bottomRef}/>
        </div>
        <div style={{flexShrink:0,padding:"6px 14px 20px",background:cardBg,borderTop:`1px solid ${inputBg}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
              onKeyDown={e=>e.key==="Enter"&&sendMsg()}
              placeholder="Escribí un mensaje..."
              style={{flex:1,background:inputBg,border:`1.5px solid ${inputBd}`,borderRadius:50,
                padding:"10px 16px",fontSize:13,outline:"none",color:txt,
                fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
            <button onClick={sendMsg}
              style={{width:42,height:42,borderRadius:"50%",background:accent,border:"none",
                color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render chat privado ────────────────────────────────────
  if (friend) return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:pageBg}}>
      <div style={{flexShrink:0,background:accent,color:"white",padding:"22px 16px 14px",
        display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>{setFriend(null);setPerson([]);setConvId(null);personalConvIdRef.current=null;}}
          style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,color:"white",
            width:34,height:34,cursor:"pointer",fontSize:18,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:10,minWidth:0}}>
          <Av user={friend} sz={36} avatarBg={friend?.avatar_bg||null}/>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:800,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {friend.apodo||friend.nombre}
            </div>
            {typing
              ? <div style={{fontSize:11,opacity:.8}}>escribiendo...</div>
              : <div style={{fontSize:11,opacity:.65}}>Padre/Madre</div>
            }
          </div>
        </div>
      </div>
      <div style={{flex:1,padding:"12px 14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {personMsgs.length===0&&<div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>Empezá la conversación 💬</div>}
        {personMsgs.map((m,i)=><MsgBubble key={m.id||i} m={m} idx={i}/>)}
        <div ref={bottomRef}/>
      </div>
      <div style={{flexShrink:0,padding:"6px 14px 20px",background:cardBg,borderTop:`1px solid ${inputBg}`}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
            onKeyDown={e=>e.key==="Enter"&&sendMsg()}
            placeholder="Escribí un mensaje..."
            style={{flex:1,background:inputBg,border:`1.5px solid ${inputBd}`,borderRadius:50,
              padding:"10px 16px",fontSize:13,outline:"none",color:txt,
              fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
          <button onClick={sendMsg}
            style={{width:42,height:42,borderRadius:"50%",background:accent,border:"none",
              color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
        </div>
      </div>
    </div>
  );

  // ── Buscar padres (pantalla modal) ──────────────────────────
  if (addOpen) return (
    <div style={{background:pageBg,minHeight:"100vh",fontFamily:"Nunito,sans-serif"}}>
      <div style={{background:accent,color:"white",padding:"22px 16px 20px",
        position:"sticky",top:0,zIndex:10,display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>{setAddOpen(false);setSearch("");setResults([]);}}
          style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,color:"white",
            width:34,height:34,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div style={{fontWeight:800,fontSize:16}}>Buscar padres</div>
      </div>
      <div style={{padding:"14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,background:inputBg,
          borderRadius:50,padding:"10px 16px",border:`1.5px solid ${inputBd}`,marginBottom:12}}>
          <span style={{fontSize:16}}>🔍</span>
          <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            style={{flex:1,background:"none",border:"none",outline:"none",
              fontSize:14,fontWeight:600,color:txt,fontFamily:"Nunito,sans-serif"}}/>
          {search&&<button onClick={()=>setSearch("")}
            style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:14}}>✕</button>}
        </div>
        {results.map(u=>(
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,
            padding:"12px 14px",background:cardBg,borderRadius:16,marginBottom:8,
            border:`1px solid ${navBord}`}}>
            <Av user={u} sz={42} avatarBg={u.avatar_bg||null}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:14,color:txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.apodo||u.nombre}</div>
              {u.apodo&&u.apodo!==u.nombre&&<div style={{fontSize:11,color:sub}}>({u.nombre})</div>}
            </div>
            {u.friendship_estado==="accepted"
              ? <span style={{fontSize:11,color:"#10b981",fontWeight:800,flexShrink:0}}>👥 Amigos</span>
              : u.friendship_estado==="pending"
              ? <span style={{fontSize:11,color:sub,fontWeight:700,flexShrink:0}}>⏳ Pendiente</span>
              : <button onClick={()=>sendFriendReq(u.id)}
                  style={{background:accent,border:"none",borderRadius:99,color:"white",
                    padding:"7px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif",flexShrink:0}}>+ Agregar</button>
            }
          </div>
        ))}
        {search.length>=2&&results.length===0&&(
          <div style={{textAlign:"center",color:sub,fontSize:13,padding:20}}>Sin resultados para "{search}"</div>
        )}
      </div>
    </div>
  );

  // ── Render principal ────────────────────────────────────────
  return (
    <div style={{background:pageBg,fontFamily:"Nunito,sans-serif",minHeight:"100vh"}}>

      {/* Header con título centrado */}
      <div style={{background:accent,color:"white",padding:"22px 16px 0",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <button onClick={onBack}
            style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,
              color:"white",width:34,height:34,cursor:"pointer",fontSize:18,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          {/* Título centrado */}
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:18}}>💬 Chat Padres</div>
          <div style={{width:34}}/>{/* Spacer para centrar el título */}
        </div>
        {/* Tabs */}
        <div style={{display:"flex"}}>
          {SECTIONS.map((s,i)=>(
            <button key={s} onClick={()=>setSec(i)}
              style={{flex:1,padding:"10px 0",background:"none",border:"none",
                fontWeight:800,fontSize:10,cursor:"pointer",
                fontFamily:"Nunito,sans-serif",color:"white",
                opacity:sec===i?1:.6,
                borderBottom:`2.5px solid ${sec===i?"white":"transparent"}`,
                transition:"all .2s"}}>
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
      </div>

      {/* ── Sec 0: Privado ────────────────────────────────────── */}
      {sec===0&&(
        <div style={{padding:"12px 14px 80px"}}>
          {/* Solicitudes pendientes */}
          {pendientes.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontWeight:800,color:txt,fontSize:12,marginBottom:6}}>Solicitudes pendientes</div>
              {pendientes.map(f=>(
                <div key={f.friendship_id}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                    background:cardBg,borderRadius:16,marginBottom:6,border:`1px solid ${navBord}`}}>
                  <Av user={f} sz={36} avatarBg={f.avatar_bg||null}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:13,color:txt}}>{f.apodo||f.nombre}</div>
                    <div style={{fontSize:11,color:sub}}>quiere ser tu contacto</div>
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
          {/* Lista de contactos */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:800,color:txt,fontSize:13}}>Mis contactos ({friends.length})</div>
            <button onClick={()=>setAddOpen(true)}
              style={{background:accent,border:"none",borderRadius:99,color:"white",
                padding:"5px 13px",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              + Buscar
            </button>
          </div>
          {loading&&<div style={{textAlign:"center",color:sub,padding:20}}>Cargando...</div>}
          {!loading&&friends.length===0&&(
            <div style={{textAlign:"center",color:sub,padding:24,fontSize:13}}>
              Sin contactos todavía. ¡Buscá a otros padres! 👋
            </div>
          )}
          {friends.map(f=>(
            <div key={f.friendship_id} onClick={()=>openFriend(f)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
                background:cardBg,borderRadius:16,marginBottom:8,border:`1px solid ${navBord}`,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <Av user={f} sz={42} avatarBg={f.avatar_bg||null}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13,color:txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {f.apodo||f.nombre}
                </div>
                {f.apodo&&f.apodo!==f.nombre&&<div style={{fontSize:10,color:sub}}>({f.nombre})</div>}
              </div>
              <span style={{color:accent,fontSize:16}}>💬</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Sec 1: Grupos ─────────────────────────────────────── */}
      {sec===1&&(
        <div style={{padding:"12px 14px 80px"}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
            <button onClick={()=>setGroupModal(true)}
              style={{background:accent,border:"none",borderRadius:99,color:"white",
                padding:"7px 14px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              + Nuevo grupo
            </button>
          </div>
          {groups.length===0&&(
            <div style={{textAlign:"center",color:sub,padding:32}}>
              <div style={{fontSize:36,marginBottom:8}}>👥</div>
              <div style={{fontWeight:700}}>Todavía no tenés grupos</div>
              <div style={{fontSize:12,marginTop:4}}>Creá uno con tus contactos</div>
            </div>
          )}
          {groups.map(g=>(
            <div key={g.conversation_id} onClick={()=>openGroup(g)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
                background:cardBg,borderRadius:16,marginBottom:8,border:`1px solid ${navBord}`,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.3)":"0 1px 8px rgba(0,0,0,.05)"}}>
              <div style={{width:46,height:46,borderRadius:14,background:accent+"22",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {g.icono||"👥"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:14,color:txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.nombre}</div>
                <div style={{fontSize:11,color:sub}}>{g.total_miembros} miembros</div>
              </div>
              <span style={{color:sub,fontSize:18}}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Sec 2: Aula ───────────────────────────────────────── */}
      {sec===2&&(
        <div style={{height:ROOM_H,display:"flex",flexDirection:"column"}}>
          {!classInfo
            ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:sub}}>
                <div style={{fontSize:36,marginBottom:8}}>🏫</div>
                <div style={{fontWeight:700}}>Aula no disponible</div>
                <div style={{fontSize:12,marginTop:4}}>Vinculá a tu hijo/a primero</div>
              </div>
            : <>
                <div style={{flexShrink:0,padding:"8px 14px 0",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontWeight:800,color:txt,fontSize:13}}>🏫 {classInfo.nombre}</div>
                  <span style={{background:inputBg,color:sub,borderRadius:99,
                    padding:"2px 9px",fontSize:10,fontWeight:700}}>Solo padres</span>
                </div>
                {renderRoom(classMsgs,`Chat de padres del aula ${classInfo.nombre}`)}
              </>
          }
        </div>
      )}

      {/* ── Sec 3: Global ─────────────────────────────────────── */}
      {sec===3&&(
        <div style={{height:ROOM_H,display:"flex",flexDirection:"column"}}>
          <div style={{flexShrink:0,padding:"8px 14px 0"}}>
            <div style={{fontSize:11,color:sub}}>🌐 Todos los padres de la institución pueden leer y escribir</div>
          </div>
          {renderRoom(globalMsgs,"¡Sé el primero en escribir! 💬")}
        </div>
      )}

      {/* ── Modal crear grupo ─────────────────────────────────── */}
      {groupModal&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setGroupModal(false);}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"20px 20px 0 0",
            padding:24,width:"100%",maxWidth:480,fontFamily:"Nunito,sans-serif"}}>
            <div style={{fontWeight:900,fontSize:17,color:txt,marginBottom:16,textAlign:"center"}}>👥 Crear grupo</div>
            <input value={groupName} onChange={e=>setGroupName(e.target.value)}
              placeholder="Nombre del grupo..."
              style={{width:"100%",boxSizing:"border-box",background:inputBg,
                border:`1.5px solid ${inputBd}`,borderRadius:12,
                padding:"11px 14px",fontSize:14,color:txt,fontFamily:"Nunito,sans-serif",
                outline:"none",marginBottom:10}}/>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
              {GROUP_ICONS.map(ic=>(
                <button key={ic} onClick={()=>setGroupIcon(ic)}
                  style={{fontSize:22,background:groupIcon===ic?accent+"22":"none",
                    border:groupIcon===ic?`2px solid ${accent}`:"2px solid transparent",
                    borderRadius:8,cursor:"pointer",padding:4,lineHeight:1}}>{ic}</button>
              ))}
            </div>
            <div style={{fontSize:11,fontWeight:800,color:sub,marginBottom:6}}>
              CONTACTOS ({groupSel.size} seleccionados)
            </div>
            <div style={{maxHeight:160,overflowY:"auto",marginBottom:14}}>
              {friends.length===0
                ? <div style={{fontSize:12,color:sub}}>Primero agregá contactos</div>
                : friends.map(f=>{
                    const sel=groupSel.has(f.user_id);
                    return(
                      <div key={f.friendship_id} onClick={()=>{
                        setGroupSel(prev=>{const next=new Set(prev);sel?next.delete(f.user_id):next.add(f.user_id);return next;});
                      }}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",
                          cursor:"pointer",borderBottom:`1px solid ${navBord}`}}>
                        <div style={{width:22,height:22,borderRadius:"50%",
                          background:sel?accent:inputBg,border:`2px solid ${sel?accent:navBord}`,
                          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {sel&&<span style={{fontSize:12,color:"white"}}>✓</span>}
                        </div>
                        <Av user={f} sz={30} avatarBg={f.avatar_bg||null}/>
                        <div style={{fontSize:13,fontWeight:700,color:txt}}>{f.apodo||f.nombre}</div>
                      </div>
                    );
                  })
              }
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setGroupModal(false)}
                style={{flex:1,background:inputBg,border:`1px solid ${navBord}`,borderRadius:50,
                  color:sub,padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                Cancelar
              </button>
              <button onClick={createGroup}
                style={{flex:1,background:accent,border:"none",borderRadius:50,
                  color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                Crear grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
