import { useState, useEffect } from "react";
import { SKINS, TITLES, BORDERS } from "../../constants";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, displayName } from "../shared/index";

// Precio para cambiar el título personalizado cada vez
const PRECIO_CAMBIO_TITULO = 20;
const PRECIO_CAMBIO_ESTADO = 10;

function APerfil({me,balance,logout,showToast,setMe,refreshBalance}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg,inputBg} = useTheme();

  // Arrays de desbloqueados
  const unlockedSkins   = me.unlocked_skins   || ["s1"];
  const unlockedBorders = me.unlocked_borders || ["b1"];
  const unlockedTitles  = me.unlocked_titles  || ["tl1"];

  // Estado local
  const [buying,    setBuying]    = useState(null); // id del item comprándose
  const [editTitulo,setEditTitulo]= useState(false);
  const [tituloVal, setTituloVal] = useState(me.titulo_custom||"");
  const [editEstado,setEditEstado]= useState(false);
  const [estadoVal, setEstadoVal] = useState(me.estado||"");
  const [saving,    setSaving]    = useState(null);

  // Estado del alumno — campo en DB (necesitamos la migración)
  const [estadoShop,setEstadoShop]= useState(null); // item de estado de la tienda
  useEffect(()=>{
    api.customShop("estado").then(d=>{
      const arr=Array.isArray(d)?d:(d.data||d||[]);
      setEstadoShop(arr.find(i=>i.tipo==="estado")||null);
    }).catch(()=>{});
  },[]);

  // Comprar skin, border o title
  const buyItem=async(type, item)=>{
    if(buying) return;
    const precio = item.price||0;
    if(precio>0 && balance<precio){showToast("Saldo insuficiente 😢","error");return;}
    setBuying(item.id);
    try{
      await api.buyItem(type, item.id);
      showToast(`✅ ${item.name} desbloqueado!`);
      if(refreshBalance) refreshBalance();
      const updated = await api.me();
      setMe(updated);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(null);}
  };

  // Equipar skin, border o title (ya desbloqueado)
  const equip=async(type,item_id)=>{
    try{
      await api.equip(type,item_id);
      const updated=await api.me();
      setMe(updated);
    }catch(e){showToast(e.message||"Error","error");}
  };

  // Cambiar título personalizado (cobra cada vez)
  const guardarTitulo=async()=>{
    if(!tituloVal.trim()){showToast("Escribí un título","error");return;}
    if(balance<PRECIO_CAMBIO_TITULO){
      showToast(`Necesitás 🪙${PRECIO_CAMBIO_TITULO} para cambiar el título`,"error");return;
    }
    setSaving("titulo");
    try{
      await api.buyTituloChange(tituloVal.trim(), PRECIO_CAMBIO_TITULO);
      showToast(`Título guardado 👑 (-🪙${PRECIO_CAMBIO_TITULO})`);
      if(refreshBalance) refreshBalance();
      const updated=await api.me();
      setMe(updated);
      setEditTitulo(false);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(null);}
  };

  // Guardar estado (si tiene el item)
  const guardarEstado=async()=>{
    setSaving("estado");
    try{
      await api.setEstado(estadoVal.trim().slice(0,40));
      showToast("Estado actualizado ✨");
      const updated=await api.me();
      setMe(updated);
      setEditEstado(false);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(null);}
  };

  // Subir foto
  const subirFoto=async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>500000){showToast("Imagen muy grande (max 500KB)","error");return;}
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      setSaving("foto");
      try{
        await api.setFoto(ev.target.result);
        showToast("Foto actualizada 📸");
        const updated=await api.me();
        setMe(updated);
      }catch(err){showToast(err.message||"Error","error");}
      finally{setSaving(null);}
    };
    reader.readAsDataURL(file);
  };

  const card = {background:cardBg,borderRadius:16,marginBottom:8,
    boxShadow:dark?"0 2px 12px rgba(0,0,0,.3)":"0 2px 12px rgba(0,0,0,.06)"};

  return(
    <div style={{background:pageBg,minHeight:"100vh"}}>
      <OHdrA title="Mi Perfil 👤"/>
      <div style={{padding:"0 14px 32px",marginTop:12}}>

        {/* Card principal */}
        <div style={{...card,padding:20,textAlign:"center",marginBottom:16}}>
          <div style={{position:"relative",display:"inline-block",marginBottom:12}}>
            <Av user={me} sz={72}/>
            <label style={{position:"absolute",bottom:0,right:0,
              background:accent,borderRadius:"50%",width:22,height:22,
              display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",fontSize:12}}>
              📷
              <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
            </label>
          </div>
          <div style={{fontWeight:900,fontSize:18,color:txt}}>{displayName(me)}</div>
          {me.titulo_custom&&(
            <div style={{fontSize:12,color:accent,fontWeight:700,marginTop:2}}>{me.titulo_custom}</div>
          )}
          {me.estado&&(
            <div style={{fontSize:11,color:sub,marginTop:4,fontStyle:"italic"}}>"{me.estado}"</div>
          )}
          <div style={{fontWeight:800,color:accent,fontSize:15,marginTop:6}}>
            🪙 {balance.toLocaleString("es-AR")}
          </div>
        </div>

        {/* ── Skins ─────────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,marginBottom:8,fontSize:13}}>🎨 Skins</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {SKINS.map(s=>{
            const owned  = unlockedSkins.includes(s.id);
            const equipped = me.skin===s.id;
            const canBuy = !owned && balance>=s.price;
            return(
              <div key={s.id}
                onClick={()=>{
                  if(equipped) return;
                  if(owned) equip("skin",s.id);
                  else if(s.price===0) buyItem("skin",s);
                  else if(canBuy) buyItem("skin",s);
                  else showToast(`Necesitás 🪙${s.price}`,"error");
                }}
                style={{...card,padding:"12px 6px",textAlign:"center",
                  background:equipped?s.bg:cardBg,
                  border:`2px solid ${equipped?"#FFB800":owned?accent+"44":inputBg}`,
                  cursor:equipped?"default":"pointer",
                  opacity:!owned&&s.price>balance?.5:1,marginBottom:0,
                  position:"relative"}}>
                {equipped&&<div style={{position:"absolute",top:3,right:4,fontSize:9}}>✅</div>}
                {buying===s.id&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",
                  borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,color:"white"}}>...</div>}
                <div style={{fontSize:26,marginBottom:3}}>{s.emoji}</div>
                <div style={{fontSize:9,fontWeight:800,color:equipped?"white":txt,lineHeight:1.2}}>
                  {s.name}
                </div>
                {!owned&&s.price>0&&(
                  <div style={{fontSize:9,color:canBuy?accent:"#aaa",fontWeight:800,marginTop:2}}>
                    🪙{s.price}
                  </div>
                )}
                {owned&&!equipped&&(
                  <div style={{fontSize:9,color:accent,fontWeight:700,marginTop:2}}>Equipar</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Bordes ────────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,marginBottom:8,fontSize:13}}>🔲 Bordes</div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {BORDERS.map(b=>{
            const owned   = unlockedBorders.includes(b.id);
            const equipped = me.border===b.id;
            const canBuy  = !owned && balance>=b.price;
            return(
              <div key={b.id}
                onClick={()=>{
                  if(equipped) return;
                  if(owned) equip("border",b.id);
                  else if(canBuy||b.price===0) buyItem("border",b);
                  else showToast(`Necesitás 🪙${b.price}`,"error");
                }}
                style={{...card,padding:"8px 14px",
                  border:`2px solid ${equipped?"#FFB800":owned?accent+"44":inputBg}`,
                  cursor:equipped?"default":"pointer",marginBottom:0,
                  opacity:!owned&&b.price>balance?.5:1,position:"relative"}}>
                {buying===b.id&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",
                  borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,color:"white"}}>...</div>}
                <div style={{fontSize:11,fontWeight:800,color:equipped?"#FFB800":txt}}>{b.name}</div>
                {!owned&&b.price>0&&(
                  <div style={{fontSize:10,color:canBuy?accent:"#aaa",fontWeight:800}}>🪙{b.price}</div>
                )}
                {owned&&!equipped&&(
                  <div style={{fontSize:10,color:accent,fontWeight:700}}>Equipar</div>
                )}
                {equipped&&<div style={{fontSize:10,color:"#FFB800",fontWeight:800}}>✅ Activo</div>}
              </div>
            );
          })}
        </div>

        {/* ── Títulos ───────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,marginBottom:8,fontSize:13}}>📛 Títulos</div>
        <div style={{marginBottom:8}}>
          {TITLES.map(t=>{
            const owned   = unlockedTitles.includes(t.id);
            const equipped = me.title===t.id;
            const canBuy  = !owned && balance>=t.price;
            return(
              <div key={t.id}
                onClick={()=>{
                  if(equipped) return;
                  if(owned) equip("title",t.id);
                  else if(canBuy||t.price===0) buyItem("title",t);
                  else showToast(`Necesitás 🪙${t.price}`,"error");
                }}
                style={{...card,padding:"12px 16px",
                  border:`1.5px solid ${equipped?accent:inputBg}`,
                  cursor:equipped?"default":"pointer",
                  opacity:!owned&&t.price>balance?.5:1,
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{t.name}</div>
                  {!owned&&t.price>0&&(
                    <div style={{fontSize:12,color:canBuy?accent:"#aaa",fontWeight:800}}>
                      🪙{t.price} para desbloquear
                    </div>
                  )}
                  {owned&&(
                    <div style={{fontSize:12,color:equipped?accent:"#10b981",fontWeight:700}}>
                      {equipped?"✅ Activo":"Tocar para activar"}
                    </div>
                  )}
                </div>
                {buying===t.id&&<span style={{fontSize:12,color:sub}}>...</span>}
                {equipped&&<span style={{fontSize:20}}>✅</span>}
              </div>
            );
          })}
        </div>

        {/* ── Título personalizado ──────────────────────────── */}
        <div style={{...card,padding:"14px 16px",marginBottom:8,
          border:`1.5px solid ${me.titulo_custom?accent:inputBg}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:me.titulo_custom&&!editTitulo?6:0}}>
            <div style={{fontWeight:800,fontSize:13,color:txt}}>✏️ Título personalizado</div>
            <div style={{fontSize:10,color:sub}}>🪙{PRECIO_CAMBIO_TITULO} por cambio</div>
          </div>

          {me.titulo_custom&&!editTitulo&&(
            <div style={{fontSize:13,color:accent,fontWeight:700,marginBottom:8}}>
              "{me.titulo_custom}"
            </div>
          )}

          {editTitulo?(
            <>
              <input value={tituloVal}
                onChange={e=>setTituloVal(e.target.value.slice(0,20))}
                placeholder="Tu título (máx 20 chars)..."
                style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${accent}44`,
                  borderRadius:10,padding:"9px 12px",fontSize:14,fontWeight:700,outline:"none",
                  color:txt,background:inputBg,fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={guardarTitulo} disabled={saving==="titulo"||balance<PRECIO_CAMBIO_TITULO}
                  style={{flex:1,background:saving==="titulo"||balance<PRECIO_CAMBIO_TITULO?"#ccc":accent,
                    border:"none",borderRadius:50,color:"white",padding:"10px",fontWeight:800,
                    fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {saving==="titulo"?"Guardando...":balance<PRECIO_CAMBIO_TITULO?`Sin saldo`:`Guardar 🪙${PRECIO_CAMBIO_TITULO}`}
                </button>
                <button onClick={()=>{setEditTitulo(false);setTituloVal(me.titulo_custom||"");}}
                  style={{background:inputBg,border:"none",borderRadius:50,color:sub,
                    padding:"10px 14px",fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </>
          ):(
            <button onClick={()=>{setTituloVal(me.titulo_custom||"");setEditTitulo(true);}}
              style={{background:accent+"22",color:accent,border:"none",borderRadius:99,
                padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              {me.titulo_custom?"✏️ Cambiar":"+ Agregar título"}
            </button>
          )}
        </div>

        {/* ── Estado ────────────────────────────────────────── */}
        <div style={{...card,padding:"14px 16px",marginBottom:16,
          border:`1.5px solid ${me.estado?accent:inputBg}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:me.estado&&!editEstado?6:0}}>
            <div style={{fontWeight:800,fontSize:13,color:txt}}>💬 Estado</div>
            <div style={{fontSize:10,color:sub}}>🪙{PRECIO_CAMBIO_ESTADO} por cambio</div>
          </div>

          {me.estado&&!editEstado&&(
            <div style={{fontSize:13,color:sub,fontStyle:"italic",marginBottom:8}}>
              "{me.estado}"
            </div>
          )}

          {editEstado?(
            <>
              <input value={estadoVal}
                onChange={e=>setEstadoVal(e.target.value.slice(0,40))}
                placeholder="¿Qué estás pensando? (máx 40 chars)"
                style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${accent}44`,
                  borderRadius:10,padding:"9px 12px",fontSize:13,fontWeight:600,outline:"none",
                  color:txt,background:inputBg,fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={guardarEstado} disabled={saving==="estado"||balance<PRECIO_CAMBIO_ESTADO}
                  style={{flex:1,background:saving==="estado"||balance<PRECIO_CAMBIO_ESTADO?"#ccc":accent,
                    border:"none",borderRadius:50,color:"white",padding:"10px",fontWeight:800,
                    fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {saving==="estado"?"Guardando...":balance<PRECIO_CAMBIO_ESTADO?`Sin saldo`:`Guardar 🪙${PRECIO_CAMBIO_ESTADO}`}
                </button>
                <button onClick={()=>{setEditEstado(false);setEstadoVal(me.estado||"");}}
                  style={{background:inputBg,border:"none",borderRadius:50,color:sub,
                    padding:"10px 14px",fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </>
          ):(
            <button onClick={()=>{setEstadoVal(me.estado||"");setEditEstado(true);}}
              style={{background:accent+"22",color:accent,border:"none",borderRadius:99,
                padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              {me.estado?"✏️ Cambiar":"+ Agregar estado"}
            </button>
          )}
        </div>

        {/* Cerrar sesión */}
        <button onClick={logout}
          style={{width:"100%",background:cardBg,border:`1.5px solid ${inputBg}`,
            borderRadius:50,color:sub,padding:"14px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          Cerrar sesión
        </button>

      </div>
    </div>
  );
}

export default APerfil;
