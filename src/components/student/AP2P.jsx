import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../api";
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

function AP2P({ me, balance, showToast, onBack, refreshBalance }) {
  const { primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, inputBd, navBord } = useTheme();

  const [tab,         setTab]        = useState("mercado");
  const [config,      setConfig]     = useState(null);
  const [offers,      setOffers]     = useState([]);
  const [myOffers,    setMyOffers]   = useState([]);
  const [orders,      setOrders]     = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [activeOrder, setActiveOrder]= useState(null); // orden abierta
  const [newOffer,    setNewOffer]   = useState(false);
  const [offerForm,   setOfferForm]  = useState({amount:"",price_ars:"",min_order:"",instructions:"",payment_methods:["transferencia"]});
  const [buyModal,    setBuyModal]   = useState(null); // oferta a comprar
  const [buyAmount,   setBuyAmount]  = useState("");
  const [submitting,  setSubmitting] = useState(false);
  const fileRef = useRef();

  const card = { background:cardBg, borderRadius:16, boxShadow:dark?"0 2px 12px rgba(0,0,0,.25)":"0 2px 12px rgba(0,0,0,.06)" };

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const [cfg, off, myOff, ord] = await Promise.all([
        api.p2pConfig(), api.p2pOffers(), api.p2pMyOffers(), api.p2pOrders()
      ]);
      setConfig(cfg.data||cfg);
      setOffers(Array.isArray(off.data||off)?off.data||off:[]);
      setMyOffers(Array.isArray(myOff.data||myOff)?myOff.data||myOff:[]);
      setOrders(Array.isArray(ord.data||ord)?ord.data||ord:[]);
    }catch(e){ showToast("Error al cargar","error"); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  // ── Crear oferta ───────────────────────────────────────────
  const createOffer = async()=>{
    if(!offerForm.amount||!offerForm.price_ars) return showToast("Completá los campos","error");
    setSubmitting(true);
    try{
      await api.p2pCreateOffer({
        amount:parseInt(offerForm.amount),
        price_ars:parseFloat(offerForm.price_ars),
        min_order:parseInt(offerForm.min_order)||1,
        instructions:offerForm.instructions,
        payment_methods:offerForm.payment_methods,
      });
      showToast("✅ Oferta publicada");
      setNewOffer(false);
      setOfferForm({amount:"",price_ars:"",min_order:"",instructions:"",payment_methods:["transferencia"]});
      load(); if(refreshBalance) refreshBalance();
    }catch(e){ showToast(e.message||"Error","error"); }
    finally{ setSubmitting(false); }
  };

  // ── Comprar (crear orden) ──────────────────────────────────
  const createOrder = async()=>{
    if(!buyAmount) return showToast("Ingresá la cantidad","error");
    setSubmitting(true);
    try{
      const r = await api.p2pCreateOrder(buyModal.id, {amount:parseInt(buyAmount)});
      const order = r.data||r;
      showToast("✅ Orden creada. Tenés 30 min para pagar.");
      setBuyModal(null); setBuyAmount("");
      setActiveOrder(order);
      load();
    }catch(e){ showToast(e.message||"Error","error"); }
    finally{ setSubmitting(false); }
  };

  // ── Pago enviado ───────────────────────────────────────────
  const markPaymentSent = async(orderId, comprobanteUrl=null)=>{
    setSubmitting(true);
    try{
      await api.p2pPaymentSent(orderId, {comprobante_url:comprobanteUrl});
      showToast("📤 Pago marcado como enviado");
      load();
      setActiveOrder(prev=>prev?{...prev,status:"payment_sent",comprobante_url:comprobanteUrl}:null);
    }catch(e){ showToast(e.message||"Error","error"); }
    finally{ setSubmitting(false); }
  };

  // ── Liberar monedas ────────────────────────────────────────
  const release = async(orderId)=>{
    setSubmitting(true);
    try{
      await api.p2pRelease(orderId);
      showToast("✅ Monedas liberadas al comprador");
      load(); setActiveOrder(null);
      if(refreshBalance) refreshBalance();
    }catch(e){ showToast(e.message||"Error","error"); }
    finally{ setSubmitting(false); }
  };

  // ── Disputa ────────────────────────────────────────────────
  const openDispute = async(orderId, reason)=>{
    try{
      await api.p2pDispute(orderId,{reason});
      showToast("⚠️ Disputa abierta. Un moderador revisará.");
      load();
    }catch(e){ showToast(e.message||"Error","error"); }
  };

  const myActiveOrders = orders.filter(o=>["pending_payment","payment_sent","disputed"].includes(o.status));

  // ── Render oferta en mercado ───────────────────────────────
  const renderOffer = (offer) => {
    const seller = { nombre:offer.seller_nombre, apodo:offer.seller_apodo, skin:offer.seller_skin, border:offer.seller_border, avatar_bg:offer.seller_avatar_bg };
    const total = parseFloat(offer.price_ars) * parseInt(buyAmount||offer.min_order||1);
    return(
      <div key={offer.id} style={{...card, padding:"14px 16px", marginBottom:10}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
          <Av user={seller} sz={38} avatarBg={offer.seller_avatar_bg}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:800, fontSize:13, color:txt}}>{displayName(seller)}</div>
            <div style={{fontSize:10, color:sub}}>
              ⭐ {offer.seller_rating||"5.0"} · {offer.seller_trades||0} operaciones
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20, fontWeight:900, color:accent}}>
              ${parseFloat(offer.price_ars).toLocaleString("es-AR")}
            </div>
            <div style={{fontSize:10, color:sub}}>por EduCoin</div>
          </div>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:11, color:sub, marginBottom:10}}>
          <span>💰 Disponible: <strong style={{color:txt}}>{offer.amount} 🪙</strong></span>
          <span>Min: {offer.min_order} · Max: {offer.max_order}</span>
        </div>
        {offer.payment_methods?.length>0&&(
          <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:10}}>
            {offer.payment_methods.map(m=>(
              <span key={m} style={{background:inputBg, borderRadius:99, padding:"2px 10px", fontSize:10, fontWeight:700, color:sub}}>
                {m==="transferencia"?"🏦 Transferencia":m==="efectivo"?"💵 Efectivo":m}
              </span>
            ))}
          </div>
        )}
        <button onClick={()=>{setBuyModal(offer); setBuyAmount(String(offer.min_order));}}
          style={{width:"100%", background:accent, border:"none", borderRadius:50,
            color:"white", padding:"11px", fontWeight:800, fontSize:13,
            cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
          Comprar EduCoins
        </button>
      </div>
    );
  };

  // ── Render orden activa ────────────────────────────────────
  const renderOrder = (order, compact=false) => {
    const isBuyer  = order.buyer_id  === me.id;
    const isSeller = order.seller_id === me.id;
    const statusCol = STATUS_COLOR[order.status]||"#888";
    return(
      <div key={order.id} style={{...card, padding:"14px 16px", marginBottom:10,
        border:`1.5px solid ${statusCol}33`}}
        onClick={compact?()=>setActiveOrder(order):undefined}
        style={{...card, padding:"14px 16px", marginBottom:10, cursor:compact?"pointer":"default",
          border:`1.5px solid ${statusCol}33`}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
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
          {isBuyer  ? `Vendedor: ${order.seller_nombre}` : `Comprador: ${order.buyer_nombre}`}
        </div>
        {order.status==="pending_payment"&&order.payment_deadline&&(
          <div style={{marginBottom:8}}><Countdown deadline={order.payment_deadline}/></div>
        )}
        {!compact&&(
          <>
            {/* Comprador: debe pagar */}
            {isBuyer&&order.status==="pending_payment"&&(
              <div>
                <div style={{background:inputBg, borderRadius:12, padding:12, marginBottom:10, fontSize:12, color:txt}}>
                  <div style={{fontWeight:800, marginBottom:4}}>📋 Instrucciones de pago:</div>
                  <div style={{color:sub}}>{order.seller_instructions||"Contactá al vendedor por el chat."}</div>
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button onClick={()=>fileRef.current?.click()}
                    style={{flex:2, background:accent, border:"none", borderRadius:50,
                      color:"white", padding:"11px", fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    📤 Marcar pago enviado
                  </button>
                  <button onClick={()=>openDispute(order.id,"El vendedor no responde")}
                    style={{flex:1, background:"#fee2e2", border:"none", borderRadius:50,
                      color:"#ef4444", padding:"11px", fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    ⚠️ Disputa
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
                  onChange={async e=>{
                    const file=e.target.files?.[0]; if(!file) return;
                    if(file.size>1000000){showToast("Max 1MB","error");return;}
                    const r=new FileReader();
                    r.onload=async ev=>{ await markPaymentSent(order.id, ev.target.result); };
                    r.readAsDataURL(file);
                  }}/>
              </div>
            )}
            {/* Comprobante enviado */}
            {isBuyer&&order.status==="payment_sent"&&(
              <div style={{background:"#f0fdf4", borderRadius:12, padding:12, fontSize:12, color:"#065f46"}}>
                ✅ Pago enviado. Esperando que el vendedor confirme.
                {order.comprobante_url&&(
                  <img src={order.comprobante_url} alt="comprobante"
                    style={{width:"100%", borderRadius:8, marginTop:8, maxHeight:200, objectFit:"contain"}}/>
                )}
              </div>
            )}
            {/* Vendedor: confirmar pago */}
            {isSeller&&order.status==="payment_sent"&&(
              <div>
                <div style={{background:"#fffbeb", borderRadius:12, padding:12, marginBottom:10, fontSize:12}}>
                  <div style={{fontWeight:800, color:"#b45309", marginBottom:4}}>💰 El comprador marcó el pago como enviado</div>
                  <div style={{color:"#92400e"}}>Verificá en tu cuenta bancaria antes de liberar las monedas.</div>
                  {order.comprobante_url&&(
                    <img src={order.comprobante_url} alt="comprobante"
                      style={{width:"100%", borderRadius:8, marginTop:8, maxHeight:200, objectFit:"contain"}}/>
                  )}
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button onClick={()=>release(order.id)} disabled={submitting}
                    style={{flex:2, background:"#10b981", border:"none", borderRadius:50,
                      color:"white", padding:"11px", fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    ✅ Confirmar y liberar EduCoins
                  </button>
                  <button onClick={()=>openDispute(order.id,"El pago no llegó")}
                    style={{flex:1, background:"#fee2e2", border:"none", borderRadius:50,
                      color:"#ef4444", padding:"11px", fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                    ⚠️ Disputa
                  </button>
                </div>
              </div>
            )}
            {/* Completada */}
            {order.status==="completed"&&(
              <div style={{background:"#f0fdf4", borderRadius:12, padding:12, fontSize:12, color:"#065f46", fontWeight:700}}>
                ✅ Operación completada
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if(!config) return <div style={{background:bg,minHeight:"100vh"}}><OHdrA title="💱 Exchange P2P" onBack={onBack}/></div>;

  if(!config.activo) return(
    <div style={{background:bg, minHeight:"100vh", fontFamily:"Nunito,sans-serif"}}>
      <OHdrA title="💱 Exchange P2P" onBack={onBack}/>
      <div style={{textAlign:"center", padding:"60px 24px", color:sub}}>
        <div style={{fontSize:52, marginBottom:16}}>🔜</div>
        <div style={{fontWeight:900, fontSize:20, color:txt, marginBottom:8}}>Próximamente</div>
        <div style={{fontSize:14, lineHeight:1.6}}>El exchange P2P está en preparación y se lanzará próximamente.</div>
      </div>
    </div>
  );

  return(
    <div style={{background:bg, minHeight:"100vh", fontFamily:"Nunito,sans-serif", paddingBottom:32}}>
      <OHdrA title="💱 Exchange P2P" onBack={onBack}/>

      {/* Banner de órdenes activas */}
      {myActiveOrders.length>0&&(
        <div style={{background:accent+"22", borderBottom:`1px solid ${accent}44`,
          padding:"10px 14px", display:"flex", alignItems:"center", gap:8}}
          onClick={()=>setTab("ordenes")}>
          <span style={{fontSize:16}}>🔔</span>
          <span style={{fontSize:12, fontWeight:700, color:accent, flex:1}}>
            Tenés {myActiveOrders.length} orden{myActiveOrders.length>1?"es":""} activa{myActiveOrders.length>1?"s":""}
          </span>
          <span style={{fontSize:12, color:accent}}>Ver →</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex", borderBottom:`1px solid ${navBord}`, background:cardBg, padding:"0 4px"}}>
        {[["mercado","🏪 Mercado"],["mis-ofertas","📋 Mis Ofertas"],["ordenes",`📦 Órdenes${myActiveOrders.length>0?" ("+myActiveOrders.length+")":""}`]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1, padding:"11px 4px", background:"none", border:"none",
              fontWeight:800, fontSize:10, cursor:"pointer", fontFamily:"Nunito,sans-serif",
              color:tab===id?accent:sub, borderBottom:`2.5px solid ${tab===id?accent:"transparent"}`}}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:sub,padding:32}}>Cargando...</div>}

        {/* ── Mercado ─────────────────────────────────────────── */}
        {!loading&&tab==="mercado"&&(
          <>
            <div style={{...card, padding:"12px 16px", marginBottom:12}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11, color:sub}}>Tu saldo</div>
                  <div style={{fontSize:22, fontWeight:900, color:accent}}>🪙 {balance.toLocaleString("es-AR")}</div>
                </div>
                <button onClick={()=>setNewOffer(true)}
                  style={{background:accent, border:"none", borderRadius:50,
                    color:"white", padding:"10px 18px", fontWeight:800, fontSize:12,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif"}}>
                  + Publicar oferta
                </button>
              </div>
            </div>
            {offers.length===0
              ? <div style={{textAlign:"center",padding:32,color:sub}}>
                  <div style={{fontSize:36,marginBottom:8}}>📭</div>
                  <div style={{fontWeight:700}}>Sin ofertas disponibles</div>
                  <div style={{fontSize:12,marginTop:4}}>Sé el primero en publicar</div>
                </div>
              : offers.map(renderOffer)
            }
          </>
        )}

        {/* ── Mis Ofertas ─────────────────────────────────────── */}
        {!loading&&tab==="mis-ofertas"&&(
          <>
            {myOffers.length===0
              ? <div style={{textAlign:"center",padding:32,color:sub}}>
                  <div style={{fontSize:36,marginBottom:8}}>📋</div>
                  <div style={{fontWeight:700}}>Sin ofertas publicadas</div>
                  <button onClick={()=>{setTab("mercado");setNewOffer(true);}}
                    style={{marginTop:12,background:accent,border:"none",borderRadius:50,
                      color:"white",padding:"10px 20px",fontWeight:800,fontSize:12,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    + Publicar oferta
                  </button>
                </div>
              : myOffers.map(offer=>(
                  <div key={offer.id} style={{...card, padding:"14px 16px", marginBottom:10}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
                      <div>
                        <span style={{fontWeight:900,fontSize:16,color:txt}}>🪙 {offer.amount}</span>
                        <span style={{fontSize:11,color:sub,marginLeft:6}}>
                          @ ${parseFloat(offer.price_ars).toLocaleString("es-AR")}/coin
                        </span>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,background:
                        offer.status==="active"?"#10b98122":"#f59e0b22",
                        color:offer.status==="active"?"#10b981":"#f59e0b",
                        borderRadius:99,padding:"3px 10px"}}>
                        {offer.status==="active"?"● Activa":"● Pausada"}
                      </span>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={async()=>{
                        await api.p2pPauseOffer(offer.id); load();
                      }} style={{flex:1,background:inputBg,border:"none",borderRadius:50,
                        color:sub,padding:"9px",fontWeight:700,fontSize:11,
                        cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                        {offer.status==="active"?"⏸ Pausar":"▶ Activar"}
                      </button>
                      <button onClick={async()=>{
                        if(!window.confirm("¿Cancelar oferta y recuperar EduCoins?")) return;
                        await api.p2pCancelOffer(offer.id); load(); if(refreshBalance) refreshBalance();
                      }} style={{flex:1,background:"#fee2e2",border:"none",borderRadius:50,
                        color:"#ef4444",padding:"9px",fontWeight:700,fontSize:11,
                        cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                ))
            }
          </>
        )}

        {/* ── Órdenes ─────────────────────────────────────────── */}
        {!loading&&tab==="ordenes"&&(
          <>
            {activeOrder && renderOrder(activeOrder)}
            {orders.filter(o=>o.id!==activeOrder?.id).length===0&&!activeOrder
              ? <div style={{textAlign:"center",padding:32,color:sub}}>
                  <div style={{fontSize:36,marginBottom:8}}>📦</div>
                  <div style={{fontWeight:700}}>Sin órdenes todavía</div>
                </div>
              : orders.filter(o=>o.id!==activeOrder?.id).map(o=>renderOrder(o,true))
            }
          </>
        )}
      </div>

      {/* ── Modal: Nueva oferta ──────────────────────────────── */}
      {newOffer&&(
        <div onClick={e=>{if(e.target===e.currentTarget){setNewOffer(false);} }}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"20px 20px 0 0",padding:20,
            width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",
            fontFamily:"Nunito,sans-serif"}}>
            <div style={{fontWeight:900,fontSize:18,color:txt,marginBottom:4}}>📤 Publicar oferta</div>
            <div style={{fontSize:12,color:sub,marginBottom:16}}>
              Tus EduCoins quedarán bloqueadas hasta cancelar o completar la venta.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:sub,marginBottom:6}}>
                  Cantidad a vender (tu saldo: 🪙{balance})
                </div>
                <input type="number" value={offerForm.amount} min="1" max={balance}
                  onChange={e=>setOfferForm(v=>({...v,amount:e.target.value}))}
                  placeholder="Ej: 100"
                  style={{width:"100%",background:inputBg,border:`1.5px solid ${inputBd}`,
                    borderRadius:10,padding:"12px",fontSize:18,fontWeight:800,
                    outline:"none",boxSizing:"border-box",fontFamily:"Nunito,sans-serif",color:txt}}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:sub,marginBottom:6}}>
                  Precio por EduCoin (en ARS $)
                </div>
                <input type="number" value={offerForm.price_ars} min="0.01" step="0.01"
                  onChange={e=>setOfferForm(v=>({...v,price_ars:e.target.value}))}
                  placeholder="Ej: 50.00"
                  style={{width:"100%",background:inputBg,border:`1.5px solid ${inputBd}`,
                    borderRadius:10,padding:"12px",fontSize:18,fontWeight:800,
                    outline:"none",boxSizing:"border-box",fontFamily:"Nunito,sans-serif",color:txt}}/>
                {offerForm.amount&&offerForm.price_ars&&(
                  <div style={{fontSize:12,color:accent,fontWeight:700,marginTop:4}}>
                    Total: ${(parseFloat(offerForm.price_ars)*parseInt(offerForm.amount)).toLocaleString("es-AR")} ARS
                  </div>
                )}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:sub,marginBottom:6}}>Métodos de pago aceptados:</div>
                <div style={{display:"flex",gap:8}}>
                  {["transferencia","efectivo","mercadopago"].map(m=>{
                    const sel=(offerForm.payment_methods||[]).includes(m);
                    return(
                      <button key={m} onClick={()=>setOfferForm(v=>{
                        const cur=v.payment_methods||[];
                        return {...v,payment_methods:sel?cur.filter(x=>x!==m):[...cur,m]};
                      })} style={{flex:1,background:sel?accent+"22":inputBg,
                        border:`1.5px solid ${sel?accent:inputBd}`,
                        borderRadius:10,padding:"8px 4px",fontSize:10,fontWeight:700,
                        cursor:"pointer",color:sel?accent:sub,fontFamily:"Nunito,sans-serif"}}>
                        {m==="transferencia"?"🏦 Transfer":m==="efectivo"?"💵 Efectivo":"💙 MercadoPago"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:sub,marginBottom:6}}>
                  Instrucciones / datos de pago:
                </div>
                <textarea value={offerForm.instructions}
                  onChange={e=>setOfferForm(v=>({...v,instructions:e.target.value}))}
                  placeholder="Ej: Alias: mi.alias.mp · CVU: 0000..."
                  rows={3}
                  style={{width:"100%",background:inputBg,border:`1.5px solid ${inputBd}`,
                    borderRadius:10,padding:"12px",fontSize:13,outline:"none",
                    boxSizing:"border-box",fontFamily:"Nunito,sans-serif",color:txt,resize:"none"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={createOffer} disabled={submitting}
                  style={{flex:2,background:submitting?"#ccc":accent,border:"none",borderRadius:50,
                    color:"white",padding:"13px",fontWeight:800,fontSize:14,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {submitting?"Publicando...":"📤 Publicar y bloquear EduCoins"}
                </button>
                <button onClick={()=>setNewOffer(false)}
                  style={{flex:1,background:inputBg,border:"none",borderRadius:50,
                    color:sub,padding:"13px",fontWeight:700,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Comprar ───────────────────────────────────── */}
      {buyModal&&(
        <div onClick={e=>{if(e.target===e.currentTarget){setBuyModal(null);} }}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"20px 20px 0 0",padding:20,
            width:"100%",maxWidth:480,fontFamily:"Nunito,sans-serif"}}>
            <div style={{fontWeight:900,fontSize:18,color:txt,marginBottom:4}}>💱 Comprar EduCoins</div>
            <div style={{fontSize:12,color:sub,marginBottom:14}}>
              Vendedor: <strong>{buyModal.seller_apodo||buyModal.seller_nombre}</strong>
            </div>
            <div style={{...{background:inputBg,borderRadius:12,padding:12,marginBottom:14}}}>
              <div style={{fontSize:13,fontWeight:700,color:txt,marginBottom:4}}>
                💰 Precio: ${parseFloat(buyModal.price_ars).toLocaleString("es-AR")} por EduCoin
              </div>
              {buyModal.instructions&&(
                <div style={{fontSize:12,color:sub}}>📋 {buyModal.instructions}</div>
              )}
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:sub,marginBottom:6}}>
                Cantidad (entre {buyModal.min_order} y {Math.min(buyModal.max_order||999,buyModal.amount)}):
              </div>
              <input type="number" value={buyAmount}
                min={buyModal.min_order} max={Math.min(buyModal.max_order||999,buyModal.amount)}
                onChange={e=>setBuyAmount(e.target.value)}
                style={{width:"100%",background:inputBg,border:`1.5px solid ${inputBd}`,
                  borderRadius:10,padding:"12px",fontSize:18,fontWeight:800,
                  outline:"none",boxSizing:"border-box",fontFamily:"Nunito,sans-serif",color:txt}}/>
              {buyAmount&&(
                <div style={{fontSize:13,fontWeight:800,color:accent,marginTop:6}}>
                  Total a pagar: ${(parseFloat(buyModal.price_ars)*parseInt(buyAmount||0)).toLocaleString("es-AR")} ARS
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={createOrder} disabled={submitting}
                style={{flex:2,background:submitting?"#ccc":"#10b981",border:"none",borderRadius:50,
                  color:"white",padding:"13px",fontWeight:800,fontSize:14,
                  cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                {submitting?"Creando orden...":"✅ Crear orden"}
              </button>
              <button onClick={()=>setBuyModal(null)}
                style={{flex:1,background:inputBg,border:"none",borderRadius:50,
                  color:sub,padding:"13px",fontWeight:700,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AP2P;
