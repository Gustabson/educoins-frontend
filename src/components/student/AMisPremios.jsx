import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { SKINS, BORDERS, RARITIES } from "../../constants";
import { OHdrA } from "../shared/index";

const ICONS = {
  titulo:"🏅", border:"🔲", skin:"🎨", avatar_bg:"🖼️", name_color:"✏️", monedas:"🪙"
};

function ExpiryLabel({ expiresAt, sub }) {
  if (!expiresAt) return <span style={{fontSize:10,color:"#10b981",fontWeight:700}}>∞ Permanente</span>;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return <span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>Expirado</span>;
  const days = Math.ceil(diff / 86400000);
  const color = days <= 3 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#10b981";
  return <span style={{fontSize:10,color,fontWeight:700}}>
    ⏳ {days === 1 ? "1 día" : `${days} días`}
  </span>;
}

function AMisPremios({ me, showToast, onEquip, onBack }) {
  const { primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, navBord } = useTheme();

  const [tab,          setTab]          = useState("todos");
  const [earnedTitles, setEarnedTitles] = useState([]);
  const [loanedItems,  setLoanedItems]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [equipping,    setEquipping]    = useState(null);

  const card = { background:cardBg, borderRadius:16,
    boxShadow: dark?"0 2px 12px rgba(0,0,0,.25)":"0 2px 12px rgba(0,0,0,.06)" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [et, li] = await Promise.all([api.earnedTitles(), api.loanedItems()]);
      setEarnedTitles(Array.isArray(et) ? et : (et?.data || []));
      setLoanedItems(Array.isArray(li) ? li : (li?.data || []));
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Agrupar items por tipo
  const titulos    = earnedTitles.filter(t => !t.expires_at || new Date(t.expires_at) > new Date());
  const expirados  = earnedTitles.filter(t => t.expires_at && new Date(t.expires_at) <= new Date());
  const bordes     = loanedItems.filter(l => l.type === "border");
  const skins      = loanedItems.filter(l => l.type === "skin");
  const marcos     = loanedItems.filter(l => l.type === "avatar_bg");
  const colores    = loanedItems.filter(l => l.type === "name_color");

  const allActive  = [...titulos, ...bordes, ...skins, ...marcos, ...colores];
  const totalPremios = allActive.length;

  const TABS = [
    { id:"todos",    label:`Todos (${totalPremios})` },
    { id:"titulos",  label:`🏅 Títulos (${titulos.length})` },
    { id:"items",    label:`🎨 Items (${bordes.length+skins.length+marcos.length+colores.length})` },
    { id:"expirados",label:`📦 Expirados (${expirados.length})` },
  ];

  // Equipar un premio directamente
  const equipar = async (tipo, item) => {
    setEquipping(item.id);
    try {
      if (tipo === "titulo") {
        // Agregar a active_titles
        const cur = me.active_titles || [];
        const key = "earned:" + item.id;
        if (cur.includes(key)) { showToast("Ya está activo", "error"); return; }
        if (cur.length >= 5) { showToast("Máximo 5 títulos activos. Desactivá uno desde Mi Perfil", "error"); return; }
        await api.setActiveTitles([...cur, key]);
        showToast(`🏅 "${item.name}" activado`);
        if (onEquip) onEquip();
      } else if (tipo === "border") {
        const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : item.item_data;
        await api.equipItem("border", data.id || data.item_id);
        showToast(`🔲 Borde "${data.name || data.id}" equipado`);
        if (onEquip) onEquip();
      } else if (tipo === "skin") {
        const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : item.item_data;
        await api.equipItem("skin", data.id || data.item_id);
        showToast(`🎨 Skin "${data.name || data.id}" equipada`);
        if (onEquip) onEquip();
      } else if (tipo === "avatar_bg") {
        const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : item.item_data;
        await api.setAvatarBg({ ...data, loaned_id: item.id });
        showToast(`🖼️ Marco "${data.name}" equipado`);
        if (onEquip) onEquip();
      } else if (tipo === "name_color") {
        const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : item.item_data;
        await api.customEquip({ tipo: "name_color", item_id: data.item_id || item.id });
        showToast(`✏️ Color "${data.name}" equipado`);
        if (onEquip) onEquip();
      }
    } catch(e) { showToast(e.message || "Error al equipar", "error"); }
    finally { setEquipping(null); }
  };

  // Render de un título ganado
  const renderTitulo = (t, expired = false) => {
    const r = RARITIES[t.rarity] || RARITIES.common;
    return (
      <div key={t.id} style={{...card, padding:"12px 14px", marginBottom:8, opacity:expired?.6:1}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:40, height:40, borderRadius:12, background:r.color+"22",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
            border:`1.5px solid ${r.color}44`, flexShrink:0}}>
            {t.emoji || "🏅"}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
              <span style={{fontWeight:900, fontSize:14, color:r.color}}>{t.name}</span>
              <span style={{fontSize:9, fontWeight:700, background:r.color+"22",
                color:r.color, borderRadius:99, padding:"2px 7px", border:`1px solid ${r.color}44`}}>
                {t.rarity?.toUpperCase()}
              </span>
            </div>
            <div style={{fontSize:11, color:sub, marginTop:2, display:"flex", gap:8, flexWrap:"wrap"}}>
              {t.note && <span>"{t.note}"</span>}
              <ExpiryLabel expiresAt={t.expires_at} sub={sub}/>
            </div>
          </div>
          {!expired && (
            <button onClick={() => equipar("titulo", t)}
              disabled={equipping === t.id}
              style={{background: (me.active_titles||[]).includes("earned:"+t.id) ? "#10b98122" : accent,
                border: (me.active_titles||[]).includes("earned:"+t.id) ? `1.5px solid #10b981` : "none",
                borderRadius:99, color:(me.active_titles||[]).includes("earned:"+t.id) ? "#10b981" : "white",
                padding:"6px 14px", fontSize:11, fontWeight:800, cursor:"pointer",
                fontFamily:"Nunito,sans-serif", flexShrink:0}}>
              {equipping===t.id ? "..." : (me.active_titles||[]).includes("earned:"+t.id) ? "✓ Activo" : "Equipar"}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render de un item prestado (borde, skin, marco, color)
  const renderItem = (item) => {
    const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : (item.item_data || {});
    const expired = item.expires_at && new Date(item.expires_at) <= new Date();
    const icon = ICONS[item.type] || "🎁";

    // Buscar info de la skin/borde en constants
    let displayName = data.name || data.id || item.type;
    let preview = null;
    if (item.type === "skin") {
      const sk = SKINS.find(s => s.id === (data.id || data.item_id));
      if (sk) { displayName = sk.name; preview = <span style={{fontSize:24}}>{sk.emoji}</span>; }
    } else if (item.type === "border") {
      const br = BORDERS.find(b => b.id === (data.id || data.item_id));
      if (br) displayName = br.name;
    } else if (item.type === "avatar_bg" && data.value) {
      preview = <div style={{width:24, height:24, borderRadius:"50%",
        background:data.type==="gradient"||data.type==="solid" ? data.value : undefined,
        border:data.type==="frame" ? data.value : "none"}}/>;
    } else if (item.type === "name_color" && data.color) {
      preview = <span style={{fontSize:14, fontWeight:800, color:data.color}}>Aa</span>;
    }

    return (
      <div key={item.id} style={{...card, padding:"12px 14px", marginBottom:8, opacity:expired?.6:1}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:40, height:40, borderRadius:12, background:inputBg,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
            {preview || <span style={{fontSize:22}}>{icon}</span>}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontWeight:800, fontSize:13, color:txt}}>{displayName}</div>
            <div style={{fontSize:11, color:sub, marginTop:2, display:"flex", gap:8}}>
              <span style={{background:inputBg, borderRadius:99, padding:"1px 8px"}}>
                {item.type==="border"?"Borde":item.type==="skin"?"Skin":
                 item.type==="avatar_bg"?"Marco":item.type==="name_color"?"Color nombre":"Item"}
              </span>
              <ExpiryLabel expiresAt={item.expires_at} sub={sub}/>
            </div>
            {data.note && <div style={{fontSize:10, color:sub, fontStyle:"italic", marginTop:2}}>"{data.note}"</div>}
          </div>
          {!expired && (
            <button onClick={() => equipar(item.type, item)}
              disabled={equipping === item.id}
              style={{background:accent, border:"none", borderRadius:99,
                color:"white", padding:"6px 14px", fontSize:11, fontWeight:800,
                cursor:"pointer", fontFamily:"Nunito,sans-serif", flexShrink:0}}>
              {equipping===item.id ? "..." : "Equipar"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEmpty = (msg) => (
    <div style={{textAlign:"center", padding:32, color:sub}}>
      <div style={{fontSize:36, marginBottom:8}}>📭</div>
      <div style={{fontWeight:700}}>{msg}</div>
    </div>
  );

  return (
    <div style={{background:bg, minHeight:"100vh", fontFamily:"Nunito,sans-serif", padding:"0 0 32px"}}>
      {onBack && <OHdrA title="🏆 Mis Premios" onBack={onBack}/>}

      {/* Header stats */}
      <div style={{...card, margin:"0 14px 12px", padding:"14px 16px"}}>
        <div style={{display:"flex", justifyContent:"space-around", textAlign:"center"}}>
          {[
            {n:titulos.length,   label:"Títulos",  icon:"🏅"},
            {n:bordes.length+skins.length, label:"Items", icon:"🎨"},
            {n:marcos.length,    label:"Marcos",   icon:"🖼️"},
            {n:colores.length,   label:"Colores",  icon:"✏️"},
          ].map(({n, label, icon}) => (
            <div key={label}>
              <div style={{fontSize:22, fontWeight:900, color:accent}}>{n}</div>
              <div style={{fontSize:10, color:sub, fontWeight:700}}>{icon} {label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex", borderBottom:`1px solid ${navBord}`,
        background:cardBg, padding:"0 4px", overflowX:"auto"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{flexShrink:0, padding:"10px 10px", background:"none", border:"none",
              fontWeight:800, fontSize:10, cursor:"pointer", fontFamily:"Nunito,sans-serif",
              color:tab===t.id ? accent : sub,
              borderBottom:`2.5px solid ${tab===t.id ? accent : "transparent"}`}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading && <div style={{textAlign:"center", color:sub, padding:24}}>Cargando...</div>}

        {/* Todos */}
        {!loading && tab==="todos" && (
          <>
            {totalPremios === 0 && renderEmpty("Todavía no ganaste ningún premio")}
            {titulos.length > 0 && (
              <>
                <div style={{fontSize:11, fontWeight:700, color:sub, marginBottom:8}}>🏅 Títulos</div>
                {titulos.map(t => renderTitulo(t))}
              </>
            )}
            {[...bordes, ...skins, ...marcos, ...colores].length > 0 && (
              <>
                <div style={{fontSize:11, fontWeight:700, color:sub, margin:"12px 0 8px"}}>🎁 Items</div>
                {[...bordes, ...skins, ...marcos, ...colores].map(renderItem)}
              </>
            )}
          </>
        )}

        {/* Títulos */}
        {!loading && tab==="titulos" && (
          titulos.length === 0
            ? renderEmpty("Sin títulos ganados")
            : titulos.map(t => renderTitulo(t))
        )}

        {/* Items */}
        {!loading && tab==="items" && (
          [...bordes, ...skins, ...marcos, ...colores].length === 0
            ? renderEmpty("Sin items ganados")
            : [...bordes, ...skins, ...marcos, ...colores].map(renderItem)
        )}

        {/* Expirados */}
        {!loading && tab==="expirados" && (
          expirados.length === 0
            ? renderEmpty("Sin premios expirados")
            : <>
                <div style={{fontSize:11, color:sub, marginBottom:8}}>
                  Estos premios ya vencieron y no se pueden usar.
                </div>
                {expirados.map(t => renderTitulo(t, true))}
                {loanedItems.filter(l => l.expires_at && new Date(l.expires_at) <= new Date()).map(renderItem)}
              </>
        )}
      </div>
    </div>
  );
}

export default AMisPremios;
