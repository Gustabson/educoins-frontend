import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { GS } from "../../constants";
import { useTheme } from "../../ThemeContext";
import { Av, WCard, Toast, useToast, displayName, CircBtn } from "../shared/index";
import AVotaciones    from "../student/AVotaciones";
import AP2P          from "../student/AP2P";
import AAsistente    from "../student/AAsistente";
import ATiendaCustom from "../student/personalizar/ATiendaCustom";
import ANoticias     from "../student/ANoticias";
import ARanking      from "../student/ARanking";

// Sub-páginas que ocultan la barra de nav (tienen su propio botón ←)
const HIDE_NAV = new Set([
  "diwy","veredictos-hijo","noticias","asistente",
  "personalizar","exchange","quemar","vincular",
]);

// ─────────────────────────────────────────────────────────────
// CONTENEDOR PRINCIPAL
// ─────────────────────────────────────────────────────────────
function Padre({ me, balance, refreshBalance, logout, setMe }) {
  const [tab, setTab]         = useState("home");
  const [toast, showToast]    = useToast();
  const [chatUnread, setChatUnread] = useState(0);
  const showNav = !HIDE_NAV.has(tab);

  return (
    <div style={{ maxWidth:480, margin:"0 auto", height:"100vh", background:"#F0F0F0",
      fontFamily:"Nunito,sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{ flex:1, overflowY:"auto", paddingBottom:showNav?90:0, animation:"fadeIn .18s ease" }}>

        {tab==="home"            && <PHome me={me} balance={balance} refreshBalance={refreshBalance}
                                     showToast={showToast} setTab={setTab}/>}
        {tab==="chat"            && <PChat me={me} showToast={showToast}
                                     clearUnread={()=>setChatUnread(0)}/>}
        {tab==="ranking"         && <ARanking me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="votar"           && <AVotaciones me={me} showToast={showToast}
                                     onBack={()=>setTab("home")} parentMode={true}/>}
        {tab==="perfil"          && <PPerfil me={me} logout={logout} setTab={setTab}/>}
        {tab==="diwy"            && <PDiwy me={me} showToast={showToast} setTab={setTab}/>}
        {tab==="veredictos-hijo" && <PVeredictos me={me} showToast={showToast} setTab={setTab}/>}
        {tab==="noticias"        && <ANoticias me={me} onBack={()=>setTab("home")} readOnly={true}/>}
        {tab==="asistente"       && <AAsistente me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="personalizar"    && <ATiendaCustom me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="vincular"        && <PVinculacion me={me} showToast={showToast} setTab={setTab}/>}
        {tab==="exchange"        && <AP2P me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="quemar"          && <PQuemar me={me} balance={balance}
                                     refreshBalance={refreshBalance} showToast={showToast} setTab={setTab}/>}

      </div>

      {showNav && (
        <div style={{ position:"sticky", bottom:0, width:"100%", background:"white",
          borderTop:"1px solid #EFEFEF", padding:"6px 4px 20px", display:"flex",
          justifyContent:"space-around", boxShadow:"0 -2px 16px rgba(0,0,0,.07)" }}>
          {[
            { id:"home",    icon:"🏠", label:"Inicio"  },
            { id:"chat",    icon:"💬", label:"Chat", badge:chatUnread },
            { id:"ranking", icon:"🏆", label:"Ranking" },
            { id:"votar",   icon:"🗳️", label:"Votar"   },
            { id:"perfil",  icon:"👤", label:"Perfil"  },
          ].map(item => {
            const on = tab === item.id;
            return (
              <button key={item.id} onClick={()=>setTab(item.id)} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1,
                background:"none", border:"none", cursor:"pointer", color:on?"#00c1fc":"#777",
                fontFamily:"Nunito,sans-serif", padding:"3px 2px", position:"relative" }}>
                <div style={{ width:36, height:30, borderRadius:10,
                  background:on?"#e0f7fe":"transparent",
                  display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <span style={{ fontSize:19 }}>{item.icon}</span>
                  {item.badge > 0 && (
                    <span style={{ position:"absolute", top:-2, right:-2, background:"#ef4444",
                      color:"white", borderRadius:99, fontSize:9, fontWeight:900,
                      minWidth:16, height:16, display:"flex", alignItems:"center",
                      justifyContent:"center", padding:"0 3px" }}>{item.badge}</span>
                  )}
                </div>
                <span style={{ fontSize:9, fontWeight:800 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME — estilo AHome con hijos en top-right
// ─────────────────────────────────────────────────────────────
function PHome({ me, balance, refreshBalance, showToast, setTab }) {
  const { primary, isDark:dark, txt, sub, cardBg, pageBg } = useTheme();
  const [children,    setChildren]    = useState([]);
  const [loadingKids, setLoadingKids] = useState(true);
  const [showHijos,   setShowHijos]   = useState(false);
  const [transferTo,  setTransferTo]  = useState(null);
  const [amount,      setAmount]      = useState("");
  const [desc,        setDesc]        = useState("");
  const [sending,     setSending]     = useState(false);
  const [gridMode,    setGridMode]    = useState(() => {
    try { return localStorage.getItem("padre_grid") === "1"; } catch { return false; }
  });

  useEffect(() => {
    api.parentChildren()
      .then(d => setChildren(Array.isArray(d) ? d : []))
      .catch(() => setChildren([]))
      .finally(() => setLoadingKids(false));
  }, []);

  const enviar = async () => {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { showToast("Ingresá un monto válido", "error"); return; }
    if (!transferTo) return;
    setSending(true);
    try {
      await api.parentTransfer(transferTo.id, amt, desc.trim() || undefined);
      showToast(`Enviaste 🪙${amt} a ${displayName(transferTo)}`);
      setChildren(cs => cs.map(c => c.id === transferTo.id
        ? { ...c, balance: (c.balance || 0) - amt } : c));
      setTransferTo(null); setAmount(""); setDesc("");
      refreshBalance();
    } catch (e) {
      showToast(e.message || "Error al enviar", "error");
    } finally { setSending(false); }
  };

  const toggleGrid = () => {
    const next = !gridMode;
    setGridMode(next);
    try { localStorage.setItem("padre_grid", next ? "1" : "0"); } catch {}
  };

  const QUICK = [
    ["🐾","Diwy",          "Reportes IA de tus hijos",       "#7c3aed","diwy"           ],
    ["⚖️","Veredictos",    "Conducta de tus hijos",          "#7f1d1d","veredictos-hijo" ],
    ["📰","Noticias",      "Publicaciones de la escuela",     "#00c1fc","noticias"        ],
    ["🤖","Asistente IA",  "Preguntas sobre reglas",          "#10b981","asistente"       ],
    ["🎨","Personalizar",  "Temas y colores de la app",       "#f59e0b","personalizar"    ],
    ["💱","Exchange P2P",  "Comprar y vender monedas",        "#8b5cf6","exchange"        ],
  ];

  const bal = balance ?? 0;

  return (
    <div style={{ background:pageBg, transition:"background .3s" }}>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div style={{ background:primary, position:"sticky", top:0, zIndex:50,
        overflow:"hidden", paddingBottom:12, color:"white", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:260, height:260, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-80, right:-70, pointerEvents:"none" }}/>
        <div style={{ padding:"22px 20px 0", position:"relative" }}>

          {/* Fila superior */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            {/* Izquierda: avatar + saludo */}
            <button onClick={()=>setTab("perfil")} style={{ display:"flex", alignItems:"center",
              gap:10, background:"none", border:"none", cursor:"pointer", padding:0, color:"white" }}>
              <Av user={me} sz={44} avatarBg={me?.avatar_bg||null}/>
              <div style={{ fontWeight:900, fontSize:17, lineHeight:1.1 }}>
                Hola, {me.nombre.split(" ")[0]} 👋
              </div>
            </button>
            {/* Derecha: botón hijos */}
            <button onClick={()=>setShowHijos(true)} style={{
              display:"flex", alignItems:"center", gap:6,
              background:"rgba(255,255,255,.18)", border:"1.5px solid rgba(255,255,255,.3)",
              borderRadius:50, padding:"6px 14px", cursor:"pointer", color:"white",
              fontSize:12, fontWeight:800, fontFamily:"Nunito,sans-serif", position:"relative" }}>
              <span style={{ fontSize:16 }}>👶</span>
              <span>Hijos</span>
              {children.length > 0 && (
                <span style={{ background:"white", color:primary, borderRadius:99,
                  fontSize:9, fontWeight:900, minWidth:16, height:16,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  padding:"0 4px" }}>{children.length}</span>
              )}
            </button>
          </div>

          {/* Caja de balance */}
          <div style={{ background:"rgba(255,255,255,.18)", borderRadius:22,
            padding:"16px 20px 14px", border:"1.5px solid rgba(255,255,255,.25)",
            marginBottom:18 }}>
            <div style={{ fontSize:11, opacity:.8, fontWeight:700, letterSpacing:".1em", marginBottom:4 }}>
              TU SALDO
            </div>
            <div style={{ fontWeight:900, fontSize:38, letterSpacing:"-1.5px", lineHeight:1 }}>
              🪙 {bal.toLocaleString("es-AR")}
            </div>
            <div style={{ fontSize:11, opacity:.65, marginTop:6 }}>
              Usá tus monedas para votar, enviar a tus hijos o participar en el exchange
            </div>
          </div>

          {/* Botones circulares de acciones rápidas */}
          <div style={{ display:"flex", justifyContent:"space-around", paddingBottom:4 }}>
            <CircBtn icon="💸" label="Enviar"   onClick={()=>{ setShowHijos(true); }}/>
            <CircBtn icon="💱" label="Exchange" onClick={()=>setTab("exchange")}/>
            <CircBtn icon="💬" label="Chat"     onClick={()=>setTab("chat")}/>
            <CircBtn icon="🏆" label="Ranking"  onClick={()=>setTab("ranking")}/>
            <CircBtn icon="🔥" label="Quemar"   onClick={()=>setTab("quemar")}/>
          </div>
        </div>
      </div>

      {/* ── ACCESOS RÁPIDOS ──────────────────────────────────── */}
      <div style={{ padding:"14px 14px 32px", background:pageBg, transition:"background .3s" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontWeight:900, color:txt, fontSize:15, transition:"color .3s" }}>
            Accesos rápidos
          </div>
          <button onClick={toggleGrid} style={{ background:dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)",
            border:"none", borderRadius:8, padding:"5px 10px", cursor:"pointer",
            display:"flex", alignItems:"center", gap:5, fontFamily:"Nunito,sans-serif",
            fontSize:11, fontWeight:800, color:sub, transition:"background .2s" }}>
            {gridMode ? (<><span>▤</span> Lista</>) : (<><span>⊞</span> Cuadros</>)}
          </button>
        </div>

        {gridMode ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {QUICK.map(([ic,lb,,col,dest]) => (
              <div key={dest} onClick={()=>setTab(dest)}
                style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:6, padding:"14px 8px", cursor:"pointer",
                  background:cardBg, borderRadius:16, minHeight:80,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"background .3s" }}>
                <div style={{ width:40, height:40, borderRadius:12, background:col+"22",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                  {ic}
                </div>
                <div style={{ fontWeight:800, fontSize:11, color:txt, textAlign:"center",
                  lineHeight:1.2, transition:"color .3s" }}>{lb}</div>
              </div>
            ))}
          </div>
        ) : (
          QUICK.map(([ic,lb,sb,col,dest]) => (
            <div key={dest} onClick={()=>setTab(dest)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px",
                cursor:"pointer", marginBottom:8, background:cardBg, borderRadius:20,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                transition:"background .3s" }}>
              <div style={{ width:46, height:46, borderRadius:14, background:col+"22",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22, flexShrink:0 }}>{ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14, color:txt, transition:"color .3s" }}>{lb}</div>
                <div style={{ fontSize:12, color:sub, marginTop:1, transition:"color .3s" }}>{sb}</div>
              </div>
              <span style={{ color:sub, fontSize:18, transition:"color .3s" }}>›</span>
            </div>
          ))
        )}
      </div>

      {/* ── PANEL DE HIJOS (modal bottom sheet) ──────────────── */}
      {showHijos && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex",
          flexDirection:"column", justifyContent:"flex-end" }}>
          {/* Overlay */}
          <div onClick={()=>{ setShowHijos(false); setTransferTo(null); setAmount(""); setDesc(""); }}
            style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.45)" }}/>
          {/* Sheet */}
          <div style={{ position:"relative", background:cardBg, borderRadius:"24px 24px 0 0",
            maxHeight:"80vh", overflowY:"auto", padding:"0 0 40px",
            boxShadow:"0 -8px 40px rgba(0,0,0,.18)", transition:"background .3s" }}>
            {/* Handle */}
            <div style={{ width:40, height:4, background:"#ddd", borderRadius:99,
              margin:"12px auto 0" }}/>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 20px 10px" }}>
              <div style={{ fontWeight:900, fontSize:17, color:txt, transition:"color .3s" }}>
                👶 Tus hijos
              </div>
              <button onClick={()=>{ setShowHijos(false); setTransferTo(null); }}
                style={{ background:"none", border:"none", fontSize:20, cursor:"pointer",
                  color:sub, fontFamily:"Nunito,sans-serif" }}>✕</button>
            </div>

            <div style={{ padding:"0 14px" }}>
              {loadingKids && (
                <div style={{ textAlign:"center", color:sub, padding:24 }}>Cargando...</div>
              )}

              {!loadingKids && children.length === 0 && (
                <div style={{ textAlign:"center", padding:"24px 0" }}>
                  <div style={{ fontSize:42, marginBottom:8 }}>👨‍👩‍👧</div>
                  <div style={{ fontWeight:800, color:txt, marginBottom:6, transition:"color .3s" }}>
                    Sin hijos vinculados
                  </div>
                  <div style={{ fontSize:12, color:sub, marginBottom:16, transition:"color .3s" }}>
                    Solicitá la vinculación con la cuenta de tu hijo/a.
                  </div>
                  <button onClick={()=>{ setShowHijos(false); setTab("vincular"); }}
                    style={{ background:primary, border:"none", borderRadius:50,
                      color:"white", padding:"10px 24px", fontWeight:800, fontSize:13,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>
                    🔗 Vincular hijo
                  </button>
                </div>
              )}

              {children.map(child => (
                <WCard key={child.id} style={{ marginBottom:10, cursor:"pointer" }}
                  onClick={()=>setTransferTo(t => t?.id===child.id ? null : child)}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <Av user={child} sz={44} avatarBg={child?.avatar_bg||null}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:15, color:txt, transition:"color .3s" }}>
                        {displayName(child)}
                      </div>
                      <div style={{ fontSize:12, color:sub, transition:"color .3s" }}>Alumno</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900, fontSize:18, color:primary, transition:"color .3s" }}>
                        🪙 {child.balance ?? 0}
                      </div>
                      <div style={{ fontSize:10, color:sub, transition:"color .3s" }}>saldo</div>
                    </div>
                  </div>

                  {transferTo?.id === child.id && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #f0f0f0" }}>
                      <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:10,
                        transition:"color .3s" }}>
                        Enviar monedas a {displayName(child)}
                      </div>
                      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                          placeholder="Cantidad" min="1"
                          style={{ flex:1, border:"1.5px solid #e8e8e8", borderRadius:12,
                            padding:"9px 12px", fontSize:16, fontWeight:800, outline:"none",
                            color:primary, fontFamily:"Nunito,sans-serif",
                            background:cardBg, transition:"background .3s, color .3s" }}/>
                        <div style={{ display:"flex", gap:4 }}>
                          {[5,10,25,50].map(n=>(
                            <button key={n} onClick={e=>{e.stopPropagation();setAmount(String(n));}}
                              style={{ background:amount===String(n)?primary:"#f0f0f0",
                                color:amount===String(n)?"white":"#555",
                                border:"none", borderRadius:8, padding:"6px 8px",
                                fontSize:11, fontWeight:800, cursor:"pointer",
                                fontFamily:"Nunito,sans-serif" }}>{n}</button>
                          ))}
                        </div>
                      </div>
                      <input value={desc} onChange={e=>setDesc(e.target.value)}
                        placeholder="Mensaje (opcional)..."
                        style={{ width:"100%", boxSizing:"border-box", border:"1.5px solid #e8e8e8",
                          borderRadius:12, padding:"9px 12px", fontSize:13, outline:"none",
                          fontFamily:"Nunito,sans-serif", marginBottom:10,
                          background:cardBg, color:txt, transition:"background .3s, color .3s" }}/>
                      <button onClick={e=>{e.stopPropagation();enviar();}}
                        disabled={sending||!amount}
                        style={{ width:"100%", background:sending||!amount?"#ccc":primary,
                          border:"none", borderRadius:50, color:"white", padding:"12px",
                          fontWeight:800, fontSize:14,
                          cursor:sending?"not-allowed":"pointer",
                          fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>
                        {sending ? "Enviando..." : `Enviar 🪙${amount||"..."}`}
                      </button>
                    </div>
                  )}
                </WCard>
              ))}

              {children.length > 0 && (
                <button onClick={()=>{ setShowHijos(false); setTab("vincular"); }}
                  style={{ width:"100%", background:"none",
                    border:`1.5px dashed ${primary}66`, borderRadius:14,
                    color:primary, padding:"12px", fontWeight:800, fontSize:13,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif",
                    marginTop:4, transition:"color .3s, border-color .3s" }}>
                  + Vincular otro hijo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WALLET
// ─────────────────────────────────────────────────────────────
function PWallet({ me }) {
  const { primary, isDark:dark, txt, sub, cardBg, pageBg } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [balance,      setBalance]      = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([api.account(), api.transactions()])
      .then(([acc, txs]) => {
        setBalance(acc?.balance ?? 0);
        setTransactions(Array.isArray(txs) ? txs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const TX_ICON = { reward:"🎁", transfer:"↔️", purchase:"🛒",
    adjustment:"⚙️", mint:"🏦", burn:"🔥", subscription:"🔄" };

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:primary, color:"white", padding:"32px 20px 24px",
        textShadow:"0 1px 4px rgba(0,0,0,.3)", transition:"background .3s" }}>
        <div style={{ fontWeight:800, fontSize:13, opacity:.8 }}>Tu billetera</div>
        {balance !== null && (
          <div style={{ fontWeight:900, fontSize:38, marginTop:4 }}>
            🪙 {(balance ?? 0).toLocaleString("es-AR")}
          </div>
        )}
      </div>
      <div style={{ padding:"14px 14px" }}>
        <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:10,
          transition:"color .3s" }}>Movimientos</div>
        {loading && <div style={{ textAlign:"center", color:sub, padding:24 }}>Cargando...</div>}
        {!loading && transactions.length === 0 && (
          <WCard style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:32 }}>🪙</div>
            <div style={{ fontWeight:800, color:txt, marginTop:8, transition:"color .3s" }}>
              Sin movimientos
            </div>
          </WCard>
        )}
        {transactions.map((tx,i) => {
          const positive = tx.amount > 0;
          return (
            <WCard key={tx.id||i} style={{ marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
                background:positive?"#10b98118":"#ef444418",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                {TX_ICON[tx.type]||"💸"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:txt, transition:"color .3s" }}>
                  {tx.description||tx.type}
                </div>
                <div style={{ fontSize:10, color:sub, transition:"color .3s" }}>
                  {new Date(tx.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                </div>
              </div>
              <div style={{ fontWeight:900, fontSize:16, flexShrink:0,
                color:positive?"#10b981":"#ef4444" }}>
                {positive?"+":""}{tx.amount}🪙
              </div>
            </WCard>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────────────────────
function PPerfil({ me, logout, setTab }) {
  const { primary, txt, sub, cardBg, pageBg } = useTheme();
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:primary, color:"white", padding:"52px 20px 28px",
        textShadow:"0 1px 4px rgba(0,0,0,.3)", transition:"background .3s" }}>
        <div style={{ fontWeight:900, fontSize:22, textAlign:"center" }}>Mi Perfil</div>
      </div>
      <div style={{ padding:"14px 14px" }}>
        <WCard style={{ textAlign:"center", padding:28, marginBottom:12 }}>
          <Av user={me} sz={64} avatarBg={me?.avatar_bg||null}/>
          <div style={{ fontWeight:900, fontSize:20, color:txt, marginTop:10,
            transition:"color .3s" }}>{me.nombre}</div>
          <div style={{ fontSize:13, color:sub, transition:"color .3s" }}>{me.email}</div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:4,
            background:primary+"18", borderRadius:99, padding:"3px 12px", marginTop:8 }}>
            <span style={{ fontSize:11, fontWeight:800, color:primary,
              transition:"color .3s" }}>👨‍👩‍👧 Padre / Madre</span>
          </div>
        </WCard>
        <WCard style={{ marginBottom:8, cursor:"pointer", padding:"14px 16px" }}
          onClick={()=>setTab("personalizar")}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"#f59e0b22",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🎨</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:txt, transition:"color .3s" }}>
                Personalizar app
              </div>
              <div style={{ fontSize:12, color:sub, transition:"color .3s" }}>
                Temas y colores
              </div>
            </div>
            <span style={{ color:sub, fontSize:18 }}>›</span>
          </div>
        </WCard>
        <button onClick={logout}
          style={{ width:"100%", background:"white", border:"1.5px solid #E8E8E8",
            borderRadius:50, color:"#888", padding:"14px", fontWeight:800,
            fontSize:14, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIWY
// ─────────────────────────────────────────────────────────────
function PDiwy({ me, showToast, setTab }) {
  const { txt, sub, cardBg, pageBg } = useTheme();
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedId,  setExpandedId]  = useState(null);
  const [requesting,  setRequesting]  = useState({});
  const [rateLimited, setRateLimited] = useState({});
  const accent = "#7c3aed";

  useEffect(() => {
    api.diwyParentReports()
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const byStudent = reports.reduce((acc,r) => {
    if (!acc[r.student_id]) acc[r.student_id] = { nombre:r.alumno_nombre, reports:[] };
    acc[r.student_id].reports.push(r);
    return acc;
  }, {});

  const requestReport = async (studentId) => {
    setRequesting(p=>({...p,[studentId]:true}));
    setRateLimited(p=>({...p,[studentId]:null}));
    try {
      await api.diwyParentRequest(studentId);
      showToast("Solicitud enviada. El equipo generará el reporte pronto.");
    } catch(e) {
      if (e.code==="RATE_LIMITED") setRateLimited(p=>({...p,[studentId]:e.message}));
      else showToast(e.message||"Error al enviar solicitud","error");
    } finally { setRequesting(p=>({...p,[studentId]:false})); }
  };

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"}) : "";

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:accent, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>🐾 Diwy</div>
            <div style={{ fontSize:13, opacity:.85 }}>Reportes de seguimiento</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"16px 14px" }}>
        {loading && <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>}
        {!loading && Object.keys(byStudent).length === 0 && (
          <WCard style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🐾</div>
            <div style={{ fontWeight:900, fontSize:17, color:txt, marginBottom:8,
              transition:"color .3s" }}>Bienvenido a Diwy</div>
            <div style={{ fontSize:13, color:sub, lineHeight:1.6, transition:"color .3s" }}>
              Diwy genera reportes semanales personalizados sobre el progreso de tus hijos.
              Todavía no hay reportes aprobados.
            </div>
          </WCard>
        )}
        {Object.entries(byStudent).map(([studentId,{nombre,reports:sr}]) => {
          const latest = sr[0];
          const isExp  = expandedId === latest?.id;
          return (
            <div key={studentId} style={{ marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:8, paddingLeft:4,
                transition:"color .3s" }}>👧 {nombre}</div>
              {latest && (
                <WCard style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:txt,
                        transition:"color .3s" }}>{latest.periodo_label}</div>
                      <div style={{ fontSize:11, color:sub, marginTop:2,
                        transition:"color .3s" }}>
                        Publicado el {fmtDate(latest.approved_at)}
                      </div>
                    </div>
                    <span style={{ background:accent+"18", color:accent,
                      borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:800 }}>
                      Aprobado
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:txt, lineHeight:1.6,
                    overflow:"hidden", maxHeight:isExp?"none":80, position:"relative",
                    transition:"color .3s" }}>
                    <div style={{ whiteSpace:"pre-wrap" }}>{latest.reporte_final}</div>
                    {!isExp && (
                      <div style={{ position:"absolute", bottom:0, left:0, right:0,
                        height:40, background:"linear-gradient(transparent, var(--card-bg,white))" }}/>
                    )}
                  </div>
                  <button onClick={()=>setExpandedId(isExp?null:latest.id)}
                    style={{ background:"none", border:"none", color:accent,
                      fontWeight:800, fontSize:12, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif", padding:"8px 0 0", display:"block" }}>
                    {isExp?"Ver menos ▲":"Ver completo ▼"}
                  </button>
                </WCard>
              )}
              {rateLimited[studentId] && (
                <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px",
                  marginBottom:8, fontSize:12, color:"#92400e" }}>
                  ⏳ {rateLimited[studentId]}
                </div>
              )}
              <button onClick={()=>requestReport(studentId)} disabled={requesting[studentId]}
                style={{ width:"100%", background:requesting[studentId]?"#ccc":accent+"18",
                  border:`1.5px dashed ${accent}55`, borderRadius:14, padding:"12px",
                  cursor:requesting[studentId]?"not-allowed":"pointer",
                  fontFamily:"Nunito,sans-serif", color:accent, fontWeight:800, fontSize:13 }}>
                {requesting[studentId] ? "Enviando..." : "📨 Solicitar nuevo reporte"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VEREDICTOS DE HIJOS
// ─────────────────────────────────────────────────────────────
const SEV_CFG = {
  advertencia:{ label:"Advertencia", color:"#f59e0b", icon:"⚠️" },
  sancion:    { label:"Sanción",     color:"#ef4444", icon:"🚔" },
  grave:      { label:"Caso Grave",  color:"#7f1d1d", icon:"⛔" },
};

function PVeredictos({ me, showToast, setTab }) {
  const { txt, sub, cardBg, pageBg } = useTheme();
  const [verdicts, setVerdicts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const accent = "#7f1d1d";

  useEffect(() => {
    api.parentChildrenVerdicts()
      .then(d => setVerdicts(Array.isArray(d) ? d : []))
      .catch(() => setVerdicts([]))
      .finally(() => setLoading(false));
  }, []);

  const byChild = verdicts.reduce((acc,v) => {
    const key = v.to_user_id || "?";
    if (!acc[key]) acc[key] = { nombre: v.alumno_nombre||"Alumno", verdicts:[] };
    acc[key].verdicts.push(v);
    return acc;
  }, {});

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString("es-AR",{day:"numeric",month:"short"}) : "";

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:accent, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.08)", top:-50, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>⚖️ Veredictos</div>
            <div style={{ fontSize:13, opacity:.85 }}>Conducta de tus hijos</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"16px 14px" }}>
        {loading && <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>}
        {!loading && verdicts.length === 0 && (
          <WCard style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:40 }}>✅</div>
            <div style={{ fontWeight:800, color:txt, marginTop:8, transition:"color .3s" }}>
              Sin veredictos
            </div>
            <div style={{ color:sub, fontSize:12, marginTop:4, transition:"color .3s" }}>
              Tus hijos no tienen veredictos registrados.
            </div>
          </WCard>
        )}
        {Object.entries(byChild).map(([key,{nombre,verdicts:cv}]) => (
          <div key={key} style={{ marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:8,
              paddingLeft:4, transition:"color .3s" }}>👧 {nombre}</div>
            {cv.map(v => {
              const sev = SEV_CFG[v.severity] || SEV_CFG.advertencia;
              return (
                <div key={v.id} style={{ background:cardBg, borderRadius:20,
                  marginBottom:10, overflow:"hidden",
                  boxShadow:"0 1px 8px rgba(0,0,0,.07)", border:`2px solid ${sev.color}`,
                  transition:"background .3s" }}>
                  <div style={{ background:sev.color, padding:"8px 16px",
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8,
                      fontWeight:900, color:"white", fontSize:13 }}>
                      <span style={{ fontSize:16 }}>{sev.icon}</span>
                      {sev.label}
                    </div>
                    <span style={{ color:"rgba(255,255,255,.75)", fontSize:11 }}>
                      {fmtDate(v.created_at)}
                    </span>
                  </div>
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:14, color:txt, lineHeight:1.5, fontWeight:600,
                      transition:"color .3s" }}>{v.mensaje}</div>
                    {v.coins_penalty > 0 && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                        background:"rgba(239,68,68,.12)", borderRadius:10,
                        padding:"5px 12px", marginTop:8,
                        fontSize:12, fontWeight:800, color:"#dc2626" }}>
                        🪙 Penalización: -{v.coins_penalty} EduCoins
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VINCULACION
// ─────────────────────────────────────────────────────────────
function PVinculacion({ me, showToast, setTab }) {
  const { primary, txt, sub, cardBg, pageBg } = useTheme();
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [confirming,  setConfirming]  = useState(null);
  const [requests,    setRequests]    = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [linked,      setLinked]      = useState([]);
  const accent = "#3b82f6";

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

  const EST_STYLE = {
    pendiente:{ bg:"#fef3c7", color:"#b45309", label:"Pendiente" },
    aprobado: { bg:"#d1fae5", color:"#065f46", label:"Aprobado"  },
    rechazado:{ bg:"#fee2e2", color:"#991b1b", label:"Rechazado" },
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

// ─────────────────────────────────────────────────────────────
// QUEMAR
// ─────────────────────────────────────────────────────────────
function PQuemar({ me, balance, refreshBalance, showToast, setTab }) {
  const { txt, sub, cardBg, pageBg } = useTheme();
  const [amount,  setAmount]  = useState("");
  const [burning, setBurning] = useState(false);
  const accent = "#ef4444";
  const bal = balance ?? 0;

  const quemar = async () => {
    const amt = parseInt(amount);
    if (!amt||amt<=0) { showToast("Ingresá un monto válido","error"); return; }
    if (amt>bal) { showToast(`Saldo insuficiente (tenés ${bal})`, "error"); return; }
    setBurning(true);
    try {
      await api.parentBurn(amt);
      showToast(`Quemaste 🔥 ${amt} monedas`);
      setAmount("");
      refreshBalance();
    } catch(e) { showToast(e.message||"Error al quemar","error"); }
    finally { setBurning(false); }
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
            <div style={{ fontWeight:900, fontSize:22 }}>🔥 Quemar monedas</div>
            <div style={{ fontSize:13, opacity:.85 }}>Eliminar monedas de circulación</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"20px 14px" }}>
        <WCard>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:16 }}>
            <div style={{ fontWeight:800, color:txt, transition:"color .3s" }}>Saldo actual</div>
            <div style={{ fontWeight:900, fontSize:22, color:accent }}>
              🪙 {bal.toLocaleString("es-AR")}
            </div>
          </div>
          <div style={{ background:"#fee2e2", borderRadius:12, padding:"12px 14px",
            marginBottom:16, border:"1.5px solid #fca5a5" }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#991b1b", marginBottom:4 }}>
              ⚠️ Acción irreversible
            </div>
            <div style={{ fontSize:12, color:"#7f1d1d", lineHeight:1.5 }}>
              Las monedas quemadas no se pueden recuperar.
            </div>
          </div>
          <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:6,
            transition:"color .3s" }}>Cantidad a quemar</div>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            placeholder="0" min="1" max={bal}
            style={{ width:"100%", boxSizing:"border-box",
              border:"1.5px solid #e8e8e8", borderRadius:12,
              padding:"12px 14px", fontSize:20, fontWeight:900, outline:"none",
              color:accent, fontFamily:"Nunito,sans-serif", textAlign:"center",
              marginBottom:10, background:cardBg, transition:"background .3s" }}/>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {[5,10,25,50,100].filter(n=>n<=bal).map(n=>(
              <button key={n} onClick={()=>setAmount(String(n))}
                style={{ flex:1, background:amount===String(n)?accent:"#f0f0f0",
                  color:amount===String(n)?"white":"#555",
                  border:"none", borderRadius:10, padding:"8px 4px",
                  fontSize:12, fontWeight:800, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif" }}>{n}</button>
            ))}
          </div>
          <button onClick={quemar} disabled={burning||!amount||parseInt(amount)<=0}
            style={{ width:"100%",
              background:(burning||!amount||parseInt(amount)<=0)?"#ccc":accent,
              border:"none", borderRadius:50, color:"white", padding:"14px",
              fontWeight:800, fontSize:15,
              cursor:(burning||!amount)?"not-allowed":"pointer",
              fontFamily:"Nunito,sans-serif" }}>
            {burning?`Quemando...`:`🔥 Quemar ${amount||"..."} monedas`}
          </button>
        </WCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHAT DE PADRES
// ─────────────────────────────────────────────────────────────
function PChat({ me, showToast, clearUnread }) {
  const { primary, txt, sub, cardBg, pageBg } = useTheme();
  const [messages, setMessages] = useState([]);
  const [texto,    setTexto]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const bottomRef  = useRef(null);
  const intervalRef = useRef(null);

  const loadMessages = async (silent=false) => {
    try {
      const d = await api.parentChatMessages();
      setMessages(Array.isArray(d)?d:[]);
      if (clearUnread) clearUnread();
    } catch(e) {
      if (!silent) showToast("Error al cargar mensajes","error");
    } finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    loadMessages();
    intervalRef.current = setInterval(()=>loadMessages(true), 10000);
    return ()=>clearInterval(intervalRef.current);
  }, []); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  }, [messages]);

  const send = async () => {
    if (!texto.trim()) return;
    setSending(true);
    const txt2 = texto.trim();
    setTexto("");
    try {
      await api.parentChatSend(txt2);
      await loadMessages(true);
    } catch(e) {
      showToast(e.message||"Error al enviar","error");
      setTexto(txt2);
    } finally { setSending(false); }
  };

  const fmtTime = d => new Date(d).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  const fmtDate = d => new Date(d).toLocaleDateString("es-AR",{day:"numeric",month:"short"});
  let lastDate = null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:pageBg,
      transition:"background .3s", minHeight:"calc(100vh - 90px)" }}>
      <div style={{ background:primary, color:"white", padding:"52px 20px 20px",
        flexShrink:0, transition:"background .3s" }}>
        <div style={{ fontWeight:900, fontSize:20 }}>💬 Chat de Padres</div>
        <div style={{ fontSize:12, opacity:.8 }}>Canal para toda la comunidad de padres</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {loading && <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign:"center", color:sub, padding:40, fontSize:14 }}>
            <div style={{ fontSize:36, marginBottom:8 }}>💬</div>
            ¡Sé el primero en escribir!
          </div>
        )}
        {messages.map((msg,i)=>{
          const isMe   = msg.user_id === me.id;
          const dateStr = fmtDate(msg.created_at);
          const showDate = dateStr !== lastDate;
          lastDate = dateStr;
          return (
            <div key={msg.id||i}>
              {showDate && (
                <div style={{ textAlign:"center", fontSize:11, color:sub,
                  margin:"10px 0", fontWeight:700, transition:"color .3s" }}>{dateStr}</div>
              )}
              <div style={{ display:"flex", flexDirection:isMe?"row-reverse":"row",
                alignItems:"flex-end", gap:8, marginBottom:8 }}>
                {!isMe && (
                  <div style={{ width:32, height:32, borderRadius:"50%",
                    background:"#e0e0e0", display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    👨‍👩‍👧
                  </div>
                )}
                <div style={{ maxWidth:"72%" }}>
                  {!isMe && (
                    <div style={{ fontSize:10, color:sub, marginBottom:2, fontWeight:800,
                      transition:"color .3s" }}>{msg.apodo||msg.nombre}</div>
                  )}
                  <div style={{ background:isMe?primary:cardBg,
                    color:isMe?"white":txt,
                    borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                    padding:"10px 14px", fontSize:14, lineHeight:1.4,
                    boxShadow:"0 1px 4px rgba(0,0,0,.08)",
                    transition:"background .3s, color .3s" }}>
                    {msg.texto}
                  </div>
                  <div style={{ fontSize:10, color:sub, marginTop:2,
                    textAlign:isMe?"right":"left", transition:"color .3s" }}>
                    {fmtTime(msg.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{ background:cardBg, padding:"10px 14px 24px",
        borderTop:"1px solid #EFEFEF", display:"flex", gap:8, flexShrink:0,
        transition:"background .3s" }}>
        <input value={texto} onChange={e=>setTexto(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
          placeholder="Escribí un mensaje..."
          style={{ flex:1, border:"1.5px solid #e8e8e8", borderRadius:22,
            padding:"10px 16px", fontSize:14, outline:"none",
            fontFamily:"Nunito,sans-serif", background:cardBg, color:txt,
            transition:"background .3s, color .3s" }}/>
        <button onClick={send} disabled={sending||!texto.trim()}
          style={{ background:(sending||!texto.trim())?"#ccc":primary, border:"none",
            borderRadius:"50%", width:44, height:44, color:"white", fontSize:18,
            cursor:(sending||!texto.trim())?"not-allowed":"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0, transition:"background .3s" }}>➤</button>
      </div>
    </div>
  );
}

export default Padre;
