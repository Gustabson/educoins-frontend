import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, displayName } from "../shared/index";

export default function PEnviar({ me, balance, showToast, refreshBalance, setTab }) {
  const { primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, inputBd } = useTheme();
  const [children,  setChildren]  = useState([]);
  const [friends,   setFriends]   = useState([]);
  const [search,    setSearch]    = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [amount,    setAmount]    = useState("");
  const [sending,   setSending]   = useState(false);
  const [activeTab, setActiveTab] = useState("hijos"); // "hijos" | "buscar" | "manual"
  const [manualId,  setManualId]  = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    api.parentChildren()
      .then(d => setChildren(Array.isArray(d) ? d : []))
      .catch(() => {});
    api.chatFriends()
      .then(d => {
        const all = d.data || d || [];
        setFriends(all.filter(f => f.estado === "accepted" && f.rol === "padre"));
      }).catch(() => {});
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (activeTab !== "buscar") return;
    clearTimeout(debounceRef.current);
    if (search.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await api.chatSearch(search.trim());
        setResults(d.data || d || []);
      } catch(e) {}
      finally { setSearching(false); }
    }, 400);
  }, [search, activeTab]);

  const selectUser = (u) => {
    setSelected({ id: u.user_id || u.id, nombre: u.nombre, skin: u.skin, border: u.border, avatar_bg: u.avatar_bg });
    setAmount("");
  };

  const send = async () => {
    let toId = selected?.id;
    if (activeTab === "manual") {
      toId = manualId.trim();
      if (!toId) { showToast("Ingresá un ID válido", "error"); return; }
    }
    const amt = parseInt(amount);
    if (!toId || !amt || amt <= 0) { showToast("Completá destinatario y monto", "error"); return; }
    if (amt > (balance ?? 0)) { showToast("Saldo insuficiente", "error"); return; }
    setSending(true);
    try {
      await api.transfer(toId, amt);
      showToast(`¡Enviaste 🪙${amt.toLocaleString("es-AR")}! 🎉`);
      await refreshBalance();
      setSelected(null); setAmount(""); setManualId("");
    } catch(e) {
      showToast(e.message || "Error al transferir", "error");
    } finally { setSending(false); }
  };

  const TABS = [["hijos","👶 Hijos"], ["buscar","🔍 Buscar"], ["manual","✏️ Manual"]];

  // Amigos padres que no son ya hijos
  const childIds = new Set(children.map(c => c.id));
  const friendPadres = friends.filter(f => !childIds.has(f.user_id || f.id));

  return (
    <div style={{ background:bg, minHeight:"100vh", transition:"background .3s" }}>

      {/* Header */}
      <div style={{ background:accent, color:"white", padding:"52px 20px 20px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <button onClick={()=>setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>Enviar 💸</div>
            <div style={{ fontSize:13, opacity:.9, fontWeight:600, marginTop:2 }}>
              Saldo disponible: 🪙 {(balance ?? 0).toLocaleString("es-AR")}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:cardBg, borderBottom:`1px solid ${inputBg}`,
        flexShrink:0 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => { setActiveTab(id); setSelected(null); setSearch(""); setResults([]); }}
            style={{ flex:1, padding:"11px 4px", background:"none", border:"none",
              fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"Nunito,sans-serif",
              color:activeTab===id ? accent : sub,
              borderBottom:`2.5px solid ${activeTab===id ? accent : "transparent"}`,
              transition:"all .2s" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding:"12px 14px" }}>

        {/* TAB HIJOS */}
        {activeTab === "hijos" && (
          <div>
            {children.length === 0 && friendPadres.length === 0 && (
              <div style={{ background:cardBg, borderRadius:20, padding:32, textAlign:"center",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>👶</div>
                <div style={{ fontWeight:800, color:txt, marginBottom:4 }}>Sin hijos vinculados</div>
                <div style={{ fontSize:12, color:sub }}>
                  Vinculá a tu hijo/a o agregá amigos para enviarles monedas
                </div>
              </div>
            )}

            {children.length > 0 && (
              <div style={{ fontWeight:800, fontSize:11, color:sub, letterSpacing:".06em",
                marginBottom:8, paddingLeft:2 }}>⭐ FAVORITOS — TUS HIJOS</div>
            )}
            {children.map(c => (
              <div key={c.id} onClick={() => selectUser(c)}
                style={{ background:selected?.id===c.id ? accent+"22" : cardBg,
                  borderRadius:16, padding:"12px 14px", marginBottom:8, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:12,
                  border:`1.5px solid ${selected?.id===c.id ? accent : "transparent"}`,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"all .15s" }}>
                <Av user={c} sz={42} avatarBg={c?.avatar_bg || null}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:txt }}>{displayName(c)}</div>
                  <div style={{ fontSize:11, color:sub, marginTop:1 }}>
                    👨‍🎓 Tu hijo/a · 🪙 {c.balance ?? 0}
                  </div>
                </div>
                {selected?.id === c.id && <span style={{ color:accent, fontSize:20 }}>✓</span>}
              </div>
            ))}

            {friendPadres.length > 0 && (
              <>
                <div style={{ fontWeight:800, fontSize:11, color:sub, letterSpacing:".06em",
                  marginTop:children.length>0?12:0, marginBottom:8, paddingLeft:2 }}>
                  👥 AMIGOS PADRES
                </div>
                {friendPadres.map(f => {
                  const fId = f.user_id || f.id;
                  return (
                    <div key={f.friendship_id} onClick={() => selectUser(f)}
                      style={{ background:selected?.id===fId ? accent+"22" : cardBg,
                        borderRadius:16, padding:"12px 14px", marginBottom:8, cursor:"pointer",
                        display:"flex", alignItems:"center", gap:12,
                        border:`1.5px solid ${selected?.id===fId ? accent : "transparent"}`,
                        boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                        transition:"all .15s" }}>
                      <Av user={f} sz={42} avatarBg={f?.avatar_bg || null}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:txt }}>{displayName(f)}</div>
                        <div style={{ fontSize:11, color:sub }}>👨‍👩‍👧 Padre/Madre</div>
                      </div>
                      {selected?.id === fId && <span style={{ color:accent, fontSize:20 }}>✓</span>}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* TAB BUSCAR */}
        {activeTab === "buscar" && (
          <div>
            <div style={{ background:cardBg, borderRadius:16, padding:"10px 14px", marginBottom:10,
              display:"flex", alignItems:"center", gap:8,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>
              <span style={{ fontSize:16 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                style={{ flex:1, background:"none", border:"none", outline:"none",
                  fontSize:14, color:txt, fontFamily:"Nunito,sans-serif", fontWeight:600 }}/>
              {searching && <span style={{ fontSize:12, color:sub }}>...</span>}
            </div>
            {results.map(u => (
              <div key={u.id} onClick={() => selectUser(u)}
                style={{ background:selected?.id===u.id ? accent+"22" : cardBg,
                  borderRadius:16, padding:"12px 14px", marginBottom:8, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:12,
                  border:`1.5px solid ${selected?.id===u.id ? accent : "transparent"}`,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"all .15s" }}>
                <Av user={u} sz={42} avatarBg={u?.avatar_bg || null}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:txt }}>{u.nombre}</div>
                  <div style={{ fontSize:11, color:sub }}>
                    {u.rol==="padre"  ? "👨‍👩‍👧 Padre/Madre" :
                     u.rol==="teacher"? "👩‍🏫 Docente" : "👨‍🎓 Alumno"}
                  </div>
                </div>
                {selected?.id === u.id && <span style={{ color:accent, fontSize:20 }}>✓</span>}
              </div>
            ))}
            {search.length >= 2 && results.length === 0 && !searching && (
              <div style={{ textAlign:"center", color:sub, padding:24, fontSize:13 }}>
                Sin resultados para "{search}"
              </div>
            )}
          </div>
        )}

        {/* TAB MANUAL */}
        {activeTab === "manual" && (
          <div style={{ background:cardBg, borderRadius:20, padding:16,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>
            <div style={{ fontWeight:800, color:txt, marginBottom:4 }}>ID del destinatario</div>
            <div style={{ fontSize:11, color:sub, marginBottom:10 }}>
              Pedile a la otra persona su ID desde la pantalla "Ingresar"
            </div>
            <input value={manualId} onChange={e => setManualId(e.target.value)}
              placeholder="Pegá el ID aquí..."
              style={{ width:"100%", boxSizing:"border-box", background:inputBg,
                border:`1.5px solid ${inputBd}`, borderRadius:12, padding:"11px 14px",
                fontSize:13, outline:"none", color:txt,
                fontFamily:"Nunito,sans-serif", fontWeight:600 }}/>
          </div>
        )}

        {/* Monto + confirmar — aparece cuando hay destinatario seleccionado o manual */}
        {(selected || (activeTab === "manual" && manualId.trim())) && (
          <div style={{ background:cardBg, borderRadius:20, padding:16, marginTop:10,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>
            {selected && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12,
                padding:"10px 12px", background:dark?"rgba(255,255,255,.05)":"#f7f7f7",
                borderRadius:12 }}>
                <Av user={selected} sz={36} avatarBg={selected?.avatar_bg || null}/>
                <div>
                  <div style={{ fontSize:11, color:sub, fontWeight:700 }}>Enviando a</div>
                  <div style={{ fontWeight:800, fontSize:14, color:txt }}>{selected.nombre}</div>
                </div>
              </div>
            )}
            <div style={{ fontWeight:800, color:txt, marginBottom:8 }}>¿Cuántas monedas?</div>
            <div style={{ background:inputBg, border:`1.5px solid ${inputBd}`, borderRadius:14,
              display:"flex", alignItems:"center", padding:"4px 14px", marginBottom:12 }}>
              <span style={{ fontSize:20, marginRight:8 }}>🪙</span>
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/, ""))}
                placeholder="0" type="number" min="1"
                style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:22,
                  fontWeight:900, color:accent, fontFamily:"Nunito,sans-serif" }}/>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              {[10, 50, 100, 500].map(n => (
                <button key={n} onClick={() => setAmount(String(n))}
                  style={{ flex:1, background:amount===String(n) ? accent : "transparent",
                    color:amount===String(n) ? "white" : accent,
                    border:`1.5px solid ${accent}`, borderRadius:99,
                    padding:"5px", fontSize:12, fontWeight:800, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif" }}>
                  {n}
                </button>
              ))}
            </div>
            <button onClick={send} disabled={sending || !amount || parseInt(amount) <= 0}
              style={{ width:"100%", background:sending ? "#ccc" : accent, border:"none",
                borderRadius:50, color:"white", padding:"13px", fontWeight:900, fontSize:15,
                cursor:sending ? "not-allowed" : "pointer", fontFamily:"Nunito,sans-serif",
                boxShadow:sending ? "none" : `0 4px 16px ${accent}55` }}>
              {sending ? "Enviando..." : "Confirmar envío 💸"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
