import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, displayName } from "../shared/index";

function AAmigos({ me, showToast, onBack, onOpenPerfil, onOpenChat }) {
  const {
    primary:accent, isDark:dark, txt, sub,
    cardBg, pageBg:bg, inputBg, inputBd, navBord,
  } = useTheme();

  const [tab,         setTab]       = useState("amigos");
  const [friends,     setFriends]   = useState([]);
  const [pending,     setPending]   = useState([]);
  const [sent,        setSent]      = useState([]);
  const [search,      setSearch]    = useState("");
  const [results,     setResults]   = useState([]);
  const [searching,   setSearching] = useState(false);
  const [loading,     setLoading]   = useState(true);
  const [toqueTarget,  setToqueTarget]  = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

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
      setFriends(all.filter(f => f.estado === "accepted"));
      setPending(all.filter(f => f.estado === "pending" && !f.soy_requester));
      setSent(all.filter(f => f.estado === "pending" && f.soy_requester));
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Búsqueda con debounce — backend busca por nombre O apodo
  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.chatSearch(search.trim())
        .then(d => setResults(Array.isArray(d) ? d : (d?.data || [])))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const sendRequest = async (userId) => {
    try {
      await api.chatFriendReq(userId);
      showToast("Solicitud enviada ✅");
      setResults(prev => prev.map(u =>
        u.id === userId ? { ...u, friendship_estado: "pending" } : u));
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  const accept = async (friendshipId) => {
    try {
      await api.chatFriendAccept(friendshipId);
      showToast("¡Ahora son amigos! 🎉");
      load();
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  const reject = async (friendshipId) => {
    try {
      await api.chatFriendReject(friendshipId);
      load();
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  const sendToque = async () => {
    if (!toqueTarget) return;
    try {
      await api.sendNotification({
        to_user_id: toqueTarget.user_id,
        type: "toque",
        message: `${displayName(me)} te mandó un 👋 toque`,
      });
      showToast(`👋 Toque enviado a ${displayName(toqueTarget)}`);
    } catch(e) {
      showToast(e.message || "Error al enviar toque", "error");
    } finally {
      setToqueTarget(null);
    }
  };

  const removeFriend = async () => {
    if (!removeTarget) return;
    try {
      await api.chatFriendRemove(removeTarget.friendship_id);
      showToast(`${displayName(removeTarget)} eliminado de amigos`);
      load();
    } catch(e) {
      showToast(e.message || "Error al eliminar amigo", "error");
    } finally {
      setRemoveTarget(null);
    }
  };

  // Componente de fila de usuario — apodo primero, nombre real como subtítulo si difiere
  const UserRow = ({ user, sub2, onPress, right }) => {
    const mainName = user.apodo || user.nombre;
    const realName = user.apodo && user.apodo !== user.nombre ? user.nombre : null;
    return (
      <div style={{...card, padding:"12px 14px", marginBottom:8,
        display:"flex", alignItems:"center", gap:10}}>
        <div onClick={onPress} style={{cursor: onPress ? "pointer" : "default", flexShrink:0}}>
          <Av user={user} sz={42} avatarBg={user.avatar_bg}/>
        </div>
        <div onClick={onPress}
          style={{flex:1, minWidth:0, cursor: onPress ? "pointer" : "default"}}>
          <div style={{fontWeight:800, fontSize:14, color:txt,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {mainName}
          </div>
          <div style={{fontSize:10, color:sub, marginTop:2}}>
            {realName && <span style={{marginRight:4}}>({realName})</span>}
            {sub2}
          </div>
        </div>
        {right}
      </div>
    );
  };

  const TABS = [
    { id:"amigos",      label:`👥 Amigos${friends.length ? ` (${friends.length})` : ""}` },
    { id:"solicitudes", label:`📩 Solicitudes${pending.length ? ` (${pending.length})` : ""}` },
  ];

  return (
    <div style={{background:bg, minHeight:"100vh", fontFamily:"Nunito,sans-serif"}}>
      <OHdrA title="👥 Amigos" onBack={onBack}/>

      {/* ── Buscador ──────────────────────────────────────── */}
      <div style={{padding:"12px 14px 0"}}>
        <div style={{display:"flex", alignItems:"center", gap:8,
          background:inputBg, borderRadius:50, padding:"10px 16px",
          border:`1.5px solid ${inputBd}`}}>
          <span style={{fontSize:16}}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o apodo..."
            style={{flex:1, background:"none", border:"none", outline:"none",
              fontSize:14, fontWeight:600, color:txt,
              fontFamily:"Nunito,sans-serif"}}/>
          {search && (
            <button onClick={() => setSearch("")}
              style={{background:"none", border:"none", color:sub,
                cursor:"pointer", fontSize:14}}>✕</button>
          )}
        </div>

        {/* Resultados de búsqueda */}
        {search.length >= 2 && (
          <div style={{marginTop:10}}>
            {searching && (
              <div style={{textAlign:"center", color:sub, fontSize:13, padding:8}}>
                Buscando...
              </div>
            )}
            {!searching && results.length === 0 && (
              <div style={{textAlign:"center", color:sub, fontSize:13, padding:8}}>
                Sin resultados para "{search}"
              </div>
            )}
            {results.map(u => {
              const rolLabel = u.rol === "teacher" ? "👨‍🏫 Docente"
                : u.rol === "admin" ? "⚙️ Admin" : "🎓 Alumno";
              return (
                <UserRow
                  key={u.id}
                  user={u}
                  sub2={rolLabel}
                  right={
                    u.friendship_estado === "accepted"
                      ? <span style={{fontSize:11, color:"#10b981",
                          fontWeight:800, flexShrink:0}}>
                          👥 Amigos
                        </span>
                      : u.friendship_estado === "pending"
                      ? <span style={{fontSize:11, color:sub,
                          fontWeight:700, flexShrink:0}}>
                          ⏳ Pendiente
                        </span>
                      : <button onClick={() => sendRequest(u.id)}
                          style={{background:accent, border:"none",
                            borderRadius:99, color:"white",
                            padding:"7px 14px", fontSize:12, fontWeight:800,
                            cursor:"pointer", fontFamily:"Nunito,sans-serif",
                            flexShrink:0}}>
                          + Agregar
                        </button>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div style={{display:"flex", borderBottom:`1px solid ${navBord}`,
        background:cardBg, marginTop:12, padding:"0 4px"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{flex:1, padding:"11px 4px", background:"none", border:"none",
              fontWeight:800, fontSize:11, cursor:"pointer",
              fontFamily:"Nunito,sans-serif",
              color: tab === t.id ? accent : sub,
              borderBottom: `2.5px solid ${tab === t.id ? accent : "transparent"}`}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px 80px"}}>

        {/* ── Tab Amigos ───────────────────────────────────── */}
        {tab === "amigos" && (
          <>
            {loading && (
              <div style={{textAlign:"center", color:sub, padding:24}}>
                Cargando...
              </div>
            )}
            {!loading && friends.length === 0 && (
              <div style={{textAlign:"center", padding:32, color:sub}}>
                <div style={{fontSize:40, marginBottom:8}}>👋</div>
                <div style={{fontWeight:700}}>Todavía no tenés amigos</div>
                <div style={{fontSize:12, marginTop:4}}>
                  Buscá a tus compañeros por nombre o apodo arriba
                </div>
              </div>
            )}
            {friends.map(f => (
              <UserRow
                key={f.friendship_id}
                user={f}
                sub2="Toca para ver perfil"
                onPress={() => onOpenPerfil && onOpenPerfil(f.user_id)}
                right={
                  <div style={{display:"flex", gap:6, flexShrink:0}}>
                    <button
                      onClick={() => setToqueTarget(f)}
                      title="Mandar toque"
                      style={{background:inputBg, border:`1px solid ${navBord}`,
                        borderRadius:99, padding:"7px 10px",
                        fontSize:15, cursor:"pointer"}}>
                      👋
                    </button>
                    <button
                      onClick={() => onOpenChat && onOpenChat(f)}
                      title="Abrir chat"
                      style={{background:accent+"22",
                        border:`1px solid ${accent}44`,
                        borderRadius:99, padding:"7px 10px",
                        fontSize:15, cursor:"pointer"}}>
                      💬
                    </button>
                    <button
                      onClick={() => setRemoveTarget(f)}
                      title="Eliminar amigo"
                      style={{background:inputBg, border:`1px solid ${navBord}`,
                        borderRadius:99, padding:"7px 10px",
                        fontSize:15, cursor:"pointer"}}>
                      🗑️
                    </button>
                  </div>
                }
              />
            ))}
          </>
        )}

        {/* ── Tab Solicitudes ──────────────────────────────── */}
        {tab === "solicitudes" && (
          <>
            {pending.length > 0 && (
              <>
                <div style={{fontSize:10, fontWeight:800, color:sub,
                  letterSpacing:1, marginBottom:8}}>
                  RECIBIDAS ({pending.length})
                </div>
                {pending.map(f => (
                  <UserRow
                    key={f.friendship_id}
                    user={f}
                    sub2="Quiere ser tu amigo"
                    right={
                      <div style={{display:"flex", gap:6, flexShrink:0}}>
                        <button onClick={() => accept(f.friendship_id)}
                          style={{background:"#10b981", border:"none",
                            borderRadius:99, color:"white",
                            padding:"8px 14px", fontSize:12, fontWeight:800,
                            cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                          ✓
                        </button>
                        <button onClick={() => reject(f.friendship_id)}
                          style={{background:inputBg,
                            border:`1px solid ${navBord}`,
                            borderRadius:99, color:sub,
                            padding:"8px 12px", fontSize:12, fontWeight:700,
                            cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                          ✕
                        </button>
                      </div>
                    }
                  />
                ))}
              </>
            )}

            {sent.length > 0 && (
              <>
                <div style={{fontSize:10, fontWeight:800, color:sub,
                  letterSpacing:1, marginBottom:8,
                  marginTop: pending.length ? 16 : 0}}>
                  ENVIADAS ({sent.length})
                </div>
                {sent.map(f => (
                  <UserRow
                    key={f.friendship_id}
                    user={f}
                    sub2="Solicitud pendiente"
                    right={
                      <span style={{fontSize:11, color:sub,
                        fontWeight:700, flexShrink:0}}>⏳</span>
                    }
                  />
                ))}
              </>
            )}

            {pending.length === 0 && sent.length === 0 && (
              <div style={{textAlign:"center", padding:32, color:sub}}>
                <div style={{fontSize:40, marginBottom:8}}>📭</div>
                <div style={{fontWeight:700}}>Sin solicitudes</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal: Confirmar eliminar amigo ──────────────── */}
      {removeTarget && (
        <div onClick={e => { if (e.target === e.currentTarget) setRemoveTarget(null); }}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
            zIndex:200, display:"flex", alignItems:"flex-end",
            justifyContent:"center"}}>
          <div style={{background:cardBg, borderRadius:"20px 20px 0 0",
            padding:24, width:"100%", maxWidth:480,
            fontFamily:"Nunito,sans-serif"}}>
            <div style={{textAlign:"center", marginBottom:16}}>
              <Av user={removeTarget} sz={56} avatarBg={removeTarget.avatar_bg}/>
              <div style={{fontWeight:900, fontSize:17, color:txt,
                marginTop:10, marginBottom:4}}>
                ¿Eliminar a {displayName(removeTarget)}?
              </div>
              {removeTarget.apodo && removeTarget.apodo !== removeTarget.nombre && (
                <div style={{fontSize:11, color:sub}}>({removeTarget.nombre})</div>
              )}
              <div style={{fontSize:13, color:sub, lineHeight:1.5, marginTop:6}}>
                Se eliminará la amistad. El historial de chat se mantiene.
              </div>
            </div>
            <div style={{display:"flex", gap:10}}>
              <button onClick={() => setRemoveTarget(null)}
                style={{flex:1, background:inputBg,
                  border:`1px solid ${navBord}`, borderRadius:50,
                  color:sub, padding:"13px", fontWeight:800,
                  fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                Cancelar
              </button>
              <button onClick={removeFriend}
                style={{flex:1, background:"#ef4444", border:"none",
                  borderRadius:50, color:"white", padding:"13px",
                  fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar toque ────────────────────────── */}
      {toqueTarget && (
        <div onClick={e => { if (e.target === e.currentTarget) setToqueTarget(null); }}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
            zIndex:200, display:"flex", alignItems:"flex-end",
            justifyContent:"center"}}>
          <div style={{background:cardBg, borderRadius:"20px 20px 0 0",
            padding:24, width:"100%", maxWidth:480,
            fontFamily:"Nunito,sans-serif"}}>
            <div style={{textAlign:"center", marginBottom:16}}>
              <Av user={toqueTarget} sz={56} avatarBg={toqueTarget.avatar_bg}/>
              <div style={{fontWeight:900, fontSize:17, color:txt,
                marginTop:10, marginBottom:4}}>
                👋 Mandar toque a {displayName(toqueTarget)}
              </div>
              {toqueTarget.apodo && toqueTarget.apodo !== toqueTarget.nombre && (
                <div style={{fontSize:11, color:sub}}>({toqueTarget.nombre})</div>
              )}
              <div style={{fontSize:13, color:sub, lineHeight:1.5, marginTop:6}}>
                Le vas a avisar que pasaste por su perfil.
              </div>
            </div>
            <div style={{display:"flex", gap:10}}>
              <button onClick={() => setToqueTarget(null)}
                style={{flex:1, background:inputBg,
                  border:`1px solid ${navBord}`, borderRadius:50,
                  color:sub, padding:"13px", fontWeight:800,
                  fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                Cancelar
              </button>
              <button onClick={sendToque}
                style={{flex:1, background:accent, border:"none",
                  borderRadius:50, color:"white", padding:"13px",
                  fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                👋 Mandar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AAmigos;
