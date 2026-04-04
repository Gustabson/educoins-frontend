import { useState, useEffect, useCallback, useRef } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, displayName } from "../shared/index";

const STATUS_LABEL = {
  pending_payment: "⏳ Esperando pago",
  payment_sent:    "📤 Pago enviado",
  completed:       "✅ Completada",
  disputed:        "⚠️ En disputa",
  cancelled:       "✕ Cancelada",
  refunded:        "↩️ Reembolsada",
};
const STATUS_COLOR = {
  pending_payment:"#f59e0b", payment_sent:"#3b82f6",
  completed:"#10b981", disputed:"#ef4444",
  cancelled:"#94a3b8", refunded:"#8b5cf6",
};

function Countdown({ deadline }) {
  const [left, setLeft] = useState("");
  useEffect(()=>{
    const tick = () => {
      const diff = new Date(deadline) - new Date();
      if(diff<=0){setLeft("Expirada");return;}
      const m=Math.floor(diff/60000), s=Math.floor((diff%60000)/1000);
      setLeft(`${m}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[deadline]);
  const expired = left==="Expirada";
  return <span style={{color:expired?"#ef4444":"#f59e0b",fontWeight:800,fontSize:12}}>⏱ {left}</span>;
}

// Gráfico sparkline — respeta el tema completamente, sin hardcodes de color
function Sparkline({ history, accent, cardBg, txt, sub, navBord, isDark }) {
  if (!history || history.length < 2) return null;
  const prices   = history.map(p => p.precio);
  const min      = Math.min(...prices);
  const max      = Math.max(...prices);
  const W=320, H=80, padX=4, padY=8;
  const xScale   = i => padX + (i / (history.length - 1)) * (W - padX * 2);
  const yScale   = p => H - padY - ((p - min) / (max - min || 1)) * (H - padY * 2);
  const polyline = history.map((p,i) => `${xScale(i)},${yScale(p.precio)}`).join(" ");
  const area     = `${padX},${H-padY} ${history.map((p,i) => `${xScale(i)},${yScale(p.precio)}`).join(" ")} ${W-padX},${H-padY}`;
  const isUp     = prices[prices.length-1] >= prices[0];
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const last     = history[history.length-1];
  const mid      = Math.floor(history.length / 2);

  return (
    <div style={{background:cardBg, borderRadius:14, padding:"12px 14px",
      border:`1px solid ${navBord}`, marginBottom:10}}>
      <div style={{display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:8}}>
        <span style={{fontSize:11, fontWeight:800, color:txt}}>Precio últimas 24h</span>
        <span style={{fontSize:10, fontWeight:700,
          color: isUp ? "#10b981" : "#ef4444"}}>
          {isUp ? "▲" : "▼"} EDU/ARS
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{width:"100%", height:80, display:"block", overflow:"visible"}}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity={isDark ? "0.28" : "0.16"}/>
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#sparkGrad)"/>
        <polyline points={polyline} fill="none" stroke={lineColor}
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={xScale(history.length-1)} cy={yScale(last.precio)}
          r="4" fill={lineColor}/>
        <circle cx={xScale(history.length-1)} cy={yScale(last.precio)}
          r="7" fill={lineColor} opacity="0.18"/>
      </svg>
      <div style={{display:"flex", justifyContent:"space-between",
        fontSize:9, color:sub, marginTop:2}}>
        <span>{new Date(history[0].hora).getHours()}:00</span>
        <span>{new Date(history[mid].hora).getHours()}:00</span>
        <span>Ahora</span>
      </div>
    </div>
  );
}

function AP2P({ me, balance, showToast, onBack, refreshBalance }) {
  const {
    primary:accent, isDark:dark, txt, sub,
    cardBg, pageBg:bg, inputBg, inputBd, navBord,
  } = useTheme();

  const [tab,         setTab]        = useState("mercado");
  const [bookSide,    setBookSide]   = useState("vender"); // "comprar" | "vender"
  const [config,      setConfig]     = useState(null);
  const [offers,      setOffers]     = useState([]);
  const [myOffers,    setMyOffers]   = useState([]);
  const [orders,      setOrders]     = useState([]);
  const [market,      setMarket]     = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [activeOrder, setActiveOrder]= useState(null);
  const [newOffer,    setNewOffer]   = useState(false);
  const [offerForm,   setOfferForm]  = useState({
    amount:"", price_ars:"", min_order:"",
    instructions:"", payment_methods:["transferencia"],
  });
  const [buyModal,    setBuyModal]   = useState(null);
  const [buyAmount,   setBuyAmount]  = useState("");
  const [submitting,  setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // {msg, onOk}
  const [orderModal,   setOrderModal]   = useState(null); // orden abierta como modal
  const [orderDetail,  setOrderDetail]  = useState(null); // detalle técnico para admin
  const fileRef = useRef();

  const card = {
    background:  cardBg,
    borderRadius: 14,
    border:      `1px solid ${navBord}`,
    boxShadow:   dark
      ? "0 2px 12px rgba(0,0,0,.20)"
      : "0 1px 6px rgba(0,0,0,.06)",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, off, myOff, ord, mkt] = await Promise.all([
        api.p2pConfig(),
        api.p2pOffers(),
        api.p2pMyOffers(),
        api.p2pOrders(),
        api.p2pMarket().catch(() => null),
      ]);
      setConfig(cfg.data || cfg);
      setOffers(Array.isArray(off.data || off) ? off.data || off : []);
      setMyOffers(Array.isArray(myOff.data || myOff) ? myOff.data || myOff : []);
      setOrders(Array.isArray(ord.data || ord) ? ord.data || ord : []);
      if (mkt) setMarket(mkt.data || mkt);
    } catch(e) { showToast("Error al cargar", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Tiempo real: escuchar eventos P2P del socket ────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (payload) => {
      // Recargar datos al recibir cualquier evento P2P
      load();
      // Si hay un orderModal abierto, actualizarlo también
      if (payload.orderId) {
        setOrderModal(prev => {
          if (!prev || prev.id !== payload.orderId) return prev;
          if (payload.type === 'payment_sent')  return { ...prev, status: 'payment_sent' };
          if (payload.type === 'order_completed') return { ...prev, status: 'completed' };
          if (payload.type === 'disputed')      return { ...prev, status: 'disputed' };
          return prev;
        });
      }
    };
    socket.on('p2p_update', handler);
    return () => socket.off('p2p_update', handler);
  }, [load]);

  // ── Crear oferta ─────────────────────────────────────────
  const createOffer = async () => {
    if (!offerForm.amount || !offerForm.price_ars)
      return showToast("Completá los campos", "error");
    setSubmitting(true);
    try {
      await api.p2pCreateOffer({
        amount:          parseInt(offerForm.amount),
        price_ars:       parseFloat(offerForm.price_ars),
        min_order:       parseInt(offerForm.min_order) || 1,
        instructions:    offerForm.instructions,
        payment_methods: offerForm.payment_methods,
      });
      showToast("✅ Oferta publicada");
      setNewOffer(false);
      setOfferForm({amount:"",price_ars:"",min_order:"",instructions:"",payment_methods:["transferencia"]});
      load(); if (refreshBalance) refreshBalance();
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setSubmitting(false); }
  };

  // ── Crear orden (comprar) ────────────────────────────────
  const createOrder = async () => {
    if (!buyAmount || parseInt(buyAmount) < 1) return showToast("Ingresá la cantidad", "error");
    if (!buyModal?.id) return showToast("Error: oferta no válida", "error");
    setSubmitting(true);
    try {
      const order = await api.p2pCreateOrder(buyModal.id, {amount: parseInt(buyAmount)});
      // Enriquecer la orden con datos del vendedor que ya tenemos en buyModal
      const enriched = {
        ...order,
        seller_nombre:      buyModal.seller_nombre,
        seller_apodo:       buyModal.seller_apodo,
        seller_skin:        buyModal.seller_skin,
        seller_border:      buyModal.seller_border,
        seller_avatar_bg:   buyModal.seller_avatar_bg,
        seller_rating:      buyModal.seller_rating,
        seller_trades:      buyModal.seller_trades,
        seller_instructions: buyModal.instructions,
      };
      setBuyModal(null); setBuyAmount("");
      setOrderModal(enriched); // abrir modal de orden inmediatamente
      load();
    } catch(e) { showToast(e.message || "No se pudo conectar al servidor", "error"); }
    finally { setSubmitting(false); }
  };

  // ── Pago enviado ─────────────────────────────────────────
  const markPaymentSent = async (orderId, comprobanteUrl=null) => {
    setSubmitting(true);
    try {
      await api.p2pPaymentSent(orderId, {comprobante_url: comprobanteUrl});
      showToast("📤 Pago marcado como enviado");
      load();
      setActiveOrder(prev => prev
        ? {...prev, status:"payment_sent", comprobante_url:comprobanteUrl}
        : null);
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setSubmitting(false); }
  };

  // ── Liberar monedas ──────────────────────────────────────
  const release = async (orderId) => {
    setSubmitting(true);
    try {
      await api.p2pRelease(orderId);
      showToast("✅ Monedas liberadas al comprador");
      load(); setActiveOrder(null);
      if (refreshBalance) refreshBalance();
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setSubmitting(false); }
  };

  // ── Disputa ──────────────────────────────────────────────
  const openDispute = async (orderId, reason) => {
    try {
      await api.p2pDispute(orderId, {reason});
      showToast("⚠️ Disputa abierta. Un moderador revisará.");
      load();
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  const myActiveOrders = orders.filter(o =>
    ["pending_payment","payment_sent","disputed"].includes(o.status));

  // ── Render oferta en book ────────────────────────────────
  const renderOffer = (offer) => {
    const seller = {
      nombre:offer.seller_nombre, apodo:offer.seller_apodo,
      skin:offer.seller_skin, border:offer.seller_border,
      avatar_bg:offer.seller_avatar_bg,
    };
    return (
      <div key={offer.id} style={{...card, padding:"12px 14px", marginBottom:8}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
          <Av user={seller} sz={34} avatarBg={offer.seller_avatar_bg}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:800, fontSize:12, color:txt}}>{displayName(seller)}</div>
            <div style={{fontSize:10, color:sub}}>
              ⭐ {offer.seller_rating||"5.0"} · {offer.seller_trades||0} operaciones
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18, fontWeight:900, color:accent}}>
              ${parseFloat(offer.price_ars).toLocaleString("es-AR",{minimumFractionDigits:2})}
            </div>
            <div style={{fontSize:9, color:sub}}>por EduCoin</div>
          </div>
        </div>
        <div style={{display:"flex", justifyContent:"space-between",
          fontSize:10, color:sub, marginBottom:8}}>
          <span>Disponible: <strong style={{color:txt}}>🪙 {offer.amount}</strong></span>
          <span>Mín {offer.min_order} · Máx {offer.max_order}</span>
        </div>
        {offer.payment_methods?.length > 0 && (
          <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:8}}>
            {offer.payment_methods.map(m => (
              <span key={m} style={{background:inputBg, borderRadius:99,
                padding:"2px 8px", fontSize:9, fontWeight:700,
                color:sub, border:`1px solid ${navBord}`}}>
                {m==="transferencia" ? "🏦 Transfer" : m==="efectivo" ? "💵 Efectivo" : "💙 MercadoPago"}
              </span>
            ))}
          </div>
        )}
        <button onClick={() => { setBuyModal(offer); setBuyAmount(String(offer.min_order)); }}
          style={{width:"100%", background:accent, border:"none", borderRadius:50,
            color:"white", padding:"10px", fontWeight:800, fontSize:12,
            cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
          Comprar EduCoins
        </button>
      </div>
    );
  };

  // ── Render orden ─────────────────────────────────────────
  const renderOrder = (order, compact=false) => {
    const isBuyer  = order.buyer_id  === me.id;
    const isSeller = order.seller_id === me.id;
    const statusCol = STATUS_COLOR[order.status] || "#888";
    return (
      <div key={order.id}
        onClick={compact ? () => setActiveOrder(order) : undefined}
        style={{...card, padding:"14px 16px", marginBottom:10,
          cursor:compact ? "pointer" : "default",
          borderLeft:`3px solid ${statusCol}`}}>
        <div style={{display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:8}}>
          <div>
            <span style={{fontWeight:900, fontSize:16, color:txt}}>🪙 {order.amount}</span>
            <span style={{fontSize:11, color:sub, marginLeft:6}}>
              = ${parseFloat(order.total_ars).toLocaleString("es-AR")} ARS
            </span>
          </div>
          <span style={{fontSize:10, fontWeight:700, background:statusCol+"22",
            color:statusCol, borderRadius:99, padding:"3px 10px"}}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <div style={{fontSize:11, color:sub, marginBottom:8}}>
          {isBuyer ? `Vendedor: ${order.seller_nombre}` : `Comprador: ${order.buyer_nombre}`}
        </div>
        {order.status==="pending_payment" && order.payment_deadline && (
          <div style={{marginBottom:8}}>
            <Countdown deadline={order.payment_deadline}/>
          </div>
        )}
        {!compact && (
          <>
            {isBuyer && order.status==="pending_payment" && (
              <div>
                <div style={{background:inputBg, borderRadius:12, padding:12,
                  marginBottom:10, fontSize:12, color:txt, border:`1px solid ${navBord}`}}>
                  <div style={{fontWeight:800, marginBottom:4}}>📋 Instrucciones de pago:</div>
                  <div style={{color:sub}}>
                    {order.seller_instructions || "Contactá al vendedor por el chat."}
                  </div>
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button onClick={() => fileRef.current?.click()}
                    style={{flex:2, background:accent, border:"none", borderRadius:50,
                      color:"white", padding:"11px", fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    📤 Marcar pago enviado
                  </button>
                  <button onClick={() => openDispute(order.id, "El vendedor no responde")}
                    style={{flex:1, background:inputBg, border:`1px solid #ef444466`,
                      borderRadius:50, color:"#ef4444", padding:"11px", fontWeight:800,
                      fontSize:12, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    ⚠️ Disputa
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
                  onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    if (file.size > 1000000) { showToast("Max 1MB","error"); return; }
                    const r = new FileReader();
                    r.onload = async ev => { await markPaymentSent(order.id, ev.target.result); };
                    r.readAsDataURL(file);
                  }}/>
              </div>
            )}
            {isBuyer && order.status==="payment_sent" && (
              <div style={{background:inputBg, borderRadius:12, padding:12,
                fontSize:12, color:txt, border:`1px solid ${navBord}`}}>
                ✅ Pago enviado. Esperando confirmación del vendedor.
                {order.comprobante_url && (
                  <img src={order.comprobante_url} alt="comprobante"
                    style={{width:"100%",borderRadius:8,marginTop:8,
                      maxHeight:200,objectFit:"contain"}}/>
                )}
              </div>
            )}
            {isSeller && order.status==="payment_sent" && (
              <div>
                <div style={{background:inputBg, borderRadius:12, padding:12,
                  marginBottom:10, fontSize:12, color:txt, border:`1px solid ${navBord}`}}>
                  <div style={{fontWeight:800, color:accent, marginBottom:4}}>
                    💰 El comprador marcó el pago como enviado
                  </div>
                  <div style={{color:sub}}>
                    Verificá en tu cuenta antes de liberar las monedas.
                  </div>
                  {order.comprobante_url && (
                    <img src={order.comprobante_url} alt="comprobante"
                      style={{width:"100%",borderRadius:8,marginTop:8,
                        maxHeight:200,objectFit:"contain"}}/>
                  )}
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button onClick={() => release(order.id)} disabled={submitting}
                    style={{flex:2, background:"#10b981", border:"none", borderRadius:50,
                      color:"white", padding:"11px", fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    ✅ Confirmar y liberar EduCoins
                  </button>
                  <button onClick={() => openDispute(order.id, "El pago no llegó")}
                    style={{flex:1, background:inputBg, border:`1px solid #ef444466`,
                      borderRadius:50, color:"#ef4444", padding:"11px", fontWeight:800,
                      fontSize:12, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    ⚠️ Disputa
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Guards ───────────────────────────────────────────────
  if (!config) return (
    <div style={{background:bg,}}>
      <OHdrA title="💱 Exchange P2P" onBack={onBack}/>
    </div>
  );

  if (!config.activo) return (
    <div style={{background:bg,  fontFamily:"Nunito,sans-serif"}}>
      <OHdrA title="💱 Exchange P2P" onBack={onBack}/>
      <div style={{textAlign:"center", padding:"60px 24px", color:sub}}>
        <div style={{fontSize:52, marginBottom:16}}>🔜</div>
        <div style={{fontWeight:900, fontSize:20, color:txt, marginBottom:8}}>Próximamente</div>
        <div style={{fontSize:14, lineHeight:1.6}}>El exchange P2P está en preparación.</div>
      </div>
    </div>
  );

  return (
    <div style={{background:bg, 
      fontFamily:"Nunito,sans-serif", paddingBottom:32}}>
      <OHdrA title="💱 Exchange P2P" onBack={onBack}/>

      {/* ── Banner órdenes activas ───────────────────────── */}
      {myActiveOrders.length > 0 && (
        <div style={{background:accent+"18", borderBottom:`1px solid ${accent}33`,
          padding:"10px 14px", display:"flex", alignItems:"center", gap:8}}
          onClick={() => setTab("ordenes")}>
          <span style={{fontSize:16}}>🔔</span>
          <span style={{fontSize:12, fontWeight:700, color:accent, flex:1}}>
            Tenés {myActiveOrders.length} orden{myActiveOrders.length>1?"es":""} activa{myActiveOrders.length>1?"s":""}
          </span>
          <span style={{fontSize:12, color:accent}}>Ver →</span>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────── */}
      <div style={{display:"flex", borderBottom:`1px solid ${navBord}`,
        background:cardBg, padding:"0 4px"}}>
        {[
          ["mercado",     "🏪 Mercado"],
          ["mis-ofertas", "📋 Mis Ofertas"],
          ["ordenes",     `📦 Órdenes${myActiveOrders.length > 0 ? " ("+myActiveOrders.length+")" : ""}`],
        ].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{flex:1, padding:"11px 4px", background:"none", border:"none",
              fontWeight:800, fontSize:10, cursor:"pointer",
              fontFamily:"Nunito,sans-serif",
              color: tab===id ? accent : sub,
              borderBottom: `2.5px solid ${tab===id ? accent : "transparent"}`}}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading && (
          <div style={{textAlign:"center", color:sub, padding:32}}>Cargando...</div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB MERCADO
            ══════════════════════════════════════════════════ */}
        {!loading && tab==="mercado" && (
          <>
            {/* ── Ticker EDU/ARS ────────────────────────── */}
            <div style={{...card, padding:"14px 16px", marginBottom:10}}>
              {/* Saldo del usuario — siempre visible arriba */}
              <div style={{display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:12, paddingBottom:10,
                borderBottom:`1px solid ${navBord}`}}>
                <div>
                  <div style={{fontSize:10, color:sub, fontWeight:700, marginBottom:1}}>
                    Tu saldo
                  </div>
                  <div style={{fontSize:20, fontWeight:900, color:accent}}>
                    🪙 {(balance ?? 0).toLocaleString("es-AR")}
                  </div>
                </div>
                <button onClick={() => setNewOffer(true)}
                  style={{background:accent, border:"none", borderRadius:50,
                    color:"white", padding:"9px 16px", fontWeight:800, fontSize:12,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                  + Vender
                </button>
              </div>

              {/* Precio */}
              <div style={{display:"flex", justifyContent:"space-between",
                alignItems:"flex-end"}}>
                <div>
                  <div style={{fontSize:9, color:sub, fontWeight:700,
                    letterSpacing:1.5, marginBottom:2}}>
                    EDU / ARS
                  </div>
                  <div style={{display:"flex", alignItems:"baseline", gap:8}}>
                    <span style={{fontSize:26, fontWeight:900, color:txt, letterSpacing:-1}}>
                      {market?.last_price != null
                        ? `$${parseFloat(market.last_price).toLocaleString("es-AR",{minimumFractionDigits:2})}`
                        : <span style={{fontSize:16, color:sub}}>Sin datos aún</span>
                      }
                    </span>
                    {market?.last_price != null && (
                      <span style={{fontSize:11, fontWeight:800, padding:"2px 7px",
                        borderRadius:99,
                        background: market.change_24h >= 0 ? "#10b98120" : "#ef444420",
                        color:       market.change_24h >= 0 ? "#10b981"   : "#ef4444"}}>
                        {market.change_24h >= 0 ? "▲" : "▼"} {Math.abs(market.change_24h)}%
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:9, color:sub, marginTop:1}}>
                    Último precio negociado
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9, color:sub, fontWeight:700,
                    letterSpacing:1, marginBottom:1}}>
                    VOLUMEN 24H
                  </div>
                  <div style={{fontSize:14, fontWeight:800, color:txt}}>
                    🪙 {(market?.volume_24h_edu || 0).toLocaleString("es-AR")}
                  </div>
                  <div style={{fontSize:9, color:sub}}>
                    {market?.trade_count_24h || 0} operaciones
                  </div>
                </div>
              </div>

              {/* Stats rápidos */}
              <div style={{display:"flex", gap:6, marginTop:12}}>
                {[
                  ["Mejor precio", market?.best_offer_price
                    ? `$${parseFloat(market.best_offer_price).toLocaleString("es-AR",{minimumFractionDigits:2})}`
                    : "—"],
                  ["Disponible", market?.edu_disponibles
                    ? `🪙 ${market.edu_disponibles.toLocaleString("es-AR")}`
                    : "—"],
                  ["Ofertas", `${market?.active_offers || 0} activas`],
                ].map(([label, val]) => (
                  <div key={label} style={{flex:1, background:inputBg,
                    borderRadius:10, padding:"7px 5px", textAlign:"center",
                    border:`1px solid ${navBord}`}}>
                    <div style={{fontSize:9, color:sub, fontWeight:700, marginBottom:2}}>
                      {label}
                    </div>
                    <div style={{fontSize:11, fontWeight:800, color:txt}}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Gráfico — usa variables del tema ─────────── */}
            <Sparkline
              history={market?.price_history}
              accent={accent} cardBg={cardBg} txt={txt}
              sub={sub} navBord={navBord} isDark={dark}
            />

            {/* ── Trades recientes ─────────────────────────── */}
            {market?.recent_trades?.length > 0 && (
              <div style={{...card, padding:"12px 14px", marginBottom:10}}>
                <div style={{fontSize:11, fontWeight:800, color:txt, marginBottom:10}}>
                  Operaciones recientes
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                  paddingBottom:6, marginBottom:2, borderBottom:`1px solid ${navBord}`}}>
                  <span style={{fontSize:9, fontWeight:800, color:sub}}>PRECIO</span>
                  <span style={{fontSize:9, fontWeight:800, color:sub, textAlign:"center"}}>
                    CANTIDAD
                  </span>
                  <span style={{fontSize:9, fontWeight:800, color:sub, textAlign:"right"}}>
                    HORA
                  </span>
                </div>
                {market.recent_trades.slice(0,8).map((t,i) => (
                  <div key={i} style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                    padding:"5px 0", borderBottom:`1px solid ${navBord}22`}}>
                    <span style={{fontSize:11, fontWeight:800, color:"#10b981"}}>
                      ${parseFloat(t.price_ars).toLocaleString("es-AR",{minimumFractionDigits:2})}
                    </span>
                    <span style={{fontSize:11, color:txt, textAlign:"center"}}>
                      🪙 {t.amount}
                    </span>
                    <span style={{fontSize:10, color:sub, textAlign:"right"}}>
                      {new Date(t.executed_at).toLocaleTimeString("es-AR",{
                        hour:"2-digit", minute:"2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Book: selector Comprar / Vender ─────────── */}
            <div style={{...card, padding:"12px 14px"}}>
              {/* Toggle */}
              <div style={{display:"flex", background:inputBg, borderRadius:50,
                padding:3, marginBottom:12, border:`1px solid ${navBord}`}}>
                {[["comprar","🟢 Comprar"],["vender","🔴 Vender"]].map(([side, lbl]) => (
                  <button key={side} onClick={() => setBookSide(side)}
                    style={{
                      flex:1, padding:"8px", border:"none", borderRadius:50,
                      fontWeight:800, fontSize:12, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif", transition:"all .15s",
                      background: bookSide===side
                        ? (side==="comprar" ? "#10b981" : "#ef4444")
                        : "transparent",
                      color: bookSide===side ? "white" : sub,
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>

              {/* COMPRAR — ofertas de otros alumnos */}
              {bookSide==="comprar" && (
                offers.length === 0
                  ? <div style={{textAlign:"center", padding:24, color:sub}}>
                      <div style={{fontSize:32, marginBottom:6}}>📭</div>
                      <div style={{fontWeight:700, fontSize:13}}>Sin ofertas disponibles</div>
                      <div style={{fontSize:11, marginTop:4}}>Nadie está vendiendo por ahora</div>
                    </div>
                  : <>
                      <div style={{fontSize:9, color:sub, fontWeight:700,
                        letterSpacing:1, marginBottom:8}}>
                        ALUMNOS VENDIENDO
                      </div>
                      {offers.map(renderOffer)}
                    </>
              )}

              {/* VENDER — mis ofertas activas */}
              {bookSide==="vender" && (
                myOffers.filter(o => o.status==="active" || o.status==="paused").length === 0
                  ? <div style={{textAlign:"center", padding:24, color:sub}}>
                      <div style={{fontSize:32, marginBottom:6}}>📋</div>
                      <div style={{fontWeight:700, fontSize:13}}>No tenés ofertas publicadas</div>
                      <button onClick={() => setNewOffer(true)}
                        style={{marginTop:12, background:accent, border:"none",
                          borderRadius:50, color:"white", padding:"10px 20px",
                          fontWeight:800, fontSize:12, cursor:"pointer",
                          fontFamily:"Nunito,sans-serif"}}>
                        + Publicar oferta
                      </button>
                    </div>
                  : <>
                      <div style={{fontSize:9, color:sub, fontWeight:700,
                        letterSpacing:1, marginBottom:8}}>
                        TUS OFERTAS ACTIVAS
                      </div>
                      {myOffers
                        .filter(o => o.status==="active" || o.status==="paused")
                        .map(offer => (
                          <div key={offer.id} style={{...card, padding:"12px 14px", marginBottom:8}}>
                            <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                              <div>
                                <span style={{fontWeight:900, fontSize:15, color:txt}}>
                                  🪙 {offer.amount}
                                </span>
                                <span style={{fontSize:10, color:sub, marginLeft:6}}>
                                  @ ${parseFloat(offer.price_ars).toLocaleString("es-AR",{minimumFractionDigits:2})}/coin
                                </span>
                              </div>
                              <span style={{fontSize:10, fontWeight:700,
                                background: offer.status==="active" ? "#10b98120" : "#f59e0b20",
                                color:       offer.status==="active" ? "#10b981"   : "#f59e0b",
                                borderRadius:99, padding:"3px 10px"}}>
                                {offer.status==="active" ? "● Activa" : "● Pausada"}
                              </span>
                            </div>
                            <div style={{display:"flex", gap:8}}>
                              <button onClick={async () => { await api.p2pPauseOffer(offer.id); load(); }}
                                style={{flex:1, background:inputBg, border:`1px solid ${navBord}`,
                                  borderRadius:50, color:sub, padding:"8px", fontWeight:700,
                                  fontSize:11, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                                {offer.status==="active" ? "⏸ Pausar" : "▶ Activar"}
                              </button>
                              <button onClick={() => {
                                setConfirmModal({
                                  msg: "¿Cancelar oferta y recuperar tus EduCoins?",
                                  onOk: async () => {
                                    await api.p2pCancelOffer(offer.id);
                                    load(); if (refreshBalance) refreshBalance();
                                  }
                                });
                              }} style={{flex:1, background:inputBg, border:`1px solid #ef444466`,
                                borderRadius:50, color:"#ef4444", padding:"8px", fontWeight:700,
                                fontSize:11, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                                ✕ Cancelar
                              </button>
                            </div>
                          </div>
                        ))
                      }
                      <button onClick={() => setNewOffer(true)}
                        style={{width:"100%", background:"transparent",
                          border:`1.5px dashed ${accent}`, borderRadius:50,
                          color:accent, padding:"10px", fontWeight:800, fontSize:12,
                          cursor:"pointer", fontFamily:"Nunito,sans-serif", marginTop:4}}>
                        + Agregar otra oferta
                      </button>
                    </>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════
            TAB MIS OFERTAS — historial completo
            ══════════════════════════════════════════════════ */}
        {!loading && tab==="mis-ofertas" && (
          <>
            <div style={{...card, padding:"12px 16px", marginBottom:10}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10, color:sub}}>Tu saldo</div>
                  <div style={{fontSize:22, fontWeight:900, color:accent}}>
                    🪙 {(balance ?? 0).toLocaleString("es-AR")}
                  </div>
                </div>
                <button onClick={() => setNewOffer(true)}
                  style={{background:accent, border:"none", borderRadius:50, color:"white",
                    padding:"10px 18px", fontWeight:800, fontSize:12,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                  + Nueva oferta
                </button>
              </div>
            </div>
            {myOffers.filter(o => o.status==="active" || o.status==="paused").length === 0
              ? <div style={{textAlign:"center", padding:32, color:sub}}>
                  <div style={{fontSize:36, marginBottom:8}}>📋</div>
                  <div style={{fontWeight:700}}>Sin ofertas activas</div>
                  <div style={{fontSize:12, marginTop:4}}>Las órdenes ejecutadas aparecen en la pestaña Órdenes</div>
                </div>
              : myOffers.filter(o => o.status==="active" || o.status==="paused").map(offer => (
                  <div key={offer.id} style={{...card, padding:"14px 16px", marginBottom:10}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
                      <div>
                        <span style={{fontWeight:900, fontSize:16, color:txt}}>
                          🪙 {offer.amount}
                        </span>
                        <span style={{fontSize:11, color:sub, marginLeft:6}}>
                          @ ${parseFloat(offer.price_ars).toLocaleString("es-AR",{minimumFractionDigits:2})}/coin
                        </span>
                      </div>
                      <span style={{fontSize:10, fontWeight:700,
                        background: offer.status==="active" ? "#10b98120" : "#f59e0b20",
                        color:       offer.status==="active" ? "#10b981"   : "#f59e0b",
                        borderRadius:99, padding:"3px 10px"}}>
                        {offer.status==="active" ? "● Activa" : "● Pausada"}
                      </span>
                    </div>
                    {(offer.status==="active" || offer.status==="paused") && (
                      <div style={{display:"flex", gap:8}}>
                        <button onClick={async () => { await api.p2pPauseOffer(offer.id); load(); }}
                          style={{flex:1, background:inputBg, border:`1px solid ${navBord}`,
                            borderRadius:50, color:sub, padding:"9px", fontWeight:700,
                            fontSize:11, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                          {offer.status==="active" ? "⏸ Pausar" : "▶ Activar"}
                        </button>
                        <button onClick={async () => {
                          setConfirmModal({
                            msg: "¿Cancelar oferta y recuperar tus EduCoins?",
                            onOk: async () => {
                              await api.p2pCancelOffer(offer.id);
                              load(); if (refreshBalance) refreshBalance();
                            }
                          });
                        }} style={{flex:1, background:inputBg, border:`1px solid #ef444466`,
                          borderRadius:50, color:"#ef4444", padding:"9px", fontWeight:700,
                          fontSize:11, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                          ✕ Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))
            }
          </>
        )}

        {/* ══════════════════════════════════════════════════
            TAB ÓRDENES
            ══════════════════════════════════════════════════ */}
        {!loading && tab==="ordenes" && (() => {
          const activeStatuses  = ["pending_payment","payment_sent","disputed"];
          const historyStatuses = ["completed","cancelled","refunded"];
          const activeOrds  = orders.filter(o => activeStatuses.includes(o.status));
          const historyOrds = orders.filter(o => historyStatuses.includes(o.status));
          return (
            <>
              {/* Órdenes activas */}
              {activeOrds.length === 0 && historyOrds.length === 0 ? (
                <div style={{textAlign:"center", padding:32, color:sub}}>
                  <div style={{fontSize:36, marginBottom:8}}>📦</div>
                  <div style={{fontWeight:700}}>Sin órdenes todavía</div>
                </div>
              ) : (
                <>
                  {activeOrds.length > 0 && (
                    <>
                      <div style={{fontSize:9, color:sub, fontWeight:700,
                        letterSpacing:1, marginBottom:8}}>EN CURSO</div>
                      {activeOrds.map(o => (
                        <div key={o.id}
                          onClick={() => setOrderModal({
                            ...o,
                            seller_instructions: o.seller_instructions || o.instructions,
                          })}
                          style={{...card, padding:"14px 16px", marginBottom:10,
                            cursor:"pointer", borderLeft:`3px solid ${STATUS_COLOR[o.status]||"#888"}`}}>
                          <div style={{display:"flex", justifyContent:"space-between",
                            alignItems:"center", marginBottom:6}}>
                            <div>
                              <span style={{fontWeight:900, fontSize:16, color:txt}}>
                                🪙 {o.amount}
                              </span>
                              <span style={{fontSize:11, color:sub, marginLeft:6}}>
                                = ${parseFloat(o.total_ars).toLocaleString("es-AR")} ARS
                              </span>
                            </div>
                            <span style={{fontSize:10, fontWeight:700,
                              background:(STATUS_COLOR[o.status]||"#888")+"22",
                              color:STATUS_COLOR[o.status]||"#888",
                              borderRadius:99, padding:"3px 10px"}}>
                              {STATUS_LABEL[o.status]}
                            </span>
                          </div>
                          <div style={{display:"flex", justifyContent:"space-between",
                            alignItems:"center"}}>
                            <div style={{fontSize:11, color:sub}}>
                              {o.buyer_id===me.id
                                ? `Vendedor: ${o.seller_apodo||o.seller_nombre}`
                                : `Comprador: ${o.buyer_apodo||o.buyer_nombre}`}
                            </div>
                            {o.status==="pending_payment" && o.payment_deadline && (
                              <Countdown deadline={o.payment_deadline}/>
                            )}
                          </div>
                          <div style={{fontSize:10, color:accent, marginTop:6,
                            fontWeight:700}}>
                            Toca para ver detalles →
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Historial */}
                  {historyOrds.length > 0 && (
                    <>
                      <div style={{fontSize:9, color:sub, fontWeight:700,
                        letterSpacing:1, marginTop: activeOrds.length > 0 ? 16 : 0,
                        marginBottom:8}}>HISTORIAL</div>
                      {historyOrds.map(o => (
                        <div key={o.id}
                          onClick={() => setOrderModal({
                            ...o,
                            seller_instructions: o.seller_instructions || o.instructions,
                          })}
                          style={{...card, padding:"12px 14px", marginBottom:8,
                            cursor:"pointer",
                            borderLeft:`3px solid ${STATUS_COLOR[o.status]||"#888"}`}}>
                          <div style={{display:"flex", justifyContent:"space-between",
                            alignItems:"center"}}>
                            <div>
                              <span style={{fontWeight:800, fontSize:14, color:txt}}>
                                🪙 {o.amount}
                              </span>
                              <span style={{fontSize:10, color:sub, marginLeft:6}}>
                                = ${parseFloat(o.total_ars).toLocaleString("es-AR")} ARS
                              </span>
                            </div>
                            <span style={{fontSize:10, fontWeight:700,
                              background:(STATUS_COLOR[o.status]||"#888")+"22",
                              color:STATUS_COLOR[o.status]||"#888",
                              borderRadius:99, padding:"3px 8px"}}>
                              {STATUS_LABEL[o.status]}
                            </span>
                          </div>
                          <div style={{fontSize:10, color:sub, marginTop:4}}>
                            {o.buyer_id===me.id
                              ? `Vendedor: ${o.seller_apodo||o.seller_nombre}`
                              : `Comprador: ${o.buyer_apodo||o.buyer_nombre}`}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* ── Modal: Nueva oferta ───────────────────────────── */}
      {newOffer && (
        <div onClick={e => { if (e.target===e.currentTarget) setNewOffer(false); }}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
            zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}>
          <div style={{background:cardBg, borderRadius:"20px 20px 0 0",
            padding:20, width:"100%", maxWidth:480,
            maxHeight:"90vh", overflowY:"auto", fontFamily:"Nunito,sans-serif"}}>
            <div style={{fontWeight:900, fontSize:18, color:txt, marginBottom:4}}>
              📤 Publicar oferta
            </div>
            <div style={{fontSize:12, color:sub, marginBottom:16}}>
              Tus EduCoins quedarán bloqueadas hasta cancelar o completar la venta.
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:12}}>
              <div>
                <div style={{fontSize:12, fontWeight:700, color:sub, marginBottom:6}}>
                  Cantidad a vender (tu saldo: 🪙{balance ?? 0})
                </div>
                <input type="number" value={offerForm.amount} min="1" max={balance ?? 0}
                  onChange={e => setOfferForm(v => ({...v, amount:e.target.value}))}
                  placeholder="Ej: 100"
                  style={{width:"100%", background:inputBg, border:`1.5px solid ${inputBd}`,
                    borderRadius:10, padding:"12px", fontSize:18, fontWeight:800,
                    outline:"none", boxSizing:"border-box",
                    fontFamily:"Nunito,sans-serif", color:txt}}/>
              </div>
              <div>
                <div style={{fontSize:12, fontWeight:700, color:sub, marginBottom:6}}>
                  Precio por EduCoin (en ARS $)
                </div>
                <input type="number" value={offerForm.price_ars} min="0.01" step="0.01"
                  onChange={e => setOfferForm(v => ({...v, price_ars:e.target.value}))}
                  placeholder="Ej: 50.00"
                  style={{width:"100%", background:inputBg, border:`1.5px solid ${inputBd}`,
                    borderRadius:10, padding:"12px", fontSize:18, fontWeight:800,
                    outline:"none", boxSizing:"border-box",
                    fontFamily:"Nunito,sans-serif", color:txt}}/>
                {offerForm.amount && offerForm.price_ars && (
                  <div style={{fontSize:12, color:accent, fontWeight:700, marginTop:4}}>
                    Total: ${(parseFloat(offerForm.price_ars)*parseInt(offerForm.amount))
                      .toLocaleString("es-AR")} ARS
                  </div>
                )}
              </div>
              <div>
                <div style={{fontSize:12, fontWeight:700, color:sub, marginBottom:6}}>
                  Métodos de pago aceptados:
                </div>
                <div style={{display:"flex", gap:8}}>
                  {["transferencia","efectivo","mercadopago"].map(m => {
                    const sel = (offerForm.payment_methods||[]).includes(m);
                    return (
                      <button key={m} onClick={() => setOfferForm(v => {
                        const cur = v.payment_methods || [];
                        return {...v, payment_methods: sel
                          ? cur.filter(x => x!==m)
                          : [...cur, m]};
                      })} style={{flex:1, background:sel ? accent+"22" : inputBg,
                        border:`1.5px solid ${sel ? accent : inputBd}`,
                        borderRadius:10, padding:"8px 4px", fontSize:10, fontWeight:700,
                        cursor:"pointer", color:sel ? accent : sub,
                        fontFamily:"Nunito,sans-serif"}}>
                        {m==="transferencia" ? "🏦 Transfer"
                          : m==="efectivo" ? "💵 Efectivo"
                          : "💙 MercadoPago"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{fontSize:12, fontWeight:700, color:sub, marginBottom:6}}>
                  Instrucciones / datos de pago:
                </div>
                <textarea value={offerForm.instructions}
                  onChange={e => setOfferForm(v => ({...v, instructions:e.target.value}))}
                  placeholder="Ej: Alias: mi.alias.mp · CVU: 0000..."
                  rows={3}
                  style={{width:"100%", background:inputBg, border:`1.5px solid ${inputBd}`,
                    borderRadius:10, padding:"12px", fontSize:13, outline:"none",
                    boxSizing:"border-box", fontFamily:"Nunito,sans-serif",
                    color:txt, resize:"none"}}/>
              </div>
              <div style={{display:"flex", gap:8}}>
                <button onClick={createOffer} disabled={submitting}
                  style={{flex:2, background:submitting ? "#ccc" : accent,
                    border:"none", borderRadius:50, color:"white", padding:"13px",
                    fontWeight:800, fontSize:14, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  {submitting ? "Publicando..." : "📤 Publicar y bloquear EduCoins"}
                </button>
                <button onClick={() => setNewOffer(false)}
                  style={{flex:1, background:inputBg, border:`1px solid ${navBord}`,
                    borderRadius:50, color:sub, padding:"13px", fontWeight:700,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Comprar ────────────────────────────────── */}
      {/* ── Modal: Comprar — datos completos del vendedor ─── */}
      {buyModal && (
        <div onClick={e => { if (e.target===e.currentTarget) setBuyModal(null); }}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
            zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}>
          <div style={{background:cardBg, borderRadius:"20px 20px 0 0",
            padding:20, width:"100%", maxWidth:480, maxHeight:"90vh",
            overflowY:"auto", fontFamily:"Nunito,sans-serif"}}>

            {/* Header vendedor */}
            <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16,
              paddingBottom:14, borderBottom:`1px solid ${navBord}`}}>
              <Av user={{nombre:buyModal.seller_nombre, apodo:buyModal.seller_apodo,
                skin:buyModal.seller_skin, border:buyModal.seller_border}}
                sz={44} avatarBg={buyModal.seller_avatar_bg}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:900, fontSize:15, color:txt}}>
                  {buyModal.seller_apodo || buyModal.seller_nombre}
                </div>
                <div style={{fontSize:11, color:sub}}>
                  ⭐ {buyModal.seller_rating || "5.0"} reputación
                  · {buyModal.seller_trades || 0} operaciones
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:22, fontWeight:900, color:accent}}>
                  ${parseFloat(buyModal.price_ars).toLocaleString("es-AR",{minimumFractionDigits:2})}
                </div>
                <div style={{fontSize:9, color:sub}}>por EduCoin</div>
              </div>
            </div>

            {/* Datos de pago del vendedor */}
            {buyModal.instructions && (
              <div style={{background:inputBg, borderRadius:12, padding:14,
                marginBottom:14, border:`1px solid ${navBord}`}}>
                <div style={{fontSize:10, fontWeight:800, color:sub,
                  letterSpacing:1, marginBottom:8}}>DATOS DE PAGO DEL VENDEDOR</div>
                <div style={{fontSize:13, color:txt, lineHeight:1.7, whiteSpace:"pre-wrap"}}>
                  {buyModal.instructions}
                </div>
              </div>
            )}

            {/* Métodos aceptados */}
            {buyModal.payment_methods?.length > 0 && (
              <div style={{display:"flex", gap:6, marginBottom:14}}>
                {buyModal.payment_methods.map(m => (
                  <span key={m} style={{background:accent+"18", borderRadius:99,
                    padding:"4px 10px", fontSize:10, fontWeight:700, color:accent,
                    border:`1px solid ${accent}33`}}>
                    {m==="transferencia" ? "🏦 Transferencia"
                      : m==="efectivo" ? "💵 Efectivo"
                      : "💙 MercadoPago"}
                  </span>
                ))}
              </div>
            )}

            {/* Cantidad */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12, fontWeight:700, color:sub, marginBottom:6}}>
                ¿Cuántas EduCoins querés comprar?
              </div>
              <div style={{fontSize:10, color:sub, marginBottom:8}}>
                Mínimo {buyModal.min_order} · Disponible {buyModal.amount}
              </div>
              <input type="number" value={buyAmount}
                min={buyModal.min_order}
                max={Math.min(buyModal.max_order||99999, buyModal.amount)}
                onChange={e => setBuyAmount(e.target.value)}
                style={{width:"100%", background:inputBg, border:`1.5px solid ${inputBd}`,
                  borderRadius:10, padding:"12px", fontSize:24, fontWeight:900,
                  outline:"none", boxSizing:"border-box",
                  fontFamily:"Nunito,sans-serif", color:txt, textAlign:"center"}}/>
              {buyAmount && parseInt(buyAmount) > 0 && (
                <div style={{marginTop:10, background:accent+"12", borderRadius:10,
                  padding:"10px 14px", border:`1px solid ${accent}33`}}>
                  <div style={{display:"flex", justifyContent:"space-between"}}>
                    <span style={{fontSize:12, color:sub}}>Vas a recibir</span>
                    <span style={{fontSize:14, fontWeight:900, color:accent}}>
                      🪙 {parseInt(buyAmount)} EduCoins
                    </span>
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between", marginTop:4}}>
                    <span style={{fontSize:12, color:sub}}>Tenés que pagar</span>
                    <span style={{fontSize:14, fontWeight:900, color:txt}}>
                      ${(parseFloat(buyModal.price_ars)*parseInt(buyAmount||0))
                        .toLocaleString("es-AR",{minimumFractionDigits:2})} ARS
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso */}
            <div style={{fontSize:11, color:sub, textAlign:"center",
              marginBottom:14, lineHeight:1.5}}>
              Al crear la orden tenés <strong style={{color:txt}}>30 minutos</strong> para
              realizar el pago y subir el comprobante.
            </div>

            <div style={{display:"flex", gap:8}}>
              <button onClick={createOrder} disabled={submitting || !buyAmount || parseInt(buyAmount) < 1}
                style={{flex:2,
                  background: (submitting || !buyAmount || parseInt(buyAmount) < 1)
                    ? (dark ? "#333" : "#ccc") : "#10b981",
                  border:"none", borderRadius:50, color:"white", padding:"13px",
                  fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                {submitting ? "Creando..." : "✅ Confirmar y crear orden"}
              </button>
              <button onClick={() => setBuyModal(null)}
                style={{flex:1, background:inputBg, border:`1px solid ${navBord}`,
                  borderRadius:50, color:sub, padding:"13px", fontWeight:700,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal: Orden activa ────────────────────────────── */}
      {orderModal && (
        <div onClick={e => { if (e.target===e.currentTarget) setOrderModal(null); }}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
            zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}>
          <div style={{background:cardBg, borderRadius:"20px 20px 0 0",
            padding:20, width:"100%", maxWidth:480, maxHeight:"92vh",
            overflowY:"auto", fontFamily:"Nunito,sans-serif"}}>

            {/* ── Header de la orden ── */}
            {(() => {
              const o         = orderModal;
              const isBuyer   = o.buyer_id  === me.id;
              const isSeller  = o.seller_id === me.id;
              const statusCol = STATUS_COLOR[o.status] || "#888";
              return (
                <>
                  {/* Título + status */}
                  <div style={{display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:14}}>
                    <div>
                      <div style={{fontSize:18, fontWeight:900, color:txt}}>
                        🪙 {o.amount} EduCoins
                      </div>
                      <div style={{fontSize:11, color:sub, marginTop:2}}>
                        = ${parseFloat(o.total_ars).toLocaleString("es-AR")} ARS
                      </div>
                    </div>
                    <span style={{fontSize:11, fontWeight:800,
                      background:statusCol+"22", color:statusCol,
                      borderRadius:99, padding:"5px 12px"}}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>

                  {/* Countdown si está pendiente */}
                  {o.status==="pending_payment" && o.payment_deadline && (
                    <div style={{background:inputBg, borderRadius:10, padding:"10px 14px",
                      marginBottom:14, border:`1px solid #f59e0b44`,
                      display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                      <span style={{fontSize:12, color:sub}}>Tiempo para pagar</span>
                      <Countdown deadline={o.payment_deadline}/>
                    </div>
                  )}

                  {/* Info de la contraparte */}
                  <div style={{background:inputBg, borderRadius:12, padding:14,
                    marginBottom:14, border:`1px solid ${navBord}`}}>
                    <div style={{fontSize:10, fontWeight:800, color:sub,
                      letterSpacing:1, marginBottom:8}}>
                      {isBuyer ? "VENDEDOR" : "COMPRADOR"}
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:10}}>
                      <Av user={{
                        nombre: isBuyer ? o.seller_nombre : o.buyer_nombre,
                        apodo:  isBuyer ? o.seller_apodo  : o.buyer_apodo,
                        skin:   isBuyer ? o.seller_skin   : o.buyer_skin,
                        border: isBuyer ? o.seller_border : o.buyer_border,
                      }} sz={38}
                        avatarBg={isBuyer ? o.seller_avatar_bg : o.buyer_avatar_bg}/>
                      <div>
                        <div style={{fontWeight:800, fontSize:13, color:txt}}>
                          {isBuyer
                            ? (o.seller_apodo || o.seller_nombre)
                            : (o.buyer_apodo  || o.buyer_nombre)}
                        </div>
                        {isBuyer && (
                          <div style={{fontSize:10, color:sub}}>
                            ⭐ {o.seller_rating || "5.0"} · {o.seller_trades || 0} operaciones
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Datos de pago — solo para el comprador */}
                  {isBuyer && o.status==="pending_payment" && (
                    <div style={{background:inputBg, borderRadius:12, padding:14,
                      marginBottom:14, border:`1px solid ${accent}44`}}>
                      <div style={{fontSize:10, fontWeight:800, color:sub,
                        letterSpacing:1, marginBottom:8}}>DATOS DE PAGO</div>
                      <div style={{fontSize:13, color:txt, lineHeight:1.7,
                        whiteSpace:"pre-wrap"}}>
                        {o.seller_instructions || "Contactá al vendedor por el chat."}
                      </div>
                    </div>
                  )}

                  {/* Comprobante enviado (comprador) */}
                  {isBuyer && o.status==="payment_sent" && (
                    <div style={{background:inputBg, borderRadius:12, padding:14,
                      marginBottom:14, border:`1px solid #10b98133`}}>
                      <div style={{fontSize:12, fontWeight:800, color:"#10b981", marginBottom:6}}>
                        ✅ Pago enviado — esperando confirmación
                      </div>
                      {o.comprobante_url && (
                        <img src={o.comprobante_url} alt="comprobante"
                          style={{width:"100%", borderRadius:8, maxHeight:200,
                            objectFit:"contain", marginTop:4}}/>
                      )}
                    </div>
                  )}

                  {/* Vendedor: comprobante recibido */}
                  {isSeller && o.status==="payment_sent" && (
                    <div style={{background:inputBg, borderRadius:12, padding:14,
                      marginBottom:14, border:`1px solid ${accent}44`}}>
                      <div style={{fontSize:12, fontWeight:800, color:accent, marginBottom:4}}>
                        💰 El comprador marcó el pago como enviado
                      </div>
                      <div style={{fontSize:11, color:sub, marginBottom:8}}>
                        Verificá en tu cuenta antes de liberar las monedas.
                      </div>
                      {o.comprobante_url && (
                        <img src={o.comprobante_url} alt="comprobante"
                          style={{width:"100%", borderRadius:8, maxHeight:200,
                            objectFit:"contain"}}/>
                      )}
                    </div>
                  )}

                  {/* Orden completada */}
                  {o.status==="completed" && (
                    <div style={{background:"#10b98112", borderRadius:12, padding:14,
                      marginBottom:14, border:`1px solid #10b98133`,
                      textAlign:"center"}}>
                      <div style={{fontSize:28, marginBottom:4}}>🎉</div>
                      <div style={{fontSize:14, fontWeight:800, color:"#10b981"}}>
                        Operación completada
                      </div>
                    </div>
                  )}

                  {/* Orden cancelada */}
                  {(o.status==="cancelled" || o.status==="refunded") && (
                    <div style={{background:inputBg, borderRadius:12, padding:14,
                      marginBottom:14, border:`1px solid #94a3b833`,
                      textAlign:"center"}}>
                      <div style={{fontSize:13, color:sub}}>
                        {o.status==="cancelled" ? "Orden cancelada" : "Orden reembolsada"}
                      </div>
                    </div>
                  )}

                  {/* ── Acciones ── */}
                  <div style={{display:"flex", flexDirection:"column", gap:8}}>
                    {/* Comprador: marcar pago */}
                    {isBuyer && o.status==="pending_payment" && (
                      <>
                        <button onClick={() => fileRef.current?.click()}
                          style={{width:"100%", background:accent, border:"none",
                            borderRadius:50, color:"white", padding:"13px",
                            fontWeight:800, fontSize:14, cursor:"pointer",
                            fontFamily:"Nunito,sans-serif"}}>
                          📤 Ya pagué — subir comprobante
                        </button>
                        <input ref={fileRef} type="file" accept="image/*"
                          style={{display:"none"}}
                          onChange={async e => {
                            const file = e.target.files?.[0]; if (!file) return;
                            if (file.size > 1000000) { showToast("Max 1MB","error"); return; }
                            const r = new FileReader();
                            r.onload = async ev => {
                              await markPaymentSent(o.id, ev.target.result);
                              setOrderModal(prev => prev
                                ? {...prev, status:"payment_sent",
                                    comprobante_url:ev.target.result}
                                : null);
                            };
                            r.readAsDataURL(file);
                          }}/>
                        <button onClick={() => {
                          openDispute(o.id, "El vendedor no responde");
                          setOrderModal(prev => prev ? {...prev, status:"disputed"} : null);
                        }} style={{width:"100%", background:inputBg,
                          border:`1px solid #ef444466`, borderRadius:50,
                          color:"#ef4444", padding:"11px", fontWeight:700,
                          fontSize:13, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                          ⚠️ Abrir disputa
                        </button>
                      </>
                    )}

                    {/* Vendedor: liberar */}
                    {isSeller && o.status==="payment_sent" && (
                      <>
                        <button onClick={async () => {
                          await release(o.id);
                          setOrderModal(null);
                        }} disabled={submitting}
                          style={{width:"100%", background:"#10b981", border:"none",
                            borderRadius:50, color:"white", padding:"13px",
                            fontWeight:800, fontSize:14, cursor:"pointer",
                            fontFamily:"Nunito,sans-serif"}}>
                          ✅ Confirmar recepción y liberar EduCoins
                        </button>
                        <button onClick={() => {
                          openDispute(o.id, "El pago no llegó");
                          setOrderModal(prev => prev ? {...prev, status:"disputed"} : null);
                        }} style={{width:"100%", background:inputBg,
                          border:`1px solid #ef444466`, borderRadius:50,
                          color:"#ef4444", padding:"11px", fontWeight:700,
                          fontSize:13, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                          ⚠️ No recibí el pago — disputa
                        </button>
                      </>
                    )}

                    {/* Detalle técnico — solo admin/teacher */}
                    {(me.rol === 'admin' || me.rol === 'teacher') && (
                      <button onClick={async () => {
                        if (orderDetail?.order?.id === orderModal.id) {
                          setOrderDetail(null); // toggle
                        } else {
                          try {
                            const d = await api.p2pOrderDetail(orderModal.id);
                            setOrderDetail(d);
                          } catch(e) { showToast("Error al cargar detalle", "error"); }
                        }
                      }} style={{width:"100%", background:inputBg,
                        border:`1px solid ${accent}66`, borderRadius:50, color:accent,
                        padding:"11px", fontWeight:700, fontSize:12,
                        cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                        {orderDetail?.order?.id === orderModal.id
                          ? "▲ Ocultar detalle técnico"
                          : "🔍 Ver detalle técnico"}
                      </button>
                    )}

                    {/* Panel de detalle técnico */}
                    {orderDetail?.order?.id === orderModal.id && (
                      <div style={{background:inputBg, borderRadius:12, padding:14,
                        border:`1px solid ${navBord}`, fontSize:11}}>
                        <div style={{fontSize:10, fontWeight:800, color:sub,
                          letterSpacing:1, marginBottom:10}}>DETALLE TÉCNICO</div>

                        {[
                          ["ID Orden",           orderDetail.order.id],
                          ["ID Oferta",          orderDetail.order.offer_id],
                          ["Comprador",          `${orderDetail.order.buyer_nombre} (${orderDetail.order.buyer_email})`],
                          ["Cuenta comprador",   orderDetail.order.buyer_account_id],
                          ["Vendedor",           `${orderDetail.order.seller_nombre} (${orderDetail.order.seller_email})`],
                          ["Cuenta vendedor",    orderDetail.order.seller_account_id],
                          ["Monto EduCoins",     orderDetail.order.amount],
                          ["Precio ARS/coin",    `$${parseFloat(orderDetail.order.price_ars).toFixed(2)}`],
                          ["Total ARS",          `$${parseFloat(orderDetail.order.total_ars).toFixed(2)}`],
                          ["Estado",             orderDetail.order.status],
                          ["TX Escrow",          orderDetail.order.escrow_tx_id || "—"],
                          ["TX Liberación",      orderDetail.order.release_tx_id || "—"],
                          ["Fecha TX lib.",      orderDetail.order.release_tx_date
                            ? new Date(orderDetail.order.release_tx_date).toLocaleString("es-AR")
                            : "—"],
                          ["Creada",             new Date(orderDetail.order.created_at).toLocaleString("es-AR")],
                          ["Actualizada",        new Date(orderDetail.order.updated_at).toLocaleString("es-AR")],
                          ...(orderDetail.order.dispute_reason
                            ? [["Motivo disputa", orderDetail.order.dispute_reason],
                               ["Resuelto por",   orderDetail.order.resolved_by_nombre || "—"]]
                            : []),
                        ].map(([label, val]) => (
                          <div key={label} style={{display:"flex", justifyContent:"space-between",
                            padding:"4px 0", borderBottom:`1px solid ${navBord}33`,
                            gap:8}}>
                            <span style={{color:sub, flexShrink:0}}>{label}</span>
                            <span style={{color:txt, fontWeight:700, textAlign:"right",
                              wordBreak:"break-all", fontSize:10}}>{val}</span>
                          </div>
                        ))}

                        {/* Ledger entries */}
                        {orderDetail.ledger_entries?.length > 0 && (
                          <>
                            <div style={{fontSize:10, fontWeight:800, color:sub,
                              letterSpacing:1, marginTop:10, marginBottom:6}}>
                              MOVIMIENTOS LEDGER
                            </div>
                            {orderDetail.ledger_entries.map((e, i) => (
                              <div key={i} style={{display:"flex",
                                justifyContent:"space-between", padding:"3px 0",
                                borderBottom:`1px solid ${navBord}22`}}>
                                <span style={{color:sub, fontSize:10}}>
                                  {e.account_type} · {e.account_owner || "treasury"}
                                </span>
                                <span style={{fontWeight:800, fontSize:11,
                                  color: e.amount > 0 ? "#10b981" : "#ef4444"}}>
                                  {e.amount > 0 ? "+" : ""}{e.amount} 🪙
                                </span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    <button onClick={() => { setOrderModal(null); setOrderDetail(null); }}
                      style={{width:"100%", background:inputBg,
                        border:`1px solid ${navBord}`, borderRadius:50, color:sub,
                        padding:"11px", fontWeight:700, fontSize:13,
                        cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

            {/* ── Modal: Confirmación propia (reemplaza window.confirm) ── */}
      {confirmModal && (
        <div onClick={() => setConfirmModal(null)}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
            zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
            padding:"0 24px"}}>
          <div onClick={e => e.stopPropagation()}
            style={{background:cardBg, borderRadius:20, padding:"24px 20px",
              width:"100%", maxWidth:340, fontFamily:"Nunito,sans-serif",
              border:`1px solid ${navBord}`}}>
            <div style={{fontSize:16, fontWeight:800, color:txt,
              textAlign:"center", marginBottom:8}}>
              ¿Cancelar oferta?
            </div>
            <div style={{fontSize:13, color:sub, textAlign:"center", marginBottom:20, lineHeight:1.5}}>
              {confirmModal.msg}
            </div>
            <div style={{display:"flex", gap:10}}>
              <button onClick={() => setConfirmModal(null)}
                style={{flex:1, background:inputBg, border:`1px solid ${navBord}`,
                  borderRadius:50, color:sub, padding:"12px", fontWeight:700,
                  fontSize:13, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                No, volver
              </button>
              <button onClick={async () => {
                const fn = confirmModal.onOk;
                setConfirmModal(null);
                await fn();
              }} style={{flex:1, background:"#ef4444", border:"none",
                borderRadius:50, color:"white", padding:"12px", fontWeight:800,
                fontSize:13, cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AP2P;
