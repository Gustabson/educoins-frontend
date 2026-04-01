import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { SKINS, BORDERS, RARITIES } from "../../constants";
import { OHdrA } from "../shared/index";

function ExpiryLabel({ expiresAt }) {
  if (!expiresAt) return <span style={{fontSize:10,color:"#10b981",fontWeight:700}}>∞ Permanente</span>;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return <span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>✕ Expirado</span>;
  const days = Math.ceil(diff / 86400000);
  const color = days <= 3 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#10b981";
  return <span style={{fontSize:10,color,fontWeight:700}}>⏳ {days}d restantes</span>;
}

function AMisPremios({ me, showToast, onEquip, onBack }) {
  const { primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, navBord } = useTheme();

  const [tab,      setTab]      = useState("todos");
  const [titles,   setTitles]   = useState([]);
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [equipping,setEquipping]= useState(null);

  const card = {
    background: cardBg,
    borderRadius: 16,
    boxShadow: dark ? "0 2px 12px rgba(0,0,0,.25)" : "0 2px 12px rgba(0,0,0,.06)"
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.myPrizes();
      const data = d?.data || d || {};
      setTitles(Array.isArray(data.titles) ? data.titles : []);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch(e) {
      showToast("Error al cargar premios", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Equipar ─────────────────────────────────────────────────
  const equipar = async (tipo, item) => {
    setEquipping(item.id);
    try {
      if (tipo === "titulo") {
        const cur = Array.isArray(me.active_titles) ? me.active_titles : [];
        const key = "earned:" + item.id;
        if (cur.includes(key)) { showToast("Ya está activo"); return; }
        if (cur.length >= 5) { showToast("Máximo 5 títulos. Desactivá uno desde Mi Perfil", "error"); return; }
        await api.setActiveTitles([...cur, key]);
        showToast(`🏅 "${item.name}" activado`);
        if (onEquip) onEquip();
      } else {
        // loaned item
        const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : (item.item_data || {});
        if (item.type === "border") {
          await api.equipItem("border", data.id || data.item_id);
          showToast(`🔲 Borde equipado`);
        } else if (item.type === "skin") {
          await api.equipItem("skin", data.id || data.item_id);
          showToast(`🎨 Skin equipada`);
        } else if (item.type === "avatar_bg") {
          await api.setAvatarBg({ ...data, loaned_id: item.id });
          showToast(`🖼️ Marco equipado`);
        } else if (item.type === "name_color") {
          await api.customEquip({ tipo: "name_color", item_id: data.item_id || item.id });
          showToast(`✏️ Color equipado`);
        }
        if (onEquip) onEquip();
      }
    } catch(e) {
      showToast(e.message || "Error al equipar", "error");
    } finally {
      setEquipping(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const isExpired = (item) => item.expires_at && new Date(item.expires_at) <= new Date();

  const titlesActive  = titles.filter(t => !isExpired(t));
  const titlesExpired = titles.filter(t => isExpired(t));
  const itemsActive   = items.filter(i => !isExpired(i));
  const itemsExpired  = items.filter(i => isExpired(i));

  const byType = (type) => itemsActive.filter(i => i.type === type);
  const bordes  = byType("border");
  const skins   = byType("skin");
  const marcos  = byType("avatar_bg");
  const colores = byType("name_color");

  const totalActive = titlesActive.length + itemsActive.length;

  const TABS = [
    { id:"todos",     label:`Todos (${totalActive})` },
    { id:"titulos",   label:`🏅 Títulos (${titlesActive.length})` },
    { id:"items",     label:`🎁 Items (${itemsActive.length})` },
    { id:"expirados", label:`📦 Vencidos (${titlesExpired.length + itemsExpired.length})` },
  ];

  // ── Render título ─────────────────────────────────────────
  const renderTitulo = (t, expired = false) => {
    const r = RARITIES[t.rarity] || RARITIES.common;
    const active = (me.active_titles || []).includes("earned:" + t.id);
    return (
      <div key={t.id} style={{...card, padding:"12px 14px", marginBottom:8, opacity:expired?.6:1}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:42, height:42, borderRadius:12, flexShrink:0,
            background:r.color+"22", border:`1.5px solid ${r.color}44`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>
            {t.emoji || "🏅"}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
              <span style={{fontWeight:900, fontSize:14, color:r.color}}>{t.name}</span>
              <span style={{fontSize:9, fontWeight:700, background:r.color+"22",
                color:r.color, borderRadius:99, padding:"2px 7px"}}>
                {(t.rarity||"common").toUpperCase()}
              </span>
            </div>
            <div style={{display:"flex", gap:8, marginTop:3, flexWrap:"wrap"}}>
              <ExpiryLabel expiresAt={t.expires_at}/>
              {t.note && <span style={{fontSize:10, color:sub, fontStyle:"italic"}}>"{t.note}"</span>}
            </div>
          </div>
          {!expired && (
            <button onClick={() => equipar("titulo", t)}
              disabled={equipping === t.id}
              style={{
                background: active ? "#10b98122" : accent,
                border: active ? "1.5px solid #10b981" : "none",
                borderRadius: 99, padding:"7px 14px", fontSize:11, fontWeight:800,
                color: active ? "#10b981" : "white", cursor:"pointer",
                fontFamily:"Nunito,sans-serif", flexShrink:0
              }}>
              {equipping===t.id ? "..." : active ? "✓ Activo" : "Equipar"}
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Render item (borde/skin/marco/color) ──────────────────
  const renderItem = (item, expired = false) => {
    const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : (item.item_data || {});
    const TYPE_LABELS = { border:"Borde", skin:"Skin", avatar_bg:"Marco", name_color:"Color nombre" };
    const TYPE_ICONS  = { border:"🔲", skin:"🎨", avatar_bg:"🖼️", name_color:"✏️" };

    let preview = null;
    let displayName = data.name || data.id || TYPE_LABELS[item.type] || "Item";

    if (item.type === "skin") {
      const sk = SKINS.find(s => s.id === (data.id || data.item_id));
      if (sk) {
        displayName = sk.name;
        preview = (
          <div style={{width:42, height:42, borderRadius:12, background:sk.bg,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>
            {sk.emoji}
          </div>
        );
      }
    } else if (item.type === "border") {
      const br = BORDERS.find(b => b.id === (data.id || data.item_id));
      if (br) displayName = br.name;
      preview = (
        <div style={{width:42, height:42, borderRadius:12, background:inputBg,
          border: br?.bs || "3px solid #888",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>
          🔲
        </div>
      );
    } else if (item.type === "avatar_bg") {
      preview = (
        <div style={{width:42, height:42, borderRadius:12,
          background: data.type==="gradient"||data.type==="solid" ? data.value : inputBg,
          border: data.type==="frame" ? data.value : "none",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>
          🖼️
        </div>
      );
    } else if (item.type === "name_color") {
      preview = (
        <div style={{width:42, height:42, borderRadius:12, background:inputBg,
          display:"flex", alignItems:"center", justifyContent:"center"}}>
          <span style={{fontSize:18, fontWeight:900, color:data.color||accent}}>Aa</span>
        </div>
      );
    }

    return (
      <div key={item.id} style={{...card, padding:"12px 14px", marginBottom:8, opacity:expired?.6:1}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          {preview || (
            <div style={{width:42, height:42, borderRadius:12, background:inputBg,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>
              {TYPE_ICONS[item.type] || "🎁"}
            </div>
          )}
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontWeight:800, fontSize:13, color:txt}}>{displayName}</div>
            <div style={{display:"flex", gap:8, marginTop:3, flexWrap:"wrap"}}>
              <span style={{fontSize:10, color:sub, background:inputBg,
                borderRadius:99, padding:"1px 8px"}}>
                {TYPE_LABELS[item.type] || item.type}
              </span>
              <ExpiryLabel expiresAt={item.expires_at}/>
            </div>
            {data.note && <div style={{fontSize:10, color:sub, fontStyle:"italic", marginTop:2}}>"{data.note}"</div>}
          </div>
          {!expired && (
            <button onClick={() => equipar(item.type, item)}
              disabled={equipping === item.id}
              style={{background:accent, border:"none", borderRadius:99,
                color:"white", padding:"7px 14px", fontSize:11, fontWeight:800,
                cursor:"pointer", fontFamily:"Nunito,sans-serif", flexShrink:0}}>
              {equipping===item.id ? "..." : "Equipar"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const Empty = ({msg}) => (
    <div style={{textAlign:"center", padding:32, color:sub}}>
      <div style={{fontSize:36, marginBottom:8}}>📭</div>
      <div style={{fontWeight:700}}>{msg}</div>
    </div>
  );

  return (
    <div style={{background:bg,  fontFamily:"Nunito,sans-serif", paddingBottom:32}}>
      {onBack && <OHdrA title="🏆 Mis Premios" onBack={onBack}/>}

      {/* Stats */}
      <div style={{...card, margin:"12px 14px", padding:"14px 16px"}}>
        <div style={{display:"flex", justifyContent:"space-around", textAlign:"center"}}>
          {[
            {n:titlesActive.length,  label:"Títulos",  icon:"🏅"},
            {n:bordes.length,        label:"Bordes",   icon:"🔲"},
            {n:skins.length,         label:"Skins",    icon:"🎨"},
            {n:marcos.length+colores.length, label:"Más", icon:"✨"},
          ].map(({n,label,icon}) => (
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
        {loading && <div style={{textAlign:"center", color:sub, padding:24}}>Cargando premios...</div>}

        {/* Todos */}
        {!loading && tab==="todos" && (
          totalActive === 0
            ? <Empty msg="Todavía no ganaste ningún premio"/>
            : <>
                {titlesActive.length > 0 && (
                  <>
                    <div style={{fontSize:11,fontWeight:700,color:sub,marginBottom:8}}>🏅 Títulos</div>
                    {titlesActive.map(t => renderTitulo(t))}
                  </>
                )}
                {itemsActive.length > 0 && (
                  <>
                    <div style={{fontSize:11,fontWeight:700,color:sub,margin:"12px 0 8px"}}>🎁 Items</div>
                    {itemsActive.map(i => renderItem(i))}
                  </>
                )}
              </>
        )}

        {/* Títulos */}
        {!loading && tab==="titulos" && (
          titlesActive.length === 0
            ? <Empty msg="Sin títulos ganados"/>
            : titlesActive.map(t => renderTitulo(t))
        )}

        {/* Items */}
        {!loading && tab==="items" && (
          itemsActive.length === 0
            ? <Empty msg="Sin items ganados"/>
            : <>
                {bordes.length>0  && <><div style={{fontSize:11,fontWeight:700,color:sub,marginBottom:8}}>🔲 Bordes</div>{bordes.map(i=>renderItem(i))}</>}
                {skins.length>0   && <><div style={{fontSize:11,fontWeight:700,color:sub,margin:"12px 0 8px"}}>🎨 Skins</div>{skins.map(i=>renderItem(i))}</>}
                {marcos.length>0  && <><div style={{fontSize:11,fontWeight:700,color:sub,margin:"12px 0 8px"}}>🖼️ Marcos</div>{marcos.map(i=>renderItem(i))}</>}
                {colores.length>0 && <><div style={{fontSize:11,fontWeight:700,color:sub,margin:"12px 0 8px"}}>✏️ Colores</div>{colores.map(i=>renderItem(i))}</>}
              </>
        )}

        {/* Expirados */}
        {!loading && tab==="expirados" && (
          titlesExpired.length+itemsExpired.length === 0
            ? <Empty msg="Sin premios vencidos"/>
            : <>
                <div style={{fontSize:11,color:sub,marginBottom:10}}>
                  Premios que ya vencieron. No se pueden usar.
                </div>
                {titlesExpired.map(t => renderTitulo(t, true))}
                {itemsExpired.map(i => renderItem(i, true))}
              </>
        )}
      </div>
    </div>
  );
}

export default AMisPremios;
