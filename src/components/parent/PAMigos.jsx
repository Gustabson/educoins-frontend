import { useState, useEffect, useCallback } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, displayName } from "../shared/index";

const GROUP_ICONS = ["👥","👨‍👩‍👧","🏠","📚","🌟","🎉","💡","🤝","🏆","🌈","🎲","🔥","⭐","🎯","💬","🚀"];

export default function PAMigos({ me, showToast, onBack, onOpenChat }) {
  const {
    primary:accent, isDark:dark, txt, sub,
    cardBg, pageBg:bg, inputBg, inputBd, navBord,
  } = useTheme();

  const [tab,          setTab]        = useState("amigos");
  const [friends,      setFriends]    = useState([]);
  const [pending,      setPending]    = useState([]);
  const [sent,         setSent]       = useState([]);
  const [search,       setSearch]     = useState("");
  const [results,      setResults]    = useState([]);
  const [searching,    setSearching]  = useState(false);
  const [loading,      setLoading]    = useState(true);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [groupModal,   setGroupModal] = useState(false);
  const [groupName,    setGroupName]  = useState("");
  const [groupIcon,    setGroupIcon]  = useState("👥");
  const [groupSel,     setGroupSel]   = useState(new Set());

  const card = {
    background:   cardBg,
    borderRadius: 14,
    border:       `1px solid ${navBord}`,
    boxShadow:    dark ? "0 2px 10px rgba(0,0,0,.2)" : "0 1px 6px rgba(0,0,0,.06)",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.chatFriends();
      const all = Array.isArray(d) ? d : (d?.data || []);
      // Filtrar solo amigos que son padres
      setFriends(all.filter(f => f.estado === "accepted" && f.rol === "padre"));
      setPending(all.filter(f => f.estado === "pending" && !f.soy_requester));
      setSent(all.filter(f => f.estado === "pending" && f.soy_requester));
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Escuchar eventos en tiempo real
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const reload = () => load();
    s.on("friend_request",  reload);
    s.on("friend_accepted", reload);
    s.on("friend_removed",  reload);
    return () => {
      s.off("friend_request",  reload);
      s.off("friend_accepted", reload);
      s.off("friend_removed",  reload);
    };
  }, [load]);

  // Búsqueda con debounce — solo padres
  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.parentUsersSearch(search.trim())
        .then(d => setResults(Array.isArray(d) ? d : (d?.data || [])))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const sendRequest = async userId => {
    try {
      await api.chatFriendReq(userId);
      showToast("Solicitud enviada ✅");
      setResults(prev => prev.map(u => u.id === userId ? { ...u, friendship_estado: "pending" } : u));
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  const accept = async id => {
    try {
      await api.chatFriendAccept(id);
      showToast("¡Ahora son contactos! 🎉");
      load();
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  const reject = async id => {
    try {
      await api.chatFriendReject(id);
      load();
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  const removeFriend = async () => {
    if (!removeTarget) return;
    try {
      await api.chatFriendRemove(removeTarget.friendship_id);
      showToast(`${displayName(removeTarget)} eliminado de contactos`);
      load();
    } catch(e) {
      showToast(e.message || "Error al eliminar", "error");
    } finally { setRemoveTarget(null); }
  };

  const createGroup = async () => {
    if (groupName.trim().length < 2) { showToast("El nombre debe tener al menos 2 caracteres", "error"); return; }
    if (groupSel.size === 0)          { showToast("Seleccioná al menos un contacto", "error"); return; }
    try {
      await api.createGroup({ nombre: groupName.trim(), icono: groupIcon, member_ids: [...groupSel] });
      showToast(`Grupo "${groupName.trim()}" creado 🎉`);
      setGroupModal(false); setGroupName(""); setGroupIcon("👥"); setGroupSel(new Set());
    } catch(e) { showToast(e.message || "Error al crear grupo", "error"); }
  };

  const UserRow = ({ user, sub2, onPress, right }) => {
    const mainName = user.apodo || user.nombre;
    const realName = user.apodo && user.apodo !== user.nombre ? user.nombre : null;
    return (
      <div style={{ ...card, padding:"12px 14px", marginBottom:8,
        display:"flex", alignItems:"center", gap:10 }}>
        <div onClick={onPress} style={{ cursor:onPress?"pointer":"default", flexShrink:0 }}>
          <Av user={user} sz={42} avatarBg={user.avatar_bg}/>
        </div>
        <div onClick={onPress} style={{ flex:1, minWidth:0, cursor:onPress?"pointer":"default" }}>
          <div style={{ fontWeight:800, fontSize:14, color:txt,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {mainName}
          </div>
          <div style={{ fontSize:10, color:sub, marginTop:2 }}>
            {realName && <span style={{ marginRight:4 }}>({realName})</span>}
            {sub2}
          </div>
        </div>
        {right}
      </div>
    );
  };

  const TABS = [
    { id:"amigos",      label:`👥 Contactos${friends.length ? ` (${friends.length})` : ""}` },
    { id:"solicitudes", label:`📩 Solicitudes${pending.length ? ` (${pending.length})` : ""}` },
  ];

  return (
    <div style={{ background:bg, fontFamily:"Nunito,sans-serif", minHeight:"100vh" }}>

      {/* Header */}
      <div style={{ background:accent, color:"white", padding:"22px 16px 16px",
        position:"sticky", top:0, zIndex:10,
        display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack}
          style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:50,
            color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>←</button>
        <div style={{ fontWeight:900, fontSize:18, flex:1 }}>👥 Contactos</div>
      </div>

      {/* Buscador */}
      <div style={{ padding:"12px 14px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8,
          background:inputBg, borderRadius:50, padding:"10px 16px",
          border:`1.5px solid ${inputBd}` }}>
          <span style={{ fontSize:16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar padres por nombre..."
            style={{ flex:1, background:"none", border:"none", outline:"none",
              fontSize:14, fontWeight:600, color:txt, fontFamily:"Nunito,sans-serif" }}/>
          {search && (
            <button onClick={() => setSearch("")}
              style={{ background:"none", border:"none", color:sub, cursor:"pointer", fontSize:14 }}>✕</button>
          )}
        </div>

        {/* Resultados de búsqueda */}
        {search.length >= 2 && (
          <div style={{ marginTop:10 }}>
            {searching && (
              <div style={{ textAlign:"center", color:sub, fontSize:13, padding:8 }}>Buscando...</div>
            )}
            {!searching && results.length === 0 && (
              <div style={{ textAlign:"center", color:sub, fontSize:13, padding:8 }}>
                Sin resultados para "{search}"
              </div>
            )}
            {results.map(u => (
              <UserRow
                key={u.id}
                user={u}
                sub2="👨‍👩‍👧 Padre/Madre"
                right={
                  u.friendship_estado === "accepted"
                    ? <span style={{ fontSize:11, color:"#10b981", fontWeight:800, flexShrink:0 }}>👥 Contacto</span>
                    : u.friendship_estado === "pending"
                    ? <span style={{ fontSize:11, color:sub, fontWeight:700, flexShrink:0 }}>⏳ Pendiente</span>
                    : <button onClick={() => sendRequest(u.id)}
                        style={{ background:accent, border:"none", borderRadius:99, color:"white",
                          padding:"7px 14px", fontSize:12, fontWeight:800, cursor:"pointer",
                          fontFamily:"Nunito,sans-serif", flexShrink:0 }}>+ Agregar</button>
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${navBord}`,
        background:cardBg, marginTop:12, padding:"0 4px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:"11px 4px", background:"none", border:"none",
              fontWeight:800, fontSize:11, cursor:"pointer",
              fontFamily:"Nunito,sans-serif",
              color:tab === t.id ? accent : sub,
              borderBottom:`2.5px solid ${tab === t.id ? accent : "transparent"}` }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"12px 14px 80px" }}>

        {/* Tab Contactos */}
        {tab === "amigos" && (
          <>
            {loading && <div style={{ textAlign:"center", color:sub, padding:24 }}>Cargando...</div>}
            {!loading && friends.length > 0 && (
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
                <button onClick={() => setGroupModal(true)}
                  style={{ background:accent, border:"none", borderRadius:99,
                    color:"white", padding:"7px 14px", fontSize:12, fontWeight:800,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                  👥 Crear grupo
                </button>
              </div>
            )}
            {!loading && friends.length === 0 && (
              <div style={{ textAlign:"center", padding:32, color:sub }}>
                <div style={{ fontSize:40, marginBottom:8 }}>👋</div>
                <div style={{ fontWeight:700 }}>Todavía no tenés contactos</div>
                <div style={{ fontSize:12, marginTop:4 }}>
                  Buscá a otros padres por nombre arriba
                </div>
              </div>
            )}
            {friends.map(f => (
              <UserRow
                key={f.friendship_id}
                user={f}
                sub2="Padre/Madre"
                right={
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button
                      onClick={() => onOpenChat && onOpenChat(f)}
                      title="Abrir chat"
                      style={{ background:accent+"22", border:`1px solid ${accent}44`,
                        borderRadius:99, padding:"7px 10px", fontSize:15, cursor:"pointer" }}>
                      💬
                    </button>
                    <button
                      onClick={() => setRemoveTarget(f)}
                      title="Eliminar contacto"
                      style={{ background:inputBg, border:`1px solid ${navBord}`,
                        borderRadius:99, padding:"7px 10px", fontSize:15, cursor:"pointer" }}>
                      🗑️
                    </button>
                  </div>
                }
              />
            ))}
          </>
        )}

        {/* Tab Solicitudes */}
        {tab === "solicitudes" && (
          <>
            {pending.length > 0 && (
              <>
                <div style={{ fontSize:10, fontWeight:800, color:sub, letterSpacing:1, marginBottom:8 }}>
                  RECIBIDAS ({pending.length})
                </div>
                {pending.map(f => (
                  <UserRow
                    key={f.friendship_id}
                    user={f}
                    sub2="Quiere conectarse contigo"
                    right={
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        <button onClick={() => accept(f.friendship_id)}
                          style={{ background:"#10b981", border:"none", borderRadius:99, color:"white",
                            padding:"8px 14px", fontSize:12, fontWeight:800, cursor:"pointer",
                            fontFamily:"Nunito,sans-serif" }}>✓</button>
                        <button onClick={() => reject(f.friendship_id)}
                          style={{ background:inputBg, border:`1px solid ${navBord}`, borderRadius:99, color:sub,
                            padding:"8px 12px", fontSize:12, fontWeight:700, cursor:"pointer",
                            fontFamily:"Nunito,sans-serif" }}>✕</button>
                      </div>
                    }
                  />
                ))}
              </>
            )}
            {sent.length > 0 && (
              <>
                <div style={{ fontSize:10, fontWeight:800, color:sub, letterSpacing:1, marginBottom:8,
                  marginTop:pending.length ? 16 : 0 }}>
                  ENVIADAS ({sent.length})
                </div>
                {sent.map(f => (
                  <UserRow
                    key={f.friendship_id}
                    user={f}
                    sub2="Solicitud pendiente"
                    right={<span style={{ fontSize:11, color:sub, fontWeight:700, flexShrink:0 }}>⏳</span>}
                  />
                ))}
              </>
            )}
            {pending.length === 0 && sent.length === 0 && (
              <div style={{ textAlign:"center", padding:32, color:sub }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
                <div style={{ fontWeight:700 }}>Sin solicitudes</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Confirmar eliminar */}
      {removeTarget && (
        <div onClick={e => { if(e.target===e.currentTarget) setRemoveTarget(null); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:200,
            display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:cardBg, borderRadius:"20px 20px 0 0",
            padding:24, width:"100%", maxWidth:480, fontFamily:"Nunito,sans-serif" }}>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <Av user={removeTarget} sz={56} avatarBg={removeTarget.avatar_bg}/>
              <div style={{ fontWeight:900, fontSize:17, color:txt, marginTop:10, marginBottom:4 }}>
                ¿Eliminar a {displayName(removeTarget)}?
              </div>
              <div style={{ fontSize:13, color:sub, lineHeight:1.5, marginTop:6 }}>
                Se eliminará el contacto. El historial de chat se mantiene.
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setRemoveTarget(null)}
                style={{ flex:1, background:inputBg, border:`1px solid ${navBord}`, borderRadius:50,
                  color:sub, padding:"13px", fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif" }}>Cancelar</button>
              <button onClick={removeFriend}
                style={{ flex:1, background:"#ef4444", border:"none", borderRadius:50,
                  color:"white", padding:"13px", fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif" }}>🗑️ Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear grupo */}
      {groupModal && (
        <div onClick={e => { if(e.target===e.currentTarget) setGroupModal(false); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:200,
            display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:cardBg, borderRadius:"20px 20px 0 0",
            padding:24, width:"100%", maxWidth:480, fontFamily:"Nunito,sans-serif" }}>
            <div style={{ fontWeight:900, fontSize:17, color:txt, marginBottom:16, textAlign:"center" }}>
              👥 Crear grupo
            </div>
            <input value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="Nombre del grupo..."
              style={{ width:"100%", boxSizing:"border-box", background:inputBg,
                border:`1.5px solid ${inputBd}`, borderRadius:12,
                padding:"11px 14px", fontSize:14, color:txt, outline:"none",
                fontFamily:"Nunito,sans-serif", marginBottom:10 }}/>
            {/* Iconos */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
              {GROUP_ICONS.map(ic => (
                <button key={ic} onClick={() => setGroupIcon(ic)}
                  style={{ fontSize:22, background:groupIcon===ic?accent+"22":"none",
                    border:groupIcon===ic?`2px solid ${accent}`:"2px solid transparent",
                    borderRadius:8, cursor:"pointer", padding:4, lineHeight:1 }}>
                  {ic}
                </button>
              ))}
            </div>
            {/* Seleccionar amigos */}
            <div style={{ fontSize:11, fontWeight:800, color:sub, marginBottom:6 }}>
              CONTACTOS ({groupSel.size} seleccionados)
            </div>
            <div style={{ maxHeight:160, overflowY:"auto", marginBottom:14 }}>
              {friends.map(f => {
                const sel = groupSel.has(f.user_id);
                return (
                  <div key={f.friendship_id} onClick={() => {
                    setGroupSel(prev => {
                      const next = new Set(prev);
                      sel ? next.delete(f.user_id) : next.add(f.user_id);
                      return next;
                    });
                  }}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0",
                      cursor:"pointer", borderBottom:`1px solid ${navBord}` }}>
                    <div style={{ width:22, height:22, borderRadius:"50%",
                      background:sel?accent:inputBg, border:`2px solid ${sel?accent:navBord}`,
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {sel && <span style={{ fontSize:12, color:"white" }}>✓</span>}
                    </div>
                    <Av user={f} sz={30} avatarBg={f.avatar_bg||null}/>
                    <div style={{ fontSize:13, fontWeight:700, color:txt }}>
                      {f.apodo || f.nombre}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setGroupModal(false)}
                style={{ flex:1, background:inputBg, border:`1px solid ${navBord}`, borderRadius:50,
                  color:sub, padding:"13px", fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif" }}>Cancelar</button>
              <button onClick={createGroup}
                style={{ flex:1, background:accent, border:"none", borderRadius:50,
                  color:"white", padding:"13px", fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif" }}>Crear grupo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
