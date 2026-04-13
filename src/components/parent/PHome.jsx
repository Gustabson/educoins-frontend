import { useState, useEffect, useRef } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, WCard, displayName, CircBtn } from "../shared/index";

const ALL_QUICK = [
  ["🐾","Diwy",          "Reportes IA de tus hijos",           "#7c3aed","diwy",           "badges.diwy"       ],
  ["⚖️","Veredictos",    "Conducta de tus hijos",              "#7f1d1d","veredictos-hijo", "badges.veredictos" ],
  ["✉️","Contacto",      "Mensajes con docentes e institución", "#0ea5e9","contacto",       "badges.contacto"   ],
  ["💡","Sugerencias",   "Cómo usar EduCoins efectivamente",   "#00d084","sugerencias",     "0"                 ],
  ["📰","Noticias",      "Publicaciones de la escuela",        "#00c1fc","noticias",        "0"                 ],
  ["🤖","Asistente IA",  "Preguntas sobre reglas",             "#10b981","asistente",       "0"                 ],
  ["🎨","Personalizar",  "Temas y colores de la app",          "#f59e0b","personalizar",    "0"                 ],
  ["💱","Exchange P2P",  "Comprar y vender monedas",           "#8b5cf6","exchange",        "badges.exchange"   ],
  ["🗓️","Calendario",   "Eventos y fechas del año",           "#0ea5e9","calendario",      "0"                 ],
];

export default function PHome({ me, balance, showToast, setTab }) {
  const { primary, isDark:dark, txt, sub, cardBg, pageBg } = useTheme();

  const lk = k => `${me.id}_${k}`;

  const [children,    setChildren]    = useState([]);
  const [loadingKids, setLoadingKids] = useState(true);
  const [showHijos,   setShowHijos]   = useState(false);
  const [gridMode,    setGridMode]    = useState(() => {
    try { return localStorage.getItem(lk("padre_grid")) === "1"; } catch { return false; }
  });
  const [badges, setBadges] = useState({});

  // ── Reorderable shortcuts ──────────────────────────────────
  const [itemOrder,   setItemOrder]   = useState(null);
  const [editOrder,   setEditOrder]   = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const loadBadges = () =>
    api.badgeCounts()
      .then(d => setBadges(typeof d === "object" && d !== null ? d : {}))
      .catch(() => {});

  useEffect(() => {
    api.parentChildren()
      .then(d => setChildren(Array.isArray(d) ? d : []))
      .catch(() => setChildren([]))
      .finally(() => setLoadingKids(false));

    loadBadges();

    // Load shortcuts order from server
    api.getSchedulePrefs()
      .then(prefs => {
        if (prefs?.padre_accesos_order?.length) setItemOrder(prefs.padre_accesos_order);
        else setItemOrder(ALL_QUICK.map(x => x[4]));
      })
      .catch(() => setItemOrder(ALL_QUICK.map(x => x[4])));

    const socket = getSocket();
    if (socket) {
      const refresh = () => loadBadges();
      socket.on("diwy_reply",          refresh);
      socket.on("new_verdict",         refresh);
      socket.on("notification",        refresh);
      socket.on("p2p_update",          refresh);
      socket.on("teacher_direct_reply",refresh);
      socket.on("admin_contact_reply", refresh);
      return () => {
        socket.off("diwy_reply",          refresh);
        socket.off("new_verdict",         refresh);
        socket.off("notification",        refresh);
        socket.off("p2p_update",          refresh);
        socket.off("teacher_direct_reply",refresh);
        socket.off("admin_contact_reply", refresh);
      };
    }
  }, []); // eslint-disable-line

  const toggleGrid = () => {
    const next = !gridMode;
    setGridMode(next);
    try { localStorage.setItem(lk("padre_grid"), next ? "1" : "0"); } catch {}
  };

  // Drag handlers
  const onDragStart = (e, idx) => { dragItem.current = idx; e.dataTransfer.effectAllowed = "move"; };
  const onDragEnter = (idx)    => { dragOver.current = idx; };
  const onDragEnd   = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const from = dragItem.current, to = dragOver.current;
    dragItem.current = null; dragOver.current = null;
    if (from === to) return;
    const newOrder = [...(itemOrder || ALL_QUICK.map(x => x[4]))];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    setItemOrder(newOrder);
  };

  const finishEditOrder = async () => {
    setEditOrder(false);
    setSavingOrder(true);
    try { await api.patchSchedulePrefs({ padre_accesos_order: itemOrder }); }
    catch(e) { /* silent */ }
    finally { setSavingOrder(false); }
  };

  const getItems = () => {
    const badgeMap = {
      "diwy":          badges.diwy,
      "veredictos-hijo": badges.veredictos,
      "contacto":      badges.contacto,
      "exchange":      badges.exchange,
    };
    const order = itemOrder || ALL_QUICK.map(x => x[4]);
    return order
      .map(key => ALL_QUICK.find(x => x[4] === key))
      .filter(Boolean)
      .map(([ic,lb,sb,col,dest]) => [ic,lb,sb,col,dest, badgeMap[dest]||0]);
  };

  const items = getItems();
  const bal = balance ?? 0;

  return (
    <div style={{ background:pageBg, transition:"background .3s" }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background:primary, position:"sticky", top:0, zIndex:50,
        overflow:"hidden", paddingBottom:12, color:"white", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:260, height:260, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-80, right:-70, pointerEvents:"none" }}/>
        <div style={{ padding:"22px 20px 0", position:"relative" }}>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <button onClick={()=>setTab("perfil")} style={{ display:"flex", alignItems:"center",
              gap:10, background:"none", border:"none", cursor:"pointer", padding:0, color:"white" }}>
              <Av user={me} sz={44} avatarBg={me?.avatar_bg||null}/>
              <div style={{ fontWeight:900, fontSize:17, lineHeight:1.1 }}>
                Hola, {me.nombre.split(" ")[0]} 👋
              </div>
            </button>
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

          <div style={{ display:"flex", justifyContent:"space-around", paddingBottom:4 }}>
            <CircBtn icon="💸" label="Enviar"   onClick={()=>setTab("enviar")}/>
            <CircBtn icon="⬇️" label="Ingresar" onClick={()=>setTab("ingresar")}/>
            <CircBtn icon="💬" label="Chat"     onClick={()=>setTab("chat")}/>
            <CircBtn icon="🏆" label="Ranking"  onClick={()=>setTab("ranking")}/>
            <CircBtn icon="🔥" label="Quemar"   onClick={()=>setTab("quemar")}/>
          </div>
        </div>
      </div>

      {/* ── ACCESOS RÁPIDOS ─────────────────────────────────── */}
      <div style={{ padding:"14px 14px 32px", background:pageBg, transition:"background .3s" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontWeight:900, color:txt, fontSize:15, transition:"color .3s" }}>Accesos rápidos</div>
            {savingOrder && <div style={{ fontSize:10, color:sub, fontWeight:700 }}>guardando...</div>}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={editOrder ? finishEditOrder : ()=>setEditOrder(true)}
              style={{ background:editOrder?(primary+"22"):(dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)"),
                border:editOrder?`1.5px solid ${primary}`:"none",
                borderRadius:8, padding:"5px 10px", cursor:"pointer", display:"flex",
                alignItems:"center", gap:5, fontFamily:"Nunito,sans-serif",
                fontSize:11, fontWeight:800, color:editOrder?primary:sub, transition:"all .2s" }}>
              {editOrder ? (savingOrder ? "Guardando..." : "✓ Listo") : "✦ Reordenar"}
            </button>
            <button onClick={toggleGrid}
              style={{ background:dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)", border:"none",
                borderRadius:8, padding:"5px 10px", cursor:"pointer", display:"flex",
                alignItems:"center", gap:5, fontFamily:"Nunito,sans-serif",
                fontSize:11, fontWeight:800, color:sub, transition:"background .2s" }}>
              {gridMode ? (<><span>▤</span> Lista</>) : (<><span>⊞</span> Cuadros</>)}
            </button>
          </div>
        </div>

        {editOrder && (
          <div style={{ fontSize:11, color:sub, fontWeight:700, marginBottom:8, paddingLeft:2 }}>
            Mantené presionado y arrastrá para reordenar
          </div>
        )}

        {itemOrder === null ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:sub, fontSize:13, fontWeight:700 }}>
            Cargando...
          </div>
        ) : gridMode ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {items.map(([ic,lb,,col,dest,bdg], idx) => (
              <div key={dest}
                draggable={editOrder}
                onDragStart={e=>onDragStart(e,idx)}
                onDragEnter={()=>onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e=>e.preventDefault()}
                onClick={editOrder?undefined:()=>setTab(dest)}
                style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:6, padding:"14px 8px",
                  cursor:editOrder?"grab":"pointer", background:cardBg, borderRadius:16,
                  minHeight:80, position:"relative",
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"background .3s", opacity:editOrder?.85:1,
                  outline:editOrder?`2px dashed ${primary}22`:"none" }}>
                {editOrder && (
                  <div style={{ position:"absolute", top:4, right:6, fontSize:10, color:sub, fontWeight:900 }}>⠿</div>
                )}
                <div style={{ width:40, height:40, borderRadius:12, background:col+"22",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, position:"relative" }}>
                  {ic}
                  {bdg > 0 && (
                    <span style={{ position:"absolute", top:-5, right:-5, background:"#ef4444",
                      color:"white", borderRadius:99, fontSize:9, fontWeight:900,
                      minWidth:16, height:16, display:"flex", alignItems:"center",
                      justifyContent:"center", padding:"0 4px" }}>{bdg}</span>
                  )}
                </div>
                <div style={{ fontWeight:800, fontSize:11, color:txt, textAlign:"center",
                  lineHeight:1.2, transition:"color .3s" }}>{lb}</div>
              </div>
            ))}
          </div>
        ) : (
          items.map(([ic,lb,sb,col,dest,bdg], idx) => (
            <div key={dest}
              draggable={editOrder}
              onDragStart={e=>onDragStart(e,idx)}
              onDragEnter={()=>onDragEnter(idx)}
              onDragEnd={onDragEnd}
              onDragOver={e=>e.preventDefault()}
              onClick={editOrder?undefined:()=>setTab(dest)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px",
                cursor:editOrder?"grab":"pointer", marginBottom:8, background:cardBg, borderRadius:20,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                transition:"background .3s", position:"relative",
                opacity:editOrder?.85:1,
                outline:editOrder?`2px dashed ${primary}22`:"none" }}>
              {editOrder && (
                <div style={{ fontSize:18, color:sub, flexShrink:0, marginRight:-4 }}>⠿</div>
              )}
              <div style={{ width:46, height:46, borderRadius:14, background:col+"22",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22, flexShrink:0, position:"relative" }}>
                {ic}
                {bdg > 0 && (
                  <span style={{ position:"absolute", top:-4, right:-4, background:"#ef4444",
                    color:"white", borderRadius:99, fontSize:9, fontWeight:900,
                    minWidth:16, height:16, display:"flex", alignItems:"center",
                    justifyContent:"center", padding:"0 4px" }}>{bdg}</span>
                )}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14, color:txt, transition:"color .3s" }}>{lb}</div>
                <div style={{ fontSize:12, color:sub, marginTop:1, transition:"color .3s" }}>{sb}</div>
              </div>
              {bdg > 0
                ? <span style={{ background:"#ef4444", color:"white", borderRadius:99,
                    fontSize:11, fontWeight:900, minWidth:20, height:20,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    padding:"0 6px" }}>{bdg}</span>
                : <span style={{ color:sub, fontSize:18, transition:"color .3s" }}>›</span>
              }
            </div>
          ))
        )}
      </div>

      {/* ── PANEL DE HIJOS ─────────────────────────────────── */}
      {showHijos && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex",
          flexDirection:"column", justifyContent:"flex-end" }}>
          <div onClick={()=>setShowHijos(false)}
            style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.45)" }}/>
          <div style={{ position:"relative", background:cardBg, borderRadius:"24px 24px 0 0",
            maxHeight:"80vh", overflowY:"auto", padding:"0 0 40px",
            boxShadow:"0 -8px 40px rgba(0,0,0,.18)", transition:"background .3s" }}>
            <div style={{ width:40, height:4, background:"#ddd", borderRadius:99, margin:"12px auto 0" }}/>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 20px 10px" }}>
              <div style={{ fontWeight:900, fontSize:17, color:txt, transition:"color .3s" }}>👶 Tus hijos</div>
              <button onClick={()=>setShowHijos(false)}
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
                  <div style={{ fontWeight:800, color:txt, marginBottom:6, transition:"color .3s" }}>Sin hijos vinculados</div>
                  <div style={{ fontSize:12, color:sub, marginBottom:16, transition:"color .3s" }}>
                    Solicitá la vinculación con la cuenta de tu hijo/a.
                  </div>
                  <button onClick={()=>{ setShowHijos(false); setTab("vincular"); }}
                    style={{ background:primary, border:"none", borderRadius:50, color:"white",
                      padding:"10px 24px", fontWeight:800, fontSize:13, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>
                    🔗 Vincular hijo
                  </button>
                </div>
              )}
              {children.map(child => (
                <WCard key={child.id} style={{ marginBottom:10 }}>
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
                </WCard>
              ))}
              {children.length > 0 && (
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button onClick={()=>{ setShowHijos(false); setTab("enviar"); }}
                    style={{ flex:1, background:primary, border:"none", borderRadius:50, color:"white",
                      padding:"12px", fontWeight:800, fontSize:13, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>
                    💸 Enviar monedas
                  </button>
                  <button onClick={()=>{ setShowHijos(false); setTab("vincular"); }}
                    style={{ background:"none", border:`1.5px dashed ${primary}66`, borderRadius:50,
                      color:primary, padding:"12px 16px", fontWeight:800, fontSize:13,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif",
                      transition:"color .3s, border-color .3s" }}>
                    + Vincular
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
