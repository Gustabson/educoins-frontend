import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

// ── Reglas del marketplace ────────────────────────────────────
const RULES = [
  { icon:"📚", text:"Solo se permiten artículos escolares o relacionados con el ámbito educativo." },
  { icon:"🚫", text:"Prohibido publicar artículos peligrosos, ilegales, inapropiados o ajenos a la escuela." },
  { icon:"⚖️", text:"El incumplimiento puede derivar en eliminación del anuncio, sanciones de EduCoins y bloqueo permanente del acceso a la tienda." },
  { icon:"✅", text:"Al publicar aceptás cumplir con las normas de la comunidad educativa." },
];

const REPORT_REASONS = [
  "Artículo no escolar / fuera de tema",
  "Precio abusivo o engañoso",
  "Descripción falsa o engañosa",
  "Imagen inapropiada",
  "Contenido peligroso o ilegal",
  "Otro",
];

function SectionHeader({ title, sub, color }) {
  const { txt, sub: subClr, navBord } = useTheme();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
      <div style={{ flex:1, height:1, background:navBord }}/>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontWeight:900, fontSize:13, color:color || txt, letterSpacing:".04em" }}>{title}</div>
        {sub && <div style={{ fontSize:10, color:subClr, fontWeight:700 }}>{sub}</div>}
      </div>
      <div style={{ flex:1, height:1, background:navBord }}/>
    </div>
  );
}

function ItemCard({ item, onClick }) {
  const { primary, isDark, txt, sub, cardBg, inputBg } = useTheme();
  const sinStock = item.stock === 0;
  return (
    <div onClick={() => onClick(item)} style={{
      background:cardBg, borderRadius:18, overflow:"hidden",
      cursor:"pointer", opacity:sinStock ? .55 : 1,
      boxShadow:isDark?"0 2px 10px rgba(0,0,0,.45)":"0 2px 10px rgba(0,0,0,.08)",
      transition:"background .3s", display:"flex", flexDirection:"column" }}>

      {item.imagen_url ? (
        <div style={{ position:"relative", paddingBottom:"72%", overflow:"hidden",
          background:inputBg, flexShrink:0 }}>
          <img src={item.imagen_url} alt={item.nombre} style={{
            position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
          {sinStock && (
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ background:"#ef4444", color:"white", borderRadius:99,
                padding:"4px 12px", fontSize:11, fontWeight:900 }}>SIN STOCK</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ paddingBottom:"72%", position:"relative", background:primary+"18", flexShrink:0 }}>
          <div style={{ position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center", fontSize:44 }}>
            {item.icon || "🎁"}
          </div>
        </div>
      )}

      <div style={{ padding:"10px 11px 12px", flex:1, display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ fontWeight:800, fontSize:13, color:txt, lineHeight:1.25, transition:"color .3s",
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {item.nombre}
        </div>
        {item.publisher_nombre && (
          <div style={{ fontSize:10, color:sub, fontWeight:700, transition:"color .3s" }}>
            {item.publisher_nombre.split(" ")[0]}
          </div>
        )}
        <div style={{ marginTop:"auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:900, fontSize:15, color:primary, transition:"color .3s" }}>
            🪙 {item.precio.toLocaleString("es-AR")}
          </div>
          {item.stock > 0 && item.stock !== -1 && (
            <div style={{ fontSize:10, color:sub, fontWeight:700 }}>x{item.stock}</div>
          )}
        </div>
        {item.mensaje_oculto && (
          <div style={{ fontSize:10, color:primary, fontWeight:800 }}>🔒 Incluye sorpresa</div>
        )}
      </div>
    </div>
  );
}

// ── Image compression helper ──────────────────────────────────
function compressImage(file, maxWidth = 600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Formulario nuevo anuncio ──────────────────────────────────
function CreateSheet({ me, onClose, onCreated, showToast }) {
  const { primary, isDark, txt, sub, cardBg, navBord, inputBg } = useTheme();
  const [step,     setStep]     = useState("rules"); // rules → form
  const [nombre,   setNombre]   = useState("");
  const [desc,     setDesc]     = useState("");
  const [precio,   setPrecio]   = useState("");
  const [stock,    setStock]    = useState("");
  const [imgUrl,   setImgUrl]   = useState("");
  const [imgLoading, setImgLoading] = useState(false);
  const fileRef = useRef(null);
  const [saving,   setSaving]   = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10_000_000) { showToast("Imagen muy grande (máx 10MB)", "error"); return; }
    setImgLoading(true);
    try {
      const base64 = await compressImage(file);
      setImgUrl(base64);
    } catch { showToast("Error al procesar imagen", "error"); }
    finally { setImgLoading(false); }
  };

  const inp = {
    background:inputBg, border:`1px solid ${navBord}`, borderRadius:10,
    padding:"10px 12px", fontFamily:"Nunito,sans-serif", fontSize:14, fontWeight:700,
    color:txt, width:"100%", boxSizing:"border-box", outline:"none",
  };

  const submit = async () => {
    if (!nombre.trim() || !precio) return showToast("Nombre y precio requeridos", "error");
    setSaving(true);
    try {
      await api.createItem({
        nombre: nombre.trim(),
        descripcion: desc.trim() || null,
        precio: parseInt(precio),
        stock: stock ? parseInt(stock) : -1,
        imagen_url: imgUrl.trim() || null,
      });
      showToast("Anuncio publicado ✅");
      onCreated();
    } catch(e) {
      showToast(e.message || "Error al publicar", "error");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex",
      flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)" }}/>
      <div style={{ position:"relative", background:cardBg, borderRadius:"28px 28px 0 0",
        maxHeight:"90vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,.25)", transition:"background .3s",
        animation:"slideUp .25s ease" }}>
        <div style={{ width:40, height:4, background:navBord, borderRadius:99, margin:"12px auto 0", flexShrink:0 }}/>

        {step === "rules" ? (
          <div style={{ flex:1, overflowY:"auto", padding:"18px 20px 36px" }}>
            <div style={{ fontWeight:900, fontSize:18, color:txt, marginBottom:4,
              transition:"color .3s" }}>📋 Normas del marketplace</div>
            <div style={{ fontSize:12, color:sub, marginBottom:20, transition:"color .3s" }}>
              Leé y aceptá antes de publicar tu anuncio
            </div>
            {RULES.map((r,i) => (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start",
                padding:"12px 14px", marginBottom:8, background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.03)",
                borderRadius:14 }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{r.icon}</span>
                <span style={{ fontSize:13, color:txt, fontWeight:700, lineHeight:1.5,
                  transition:"color .3s" }}>{r.text}</span>
              </div>
            ))}
            <div style={{ background:"#ef444418", border:"1.5px solid #ef444433",
              borderRadius:14, padding:"12px 14px", marginTop:4, marginBottom:24 }}>
              <div style={{ fontSize:12, color:"#ef4444", fontWeight:800, lineHeight:1.5 }}>
                ⚠️ El incumplimiento puede resultar en sanciones económicas y bloqueo permanente de la tienda.
              </div>
            </div>
            <button onClick={() => setStep("form")} style={{
              width:"100%", padding:"14px", background:primary, color:"white",
              border:"none", borderRadius:16, fontFamily:"Nunito,sans-serif",
              fontSize:15, fontWeight:900, cursor:"pointer" }}>
              Entendido, continuar →
            </button>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:"auto", padding:"18px 20px 36px" }}>
            <div style={{ fontWeight:900, fontSize:18, color:txt, marginBottom:16,
              transition:"color .3s" }}>📦 Nuevo anuncio</div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:sub, marginBottom:4 }}>TÍTULO *</div>
              <input value={nombre} onChange={e=>setNombre(e.target.value)}
                placeholder="Ej: Regla 30cm, libros usados, cuaderno..." style={inp}/>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:sub, marginBottom:4 }}>DESCRIPCIÓN</div>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)}
                placeholder="Estado, detalles del artículo..." rows={3}
                style={{ ...inp, resize:"vertical", lineHeight:1.5 }}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:sub, marginBottom:4 }}>PRECIO 🪙 *</div>
                <input type="number" value={precio} onChange={e=>setPrecio(e.target.value)}
                  placeholder="0" style={inp}/>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:sub, marginBottom:4 }}>STOCK (vacío=∞)</div>
                <input type="number" value={stock} onChange={e=>setStock(e.target.value)}
                  placeholder="∞" style={inp}/>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:800, color:sub, marginBottom:8 }}>IMAGEN</div>
              {imgUrl && (
                <div style={{ position:"relative", paddingBottom:"56%", borderRadius:14, overflow:"hidden",
                  background:inputBg, marginBottom:10 }}>
                  <img src={imgUrl} alt="preview" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                  <button onClick={() => setImgUrl("")}
                    style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.6)",
                      border:"none", borderRadius:"50%", color:"white", width:28, height:28,
                      cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display:"none" }}/>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => fileRef.current?.click()} disabled={imgLoading}
                  style={{ flex:1, padding:"10px", background: primary+"18", color:primary,
                    border:`1.5px dashed ${primary}55`, borderRadius:12, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:800,
                    opacity: imgLoading ? .6 : 1 }}>
                  {imgLoading ? "Procesando..." : "📷 Subir foto"}
                </button>
                {!imgUrl && (
                  <input value={imgUrl} onChange={e => setImgUrl(e.target.value)}
                    placeholder="o pegar URL..."
                    style={{ ...inp, flex:1 }}/>
                )}
              </div>
            </div>

            <button onClick={submit} disabled={saving} style={{
              width:"100%", padding:"14px", background:primary, color:"white",
              border:"none", borderRadius:16, fontFamily:"Nunito,sans-serif",
              fontSize:15, fontWeight:900, cursor:"pointer", opacity:saving?.6:1 }}>
              {saving ? "Publicando..." : "Publicar anuncio"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mis anuncios ──────────────────────────────────────────────
function MyListingsSheet({ me, onClose, showToast, onRefresh }) {
  const { primary, isDark, txt, sub, cardBg, navBord, inputBg } = useTheme();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting,setDeleting]= useState(null);

  useEffect(() => {
    api.myStoreItems()
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const del = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}"?`)) return;
    setDeleting(item.id);
    try {
      await api.deleteItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Anuncio eliminado");
      onRefresh();
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setDeleting(null); }
  };

  const toggleActive = async (item) => {
    try {
      await api.updateItem(item.id, { activo: !item.activo });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: !i.activo } : i));
      onRefresh();
    } catch(e) { showToast(e.message || "Error", "error"); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex",
      flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)" }}/>
      <div style={{ position:"relative", background:cardBg, borderRadius:"28px 28px 0 0",
        maxHeight:"85vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,.25)", transition:"background .3s",
        animation:"slideUp .25s ease" }}>
        <div style={{ width:40, height:4, background:navBord, borderRadius:99, margin:"12px auto 0", flexShrink:0 }}/>
        <div style={{ padding:"16px 20px 10px", flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:17, color:txt, transition:"color .3s" }}>📦 Mis anuncios</div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 14px 32px" }}>
          {loading && <div style={{ textAlign:"center", padding:32, color:sub }}>Cargando...</div>}
          {!loading && items.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 0", color:sub }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📦</div>
              <div style={{ fontWeight:800 }}>No publicaste anuncios aún</div>
            </div>
          )}
          {items.map(item => (
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"12px 14px", marginBottom:8, background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.03)",
              borderRadius:16, opacity: item.activo ? 1 : .6 }}>
              <div style={{ width:44, height:44, borderRadius:12, overflow:"hidden",
                background:primary+"18", flexShrink:0, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:22 }}>
                {item.imagen_url
                  ? <img src={item.imagen_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : item.icon || "🎁"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:13, color:txt, transition:"color .3s" }}>{item.nombre}</div>
                <div style={{ fontSize:11, color:sub, fontWeight:700 }}>
                  🪙{item.precio} · {item.activo ? "✅ Activo" : "⏸ Pausado"}
                </div>
              </div>
              <button onClick={() => toggleActive(item)}
                style={{ background:"none", border:`1.5px solid ${navBord}`, borderRadius:8,
                  padding:"5px 10px", cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  fontSize:11, fontWeight:800, color:sub }}>
                {item.activo ? "Pausar" : "Activar"}
              </button>
              <button onClick={() => del(item)} disabled={deleting === item.id}
                style={{ background:"none", border:"none", cursor:"pointer",
                  fontSize:18, color:"#ef4444", padding:"4px" }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bottom sheet de detalle ───────────────────────────────────
function DetailSheet({ item, me, balance, onClose, onBuy, buying, showToast }) {
  const { primary, isDark, txt, sub, cardBg, navBord, inputBg } = useTheme();
  const [lightbox,   setLightbox]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting,    setReporting]    = useState(false);

  const isOwnItem = item.published_by === me?.id;

  const submitReport = async () => {
    if (!reportReason) return showToast("Seleccioná un motivo", "error");
    setReporting(true);
    try {
      await api.reportStoreItem(item.id, reportReason);
      showToast("Reporte enviado. La administración lo revisará.");
      setShowReport(false);
    } catch(e) { showToast(e.message || "Error al reportar", "error"); }
    finally { setReporting(false); }
  };

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.93)", zIndex:700,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <img src={item.imagen_url} alt="" style={{ maxWidth:"100%", maxHeight:"85vh",
            borderRadius:16, objectFit:"contain" }}/>
          <button onClick={() => setLightbox(false)}
            style={{ position:"absolute", top:20, right:20, background:"rgba(255,255,255,.2)",
              border:"none", borderRadius:"50%", color:"white", width:40, height:40,
              cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
              justifyContent:"center", fontFamily:"Nunito,sans-serif" }}>✕</button>
        </div>
      )}

      <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex",
        flexDirection:"column", justifyContent:"flex-end" }}>
        <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)" }}/>
        <div style={{ position:"relative", background:cardBg, borderRadius:"28px 28px 0 0",
          maxHeight:"88vh", display:"flex", flexDirection:"column",
          boxShadow:"0 -8px 40px rgba(0,0,0,.25)", transition:"background .3s",
          animation:"slideUp .25s ease" }}>
          <div style={{ width:40, height:4, background:navBord, borderRadius:99,
            margin:"12px auto 0", flexShrink:0 }}/>

          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 40px" }}>

            {/* Imagen */}
            {item.imagen_url && (
              <div onClick={() => setLightbox(true)}
                style={{ position:"relative", paddingBottom:"56%", overflow:"hidden",
                  borderRadius:18, background:inputBg, marginBottom:16, cursor:"pointer" }}>
                <img src={item.imagen_url} alt={item.nombre}
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                <div style={{ position:"absolute", bottom:10, right:10,
                  background:"rgba(0,0,0,.45)", borderRadius:99,
                  padding:"4px 10px", fontSize:10, color:"white", fontWeight:700 }}>
                  🔍 Ver completa
                </div>
              </div>
            )}
            {!item.imagen_url && (
              <div style={{ textAlign:"center", fontSize:64, marginBottom:12 }}>{item.icon || "🎁"}</div>
            )}

            {/* Título + precio + reportar */}
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
              gap:12, marginBottom:8 }}>
              <div style={{ fontWeight:900, fontSize:18, color:txt, flex:1,
                lineHeight:1.3, transition:"color .3s" }}>
                {item.nombre}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                <div style={{ fontWeight:900, fontSize:22, color:primary,
                  flexShrink:0, transition:"color .3s" }}>
                  🪙 {item.precio.toLocaleString("es-AR")}
                </div>
                {!isOwnItem && (
                  <button onClick={() => setShowReport(r => !r)}
                    style={{ background:"none", border:`1px solid ${navBord}`, borderRadius:8,
                      padding:"4px 10px", cursor:"pointer", fontFamily:"Nunito,sans-serif",
                      fontSize:10, fontWeight:800, color:sub }}>
                    🚩 Reportar
                  </button>
                )}
              </div>
            </div>

            {/* Publisher */}
            {item.publisher_nombre && (
              <div style={{ fontSize:12, color:sub, fontWeight:700, marginBottom:12 }}>
                Publicado por {item.publisher_nombre}
              </div>
            )}

            {/* Descripción */}
            {item.descripcion && (
              <div style={{ fontSize:14, color:sub, lineHeight:1.6, marginBottom:14,
                transition:"color .3s" }}>
                {item.descripcion}
              </div>
            )}

            {/* Badges */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
              {item.stock === 0 && (
                <span style={{ background:"#ef444422", color:"#ef4444",
                  borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>Sin stock</span>
              )}
              {item.stock > 0 && item.stock !== -1 && (
                <span style={{ background:primary+"18", color:primary,
                  borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>
                  Stock: {item.stock}
                </span>
              )}
              {item.stock === -1 && (
                <span style={{ background:"#10b98122", color:"#10b981",
                  borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>∞ Ilimitado</span>
              )}
              {item.mensaje_oculto && (
                <span style={{ background:primary+"18", color:primary,
                  borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>
                  🔒 Incluye sorpresa
                </span>
              )}
            </div>

            {/* Mensaje secreto revelado */}
            {item.mensaje_oculto && (
              <div style={{ background:primary+"12", border:`1.5px solid ${primary}33`,
                borderRadius:16, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:800, color:primary, marginBottom:6 }}>
                  🔓 Tu recompensa secreta
                </div>
                <div style={{ fontSize:13, color:txt, fontWeight:700, lineHeight:1.5,
                  transition:"color .3s" }}>
                  {item.mensaje_oculto}
                </div>
              </div>
            )}

            {/* Form de reporte */}
            {showReport && (
              <div style={{ background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)",
                borderRadius:16, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontWeight:900, fontSize:13, color:txt, marginBottom:10,
                  transition:"color .3s" }}>🚩 Reportar este anuncio</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
                  {REPORT_REASONS.map(r => (
                    <label key={r} style={{ display:"flex", alignItems:"center", gap:10,
                      cursor:"pointer", fontSize:13, color:txt, fontWeight:700,
                      transition:"color .3s" }}>
                      <input type="radio" name="report_reason"
                        checked={reportReason === r}
                        onChange={() => setReportReason(r)}
                        style={{ accentColor:primary }}/>
                      {r}
                    </label>
                  ))}
                </div>
                <button onClick={submitReport} disabled={reporting || !reportReason}
                  style={{ width:"100%", padding:"10px", background:"#ef4444", color:"white",
                    border:"none", borderRadius:12, fontFamily:"Nunito,sans-serif",
                    fontSize:13, fontWeight:900, cursor:"pointer",
                    opacity:(!reportReason || reporting) ? .5 : 1 }}>
                  {reporting ? "Enviando..." : "Enviar reporte"}
                </button>
              </div>
            )}

            {/* Botón comprar (no para items propios) */}
            {!isOwnItem && item.stock !== 0 && (
              <button onClick={() => !buying && onBuy(item)} disabled={balance < item.precio || buying}
                style={{ width:"100%", padding:"15px",
                  background: balance < item.precio
                    ? (isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)") : primary,
                  color: balance < item.precio ? sub : "white",
                  border:"none", borderRadius:18, fontFamily:"Nunito,sans-serif",
                  fontSize:15, fontWeight:900,
                  cursor: balance < item.precio ? "not-allowed" : "pointer",
                  opacity: buying ? .6 : 1, transition:"all .2s" }}>
                {buying ? "Comprando..." :
                 balance < item.precio
                   ? `Necesitás 🪙${(item.precio - balance).toLocaleString("es-AR")} más`
                   : `Comprar por 🪙${item.precio.toLocaleString("es-AR")}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function ATienda({ me, balance, showToast, refreshBalance, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [detail,     setDetail]     = useState(null);
  const [buying,     setBuying]     = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showMine,   setShowMine]   = useState(false);

  const load = () =>
    api.storeItems()
      .then(d => setItems(Array.isArray(d) ? d : d.data || []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

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
      setDetail(fresh || null);
    } catch(e) {
      showToast(e.message || "Error al comprar", "error");
    } finally { setBuying(false); }
  };

  // Split into sections
  const adminItems   = items.filter(i => !i.published_by || ['admin','teacher'].includes(i.publisher_rol));
  const studentItems = items.filter(i => i.published_by  && i.publisher_rol === 'student');

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      background:pageBg, fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ background:primary, position:"sticky", top:0, zIndex:50,
        overflow:"hidden", color:"white", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ padding:"22px 20px 18px", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", position:"relative", minHeight:32 }}>
            {/* Volver */}
            {onBack && (
              <div style={{ position:"absolute", left:0, zIndex:1 }}>
                <button onClick={onBack}
                  style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
                    color:"white", padding:"6px 14px", cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:900 }}>
                  ‹
                </button>
              </div>
            )}
            {/* Título centrado */}
            <div style={{ position:"absolute", left:0, right:0, textAlign:"center",
              pointerEvents:"none", fontWeight:900, fontSize:20, color:"white" }}>
              Tienda
            </div>
            {/* Mis anuncios arriba a la derecha */}
            <div style={{ position:"absolute", right:0, zIndex:1 }}>
              <button onClick={() => setShowMine(true)}
                style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
                  color:"white", padding:"6px 14px", cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:800 }}>
                📦 Mis anuncios
              </button>
            </div>
          </div>
          <div style={{ textAlign:"center", fontSize:12, opacity:.8, fontWeight:700, marginTop:10 }}>
            Tu saldo: 🪙 {(balance||0).toLocaleString("es-AR")}
          </div>
        </div>
      </div>

      {/* ── Contenido ──────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 12px 100px" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0", color:sub, fontWeight:700 }}>
            Cargando tienda...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:sub }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
            <div style={{ fontWeight:800, fontSize:15 }}>Tienda vacía</div>
            <div style={{ fontSize:13, marginTop:4 }}>Sé el primero en publicar un anuncio</div>
          </div>
        )}

        {/* Sección Administración */}
        {adminItems.length > 0 && (
          <>
            <SectionHeader title="Administración" sub="Publicaciones oficiales" color={primary}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
              {adminItems.map(item => (
                <ItemCard key={item.id} item={item} onClick={setDetail}/>
              ))}
            </div>
          </>
        )}

        {/* Sección Alumnos */}
        {studentItems.length > 0 && (
          <>
            <SectionHeader title="Alumnos" sub="Solo artículos escolares · Comprá bajo tu responsabilidad"/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
              {studentItems.map(item => (
                <ItemCard key={item.id} item={item} onClick={setDetail}/>
              ))}
            </div>
          </>
        )}

        {/* Aviso si solo hay sección alumnos vacía */}
        {!loading && adminItems.length === 0 && studentItems.length === 0 && null}
      </div>

      {/* ── FAB Publicar anuncio ────────────────────────────── */}
      <div style={{ position:"fixed", bottom:90, right:20, zIndex:100 }}>
        <button onClick={() => setShowCreate(true)}
          style={{ background:primary, color:"white", border:"none", borderRadius:99,
            padding:"13px 22px", fontFamily:"Nunito,sans-serif", fontSize:14, fontWeight:900,
            cursor:"pointer", boxShadow:`0 4px 20px ${primary}66`,
            display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>+</span> Publicar
        </button>
      </div>

      {/* ── Sheets ─────────────────────────────────────────── */}
      {detail && (
        <DetailSheet
          item={detail} me={me} balance={balance}
          onClose={() => setDetail(null)}
          onBuy={buy} buying={buying}
          showToast={showToast}/>
      )}

      {showCreate && (
        <CreateSheet
          me={me}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          showToast={showToast}/>
      )}

      {showMine && (
        <MyListingsSheet
          me={me}
          onClose={() => setShowMine(false)}
          showToast={showToast}
          onRefresh={load}/>
      )}
    </div>
  );
}
