import { useState, useEffect, useRef } from "react";
import { SKINS, TITLES } from "../../constants";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function APerfil({me,balance,logout,showToast,setMe}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg} = useTheme();
  const uS=me.unlocked_skins||["s1"];
  const uB=me.unlocked_borders||["b1"];
  const uT=me.unlocked_titles||["tl1"];

  // Estados para foto y titulo custom comprables directamente aquí
  const [fotoShop,setFotoShop]   = useState(null); // item de foto de la tienda
  const [tituloShop,setTituloShop]=useState(null); // item de titulo custom
  const [buying,setBuying]       = useState(false);
  const [editTitulo,setEditTitulo]=useState(false);
  const [tituloVal,setTituloVal] = useState(me.titulo_custom||"");
  const [savingT,setSavingT]     = useState(false);
  const [savingF,setSavingF]     = useState(false);

  // Cargar items de foto y titulo de la tienda custom
  useEffect(()=>{
    api.customShop("photo_profile").then(d=>{
      const arr=d.data||d||[];
      setFotoShop(arr.find(i=>i.tipo==="photo_profile")||null);
    }).catch(()=>{});
    api.customShop("title_custom").then(d=>{
      const arr=d.data||d||[];
      setTituloShop(arr.find(i=>i.tipo==="title_custom")||null);
    }).catch(()=>{});
  },[]);

  const hasFotoPerm=()=>{/* verificamos comprando */true;};

  const comprarFoto=async()=>{
    if(!fotoShop){showToast("Item no disponible","error");return;}
    if(balance<fotoShop.precio){showToast("Saldo insuficiente","error");return;}
    setBuying("foto");
    try{
      await api.customBuy(fotoShop.id);
      showToast("Foto de perfil desbloqueada! 📸");
      setFotoShop(prev=>prev?{...prev,_owned:true}:null);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const subirFoto=async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>500000){showToast("Imagen muy grande (max 500KB)","error");return;}
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      setSavingF(true);
      try{
        await api.setFoto(ev.target.result);
        showToast("Foto actualizada! 📸");
        const updated=await api.me();
        setMe(updated);
      }catch(err){showToast(err.message||"Error","error");}
      finally{setSavingF(false);}
    };
    reader.readAsDataURL(file);
  };

  const quitarFoto=async()=>{
    setSavingF(true);
    try{
      await api.setFoto(null);
      showToast("Foto eliminada");
      const updated=await api.me();
      setMe(updated);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingF(false);}
  };

  const comprarTitulo=async()=>{
    if(!tituloShop){showToast("Item no disponible","error");return;}
    if(balance<tituloShop.precio){showToast("Saldo insuficiente","error");return;}
    setBuying("titulo");
    try{
      await api.customBuy(tituloShop.id);
      showToast("Título personalizado desbloqueado! 👑");
      setTituloShop(prev=>prev?{...prev,_owned:true}:null);
      setEditTitulo(true);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const guardarTitulo=async()=>{
    if(!tituloVal.trim()){showToast("Escribí un título","error");return;}
    setSavingT(true);
    try{
      await api.setTituloCustom(tituloVal.trim());
      showToast("Título guardado! 👑");
      const updated=await api.me();
      setMe(updated);
      setEditTitulo(false);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingT(false);}
  };

  const equip=async(type,item_id)=>{
    try{
      await api.equip(type,item_id);
      const updated=await api.me();
      setMe(updated);
      showToast("¡Equipado! ✨");
    }catch(e){showToast(e.message||"Error","error");}
  };

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Mi Perfil 👤"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        <div style={{background:cardBg,borderRadius:20,padding:24,textAlign:"center",marginBottom:12,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <Av user={me} sz={72}/>
          </div>
          <div style={{fontWeight:900,fontSize:20,color:txt}}>{me.nombre}</div>
          <div style={{fontSize:13,color:dark?"#888":"#666",marginBottom:8}}>{me.email}</div>
          <div style={{fontWeight:800,color:accent,fontSize:16}}>🪙 {balance.toLocaleString("es-AR")}</div>
        </div>

        <div style={{fontWeight:800,color:txt,marginBottom:8,marginTop:4}}>🎨 Skins</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {SKINS.map(s=>{
            const owned=uS.includes(s.id);
            const equipped=me.skin===s.id;
            return(
              <div key={s.id} onClick={()=>{if(owned)equip("skin",s.id);}}
                style={{background:equipped?s.bg:cardBg,border:`2px solid ${equipped?"#FFB800":owned?dark?"#2d2a45":"#E8E8E8":dark?"#1e1b2e":"#F0F0F0"}`,
                  borderRadius:16,padding:"12px 6px",textAlign:"center",cursor:owned?"pointer":"default",
                  opacity:!owned?.4:1,transition:"all .2s",position:"relative"}}>
                {equipped&&<div style={{position:"absolute",top:4,right:5,fontSize:10}}>✅</div>}
                <div style={{fontSize:28,marginBottom:4}}>{s.emoji}</div>
                <div style={{fontSize:10,fontWeight:800,color:equipped?"white":txt}}>{s.name}</div>
                {!owned&&<div style={{fontSize:9,color:accent,fontWeight:800,marginTop:2}}>🪙{s.price}</div>}
              </div>
            );
          })}
          {/* Foto personalizada como extra skin */}
          <div style={{borderRadius:16,overflow:"hidden",
            border:`2px solid ${me.foto_url?accent:dark?"#2d2a45":"#e8e8e8"}`,
            background:cardBg,textAlign:"center",padding:"12px 6px",
            position:"relative"}}>
            {me.foto_url
              ? <img src={me.foto_url} alt="" style={{width:36,height:36,borderRadius:"50%",
                  objectFit:"cover",margin:"0 auto 4px",display:"block"}}/>
              : <div style={{fontSize:28,marginBottom:4}}>📸</div>
            }
            <div style={{fontSize:9,fontWeight:800,color:txt,marginBottom:4}}>Foto</div>
            {me.foto_url
              ? <label style={{cursor:savingF?"not-allowed":"pointer"}}>
                  <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
                  <span style={{fontSize:9,color:accent,fontWeight:700}}>
                    {savingF?"...":"Cambiar"}
                  </span>
                </label>
              : <label style={{cursor:buying==="foto"?"not-allowed":"pointer"}}>
                  <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}
                    onClick={e=>{
                      // Si no tiene permiso, comprar primero
                      if(fotoShop&&!fotoShop._owned&&me&&!me.foto_url){
                        e.preventDefault();
                        comprarFoto();
                      }
                    }}/>
                  <span style={{fontSize:9,color:accent,fontWeight:800}}>
                    {buying==="foto"?"...":fotoShop?`🪙${fotoShop.precio}`:"📱 Subir"}
                  </span>
                </label>
            }
            {me.foto_url&&(
              <button onClick={quitarFoto} style={{position:"absolute",top:3,right:3,
                background:"rgba(0,0,0,.4)",border:"none",borderRadius:"50%",color:"white",
                width:16,height:16,fontSize:8,cursor:"pointer",display:"flex",
                alignItems:"center",justifyContent:"center"}}>✕</button>
            )}
          </div>
        </div>

        {/* Título personalizado — inline en sección Títulos */}
        <div style={{fontWeight:800,color:txt,marginBottom:8}}>📛 Títulos</div>
        {TITLES.map(t=>{
          const owned=uT.includes(t.id);
          const equipped=me.title===t.id;
          return(
            <div key={t.id} onClick={()=>{if(owned)equip("title",t.id);}}
              style={{marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"14px 16px",borderRadius:20,cursor:owned?"pointer":"default",
                background:equipped?dark?"#2d1a4e":cardBg:cardBg,
                border:`1.5px solid ${equipped?accent:dark?"#2d2a45":"#E8E8E8"}`,
                opacity:!owned?.4:1,boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:txt}}>{t.name}</div>
                {!owned&&t.price>0&&<div style={{fontSize:12,color:accent,fontWeight:800}}>🪙{t.price}</div>}
                {owned&&<div style={{fontSize:12,color:equipped?accent:"#10b981",fontWeight:800}}>
                  {equipped?"✅ Activo":"Tocar para activar"}
                </div>}
              </div>
              {equipped&&<span style={{fontSize:20}}>✅</span>}
            </div>
          );
        })}

        {/* Título personalizado — comprable directo */}
        <div style={{marginBottom:8,padding:"14px 16px",borderRadius:20,
          background:me.titulo_custom?dark?"#2d1a4e":cardBg:cardBg,
          border:`1.5px solid ${me.titulo_custom?accent:dark?"#2d2a45":"#E8E8E8"}`,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>
            ✏️ Título personalizado
          </div>
          {me.titulo_custom&&!editTitulo&&(
            <div style={{fontSize:13,color:accent,fontWeight:700,marginBottom:8}}>
              "{me.titulo_custom}"
            </div>
          )}
          {editTitulo?(
            <div style={{marginTop:6}}>
              <input value={tituloVal} onChange={e=>setTituloVal(e.target.value.slice(0,20))}
                placeholder="Tu título (máx 20 chars)..."
                style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${accent}44`,
                  borderRadius:10,padding:"9px 12px",fontSize:14,fontWeight:700,outline:"none",
                  color:txt,background:dark?"#2d2a45":"#f8f8f8",fontFamily:"Nunito,sans-serif",
                  marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={guardarTitulo} disabled={savingT}
                  style={{flex:1,background:savingT?"#ccc":accent,border:"none",borderRadius:50,
                    color:"white",padding:"10px",fontWeight:800,fontSize:13,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  {savingT?"Guardando...":"Guardar"}
                </button>
                <button onClick={()=>setEditTitulo(false)}
                  style={{background:dark?"#2d2a45":"#f0f0f0",border:"none",borderRadius:50,
                    color:sub,padding:"10px 14px",fontWeight:700,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {me.titulo_custom
                ? <button onClick={()=>setEditTitulo(true)}
                    style={{background:accent+"22",color:accent,border:"none",borderRadius:99,
                      padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>
                    ✏️ Cambiar
                  </button>
                : <>
                    {tituloShop
                      ? <button onClick={comprarTitulo} disabled={buying==="titulo"||balance<tituloShop.precio}
                          style={{background:buying==="titulo"||balance<tituloShop.precio?"#ccc":accent,
                            color:"white",border:"none",borderRadius:99,padding:"6px 14px",
                            fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                          {buying==="titulo"?"Comprando...":balance<tituloShop.precio
                            ?`Sin saldo (🪙${tituloShop.precio})`:`Comprar 🪙${tituloShop.precio}`}
                        </button>
                      : <span style={{fontSize:12,color:sub}}>No disponible</span>
                    }
                  </>
              }
            </div>
          )}
        </div>

        <div style={{marginTop:16}}>
          <button onClick={logout} style={{width:"100%",background:cardBg,
            border:`1.5px solid ${dark?"#2d2a45":"#E8E8E8"}`,borderRadius:50,color:dark?"#aaa":"#888",
            padding:"14px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif",transition:"all .3s"}}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// NUEVAS SECCIONES — Chat, Noticias, Votaciones, Reportes
// ════════════════════════════════════════════════════════════

// ── CHAT ──────────────────────────────────────────────────────

export default APerfil;
