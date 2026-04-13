import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA } from "../shared/index";

function ATienda({ me, balance, showToast, refreshBalance }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord, inputBg } = useTheme();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null); // item abierto en bottom sheet
  const [buying,  setBuying]  = useState(false);
  const [lightbox,setLightbox]= useState(null);

  useEffect(() => {
    api.storeItems()
      .then(d => setItems(Array.isArray(d) ? d : d.data || []))
      .finally(() => setLoading(false));
  }, []);

  const buy = async (item) => {
    if (balance < item.precio) { showToast("No tenés saldo suficiente", "error"); return; }
    setBuying(true);
    try {
      await api.purchase(item.id);
      showToast(`Compraste "${item.nombre}" 🎉`);
      await refreshBalance();
      const updated = await api.storeItems();
      const arr = Array.isArray(updated) ? updated : updated.data || [];
      setItems(arr);
      const fresh = arr.find(i => i.id === item.id);
      if (fresh?.mensaje_oculto) {
        setDetail(fresh);
        showToast("¡Revisá el mensaje secreto!", "success");
      } else {
        setDetail(null);
      }
    } catch (e) {
      showToast(e.message || "Error al comprar", "error");
    } finally { setBuying(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      background:pageBg, fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ background:primary, position:"sticky", top:0, zIndex:50,
        overflow:"hidden", color:"white", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ padding:"22px 20px 18px", position:"relative" }}>
          <div style={{ fontWeight:900, fontSize:22, marginBottom:4 }}>🛒 Tienda</div>
          <div style={{ fontSize:13, opacity:.85, fontWeight:700 }}>
            Tu saldo: 🪙 {(balance||0).toLocaleString("es-AR")}
          </div>
        </div>
      </div>

      {/* ── Grid de productos ────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 12px 32px" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0", color:sub, fontWeight:700 }}>
            Cargando tienda...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:sub }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
            <div style={{ fontWeight:800, fontSize:15 }}>Tienda vacía</div>
            <div style={{ fontSize:13, marginTop:4 }}>No hay productos publicados aún</div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {items.map(item => {
            const sinStock = item.stock === 0;
            const canBuy   = balance >= item.precio && !sinStock;
            return (
              <div key={item.id}
                onClick={() => setDetail(item)}
                style={{ background:cardBg, borderRadius:18, overflow:"hidden",
                  cursor:"pointer", opacity:sinStock ? .55 : 1,
                  boxShadow:isDark?"0 2px 10px rgba(0,0,0,.45)":"0 2px 10px rgba(0,0,0,.08)",
                  transition:"background .3s, transform .15s",
                  display:"flex", flexDirection:"column" }}>

                {/* Imagen */}
                {item.imagen_url ? (
                  <div style={{ position:"relative", paddingBottom:"72%", overflow:"hidden",
                    background:inputBg, flexShrink:0 }}>
                    <img src={item.imagen_url} alt={item.nombre}
                      style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                        objectFit:"cover" }}/>
                    {sinStock && (
                      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)",
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ background:"#ef4444", color:"white", borderRadius:99,
                          padding:"4px 12px", fontSize:11, fontWeight:900 }}>SIN STOCK</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ paddingBottom:"72%", position:"relative",
                    background: primary + "18", flexShrink:0 }}>
                    <div style={{ position:"absolute", inset:0, display:"flex",
                      alignItems:"center", justifyContent:"center", fontSize:48 }}>
                      {item.icon || "🎁"}
                    </div>
                  </div>
                )}

                {/* Info */}
                <div style={{ padding:"10px 11px 12px", flex:1, display:"flex",
                  flexDirection:"column", gap:4 }}>
                  <div style={{ fontWeight:800, fontSize:13, color:txt, lineHeight:1.25,
                    transition:"color .3s",
                    display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                    overflow:"hidden" }}>
                    {item.nombre}
                  </div>
                  <div style={{ marginTop:"auto", display:"flex", alignItems:"center",
                    justifyContent:"space-between" }}>
                    <div style={{ fontWeight:900, fontSize:15, color:primary,
                      transition:"color .3s" }}>
                      🪙 {item.precio.toLocaleString("es-AR")}
                    </div>
                    {item.stock > 0 && item.stock !== -1 && (
                      <div style={{ fontSize:10, color:sub, fontWeight:700 }}>
                        x{item.stock}
                      </div>
                    )}
                  </div>
                  {item.mensaje_oculto && (
                    <div style={{ fontSize:10, color:primary, fontWeight:800 }}>
                      🔒 Incluye sorpresa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Lightbox imagen grande ───────────────────────────── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.93)", zIndex:600,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <img src={lightbox} alt="" style={{ maxWidth:"100%", maxHeight:"85vh",
            borderRadius:16, objectFit:"contain" }}/>
          <button onClick={() => setLightbox(null)}
            style={{ position:"absolute", top:20, right:20, background:"rgba(255,255,255,.2)",
              border:"none", borderRadius:"50%", color:"white", width:40, height:40,
              cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
              justifyContent:"center", fontFamily:"Nunito,sans-serif" }}>✕</button>
        </div>
      )}

      {/* ── Bottom sheet de detalle ──────────────────────────── */}
      {detail && (
        <div style={{ position:"fixed", inset:0, zIndex:500,
          display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          {/* overlay */}
          <div onClick={() => setDetail(null)}
            style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)" }}/>

          <div style={{ position:"relative", background:cardBg, borderRadius:"28px 28px 0 0",
            maxHeight:"88vh", display:"flex", flexDirection:"column",
            boxShadow:"0 -8px 40px rgba(0,0,0,.25)", transition:"background .3s",
            animation:"slideUp .25s ease" }}>

            {/* Handle */}
            <div style={{ width:40, height:4, background:navBord, borderRadius:99,
              margin:"12px auto 0", flexShrink:0 }}/>

            <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 40px" }}>

              {/* Imagen grande */}
              {detail.imagen_url && (
                <div onClick={() => setLightbox(detail.imagen_url)}
                  style={{ position:"relative", paddingBottom:"56%", overflow:"hidden",
                    borderRadius:18, background:inputBg, marginBottom:16, cursor:"pointer" }}>
                  <img src={detail.imagen_url} alt={detail.nombre}
                    style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                      objectFit:"cover" }}/>
                  <div style={{ position:"absolute", bottom:10, right:10,
                    background:"rgba(0,0,0,.45)", borderRadius:99,
                    padding:"4px 10px", fontSize:10, color:"white", fontWeight:700 }}>
                    🔍 Ver completa
                  </div>
                </div>
              )}

              {!detail.imagen_url && (
                <div style={{ textAlign:"center", fontSize:64, marginBottom:12 }}>
                  {detail.icon || "🎁"}
                </div>
              )}

              {/* Título + precio */}
              <div style={{ display:"flex", alignItems:"flex-start",
                justifyContent:"space-between", gap:12, marginBottom:12 }}>
                <div style={{ fontWeight:900, fontSize:18, color:txt, flex:1,
                  lineHeight:1.3, transition:"color .3s" }}>
                  {detail.nombre}
                </div>
                <div style={{ fontWeight:900, fontSize:22, color:primary,
                  flexShrink:0, transition:"color .3s" }}>
                  🪙 {detail.precio.toLocaleString("es-AR")}
                </div>
              </div>

              {/* Descripción */}
              {detail.descripcion && (
                <div style={{ fontSize:14, color:sub, lineHeight:1.6, marginBottom:14,
                  transition:"color .3s" }}>
                  {detail.descripcion}
                </div>
              )}

              {/* Badges */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
                {detail.stock === 0 && (
                  <span style={{ background:"#ef444422", color:"#ef4444",
                    borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>
                    Sin stock
                  </span>
                )}
                {detail.stock > 0 && detail.stock !== -1 && (
                  <span style={{ background:primary+"18", color:primary,
                    borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>
                    Stock: {detail.stock}
                  </span>
                )}
                {detail.stock === -1 && (
                  <span style={{ background:"#10b98122", color:"#10b981",
                    borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>
                    ∞ Ilimitado
                  </span>
                )}
                {detail.mensaje_oculto && (
                  <span style={{ background:primary+"18", color:primary,
                    borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>
                    🔒 Incluye sorpresa
                  </span>
                )}
              </div>

              {/* Mensaje oculto revelado (si ya compró) */}
              {detail.mensaje_oculto && (
                <div style={{ background:primary+"12", border:`1.5px solid ${primary}33`,
                  borderRadius:16, padding:"14px 16px", marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:primary, marginBottom:6 }}>
                    🔓 Tu recompensa secreta
                  </div>
                  <div style={{ fontSize:13, color:txt, fontWeight:700, lineHeight:1.5,
                    transition:"color .3s" }}>
                    {detail.mensaje_oculto}
                  </div>
                </div>
              )}

              {/* Botón comprar */}
              {detail.stock !== 0 && (
                <button
                  onClick={() => !buying && buy(detail)}
                  disabled={balance < detail.precio || buying}
                  style={{ width:"100%", padding:"15px", background:
                    balance < detail.precio ? (isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)") : primary,
                    color: balance < detail.precio ? sub : "white",
                    border:"none", borderRadius:18, fontFamily:"Nunito,sans-serif",
                    fontSize:15, fontWeight:900, cursor: balance < detail.precio ? "not-allowed" : "pointer",
                    opacity: buying ? .6 : 1, transition:"all .2s" }}>
                  {buying ? "Comprando..." :
                   balance < detail.precio ? `Necesitás 🪙${(detail.precio - balance).toLocaleString("es-AR")} más` :
                   `Comprar por 🪙${detail.precio.toLocaleString("es-AR")}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ATienda;
