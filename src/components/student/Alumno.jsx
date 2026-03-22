import { useState, useEffect, useRef, useMemo } from "react";
import { api, connectSocket } from "../../api";
import { ThemeCtx, useTheme } from "../../ThemeContext";
import { DUAL_THEMES, GS } from "../../constants";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, useCountUp, displayName } from "../shared/index";
import PerfilModal from "../shared/PerfilModal";
import AHome from "./AHome";
import AMisiones from "./AMisiones";
import ATienda from "./ATienda";
import AEnviar from "./AEnviar";
import AIngresar from "./AIngresar";
import AMovimientos from "./AMovimientos";
import ARanking from "./ARanking";
import APerfil from "./APerfil";
import AOpciones from "./AOpciones";
import ANotificaciones from "./ANotificaciones";
import AChat from "./AChat";
import ANoticias from "./ANoticias";
import AVotaciones from "./AVotaciones";
import AReportes from "./AReportes";
import ATiendaCustom from "./personalizar/ATiendaCustom";

function Alumno({me,balance,refreshBalance,logout,setMe}){
  const [tab,setTab]=useState("home");
  const [toast,showToast]=useToast();
  const [camOpen,setCamOpen]=useState(false);
  const [notifs,setNotifs]=useState([]);
  const [badges,setBadges]=useState({chat:0,notifs:0});

  // ── Tema dual ────────────────────────────────────────────────
  const savedThemeId = localStorage.getItem("ec_theme")||"oceano";
  const savedDark    = localStorage.getItem("ec_dark")==="true";
  const savedPrimary = localStorage.getItem("ec_primary")||null; // guardado para evitar flash
  const [themeId,setThemeId]         = useState(savedThemeId);
  const [isDark,setIsDark]           = useState(savedDark);
  const [dbThemePrimary,setDbThemePrimary] = useState(savedPrimary); // color real equipado
  const [screenModeCfg,setScreenModeCfg]=useState(null); // config del modo de pantalla activo
  const [previewPrimary,setPreviewPrimary] = useState(null); // preview temporal (no se guarda)
  const [customActive,setCustomActive]=useState(null);
  const [textStyleCfg,setTextStyleCfg]=useState(null);

  // Prioridad: preview temporal > color DB real > DUAL_THEMES locales
  const baseTheme = DUAL_THEMES.find(t=>t.id===themeId)||DUAL_THEMES[0];
  const primary   = previewPrimary || dbThemePrimary || baseTheme.primary;
  const secondary = baseTheme.secondary;

  // ── Screen mode activo — define TODO el tema de fondo ────────
  // Si hay screen_mode activo con config completo, SUS valores reemplazan claro/oscuro
  const sm = screenModeCfg || {};
  const hasScreenMode = !!(screenModeCfg && sm.mode);  // solo si tiene un mode definido

  // El "dark" efectivo: screen_mode define isDark, o toggle del usuario
  const smDark = hasScreenMode ? (sm.isDark || sm.dark || false) : isDark;

  // Text style overrides
  const ts = textStyleCfg || {};
  const isContrast = ts.contrast || ts.preset === "contraste";
  const isCustomTs = ts.preset === "custom";
  const forceDark  = ts.force_dark;
  const tsTxt = isCustomTs && ts.custom_txt ? ts.custom_txt
              : ts.txt && ts.txt !== "default" ? ts.txt : null;
  const tsSub = isCustomTs && ts.custom_sub ? ts.custom_sub
              : ts.sub && ts.sub !== "default" ? ts.sub : null;

  // Dark final: screen_mode > text_style fuerza dark > toggle usuario
  const finalDark = smDark || forceDark;

  const theme = {
    primary:  primary,
    secondary,
    isDark:   finalDark,

    // Fondos — screen_mode reemplaza todo claro/oscuro
    pageBg:  hasScreenMode ? sm.pageBg  : (finalDark ? "#0d0d1a" : "#F0F0F0"),
    darkBg:  hasScreenMode ? sm.bg      : (finalDark ? "#0d0d1a" : "#F0F0F0"),
    cardBg:  hasScreenMode ? sm.card    : (finalDark ? "#1a1828" : "white"),
    navBg:   hasScreenMode ? sm.nav     : (finalDark ? "#1a1828" : "white"),
    navBord: hasScreenMode ? sm.navBord : (finalDark ? "#2a2740" : "#EFEFEF"),
    navPill: hasScreenMode ? sm.navPill : (finalDark ? "#2a2740" : "#f0f9ff"),
    navInact:hasScreenMode ? sm.navInact: (finalDark ? "#666"    : "#777777"),
    navActiv: primary,
    inputBg: hasScreenMode ? sm.inputBg : (finalDark ? "#2a2740" : "#F7F7F7"),
    inputBd: hasScreenMode ? sm.inputBd : (finalDark ? "#3a3758" : "#E8E8E8"),

    // Texto — text_style override > contraste > screen_mode > default
    txt: tsTxt ? tsTxt
       : isContrast ? (finalDark ? "#ffffff" : "#000000")
       : hasScreenMode ? sm.txt
       : (finalDark ? "#e8e8f0" : "#1a1a1a"),
    sub: tsSub ? tsSub
       : isContrast ? (finalDark ? "#dddddd" : "#222222")
       : hasScreenMode ? sm.sub
       : (finalDark ? "#888" : "#555"),
  };

  const setTheme=(id, directPrimary, isPreview=false)=>{
    if(isPreview){
      // Solo cambia visualmente, no persiste
      setPreviewPrimary(directPrimary||null);
    } else {
      // Cambio real — persiste
      setPreviewPrimary(null); // limpiar preview
      if(id) setThemeId(id);
      setDbThemePrimary(directPrimary||null);
      if(id) localStorage.setItem("ec_theme", id);
      // Guardar primary para evitar flash en recarga
      if(directPrimary) localStorage.setItem("ec_primary", directPrimary);
      else localStorage.removeItem("ec_primary");
    }
  };
  // Llamado al salir de personalización — restaura el color real y borra preview
  const clearPreview=()=>{ setPreviewPrimary(null); };
  const toggleDark=(d)=>{
    setIsDark(d);
    localStorage.setItem("ec_dark",d?"true":"false");
  };

  // ── Personalización del server ───────────────────────────────

  const applyActive=(active, changedTipo=null)=>{
    if(!active) return;
    // Solo tocar el tema si: carga inicial de Alumno (null) o se equipó theme explícitamente
    // "__init__" = carga de ATiendaCustom — NO tocar el tema para no pisarlo
    if((changedTipo===null||changedTipo==="theme")&&changedTipo!=="__init__"){
      if(active.theme_config){
        const tc=typeof active.theme_config==="string"?JSON.parse(active.theme_config):active.theme_config;
        if(tc?.primary){ const match=DUAL_THEMES.find(t=>t.primary===tc.primary); setTheme(match?.id||null,tc.primary,false); }
      }
    }
    // Solo tocar screen_mode si es carga inicial o se equipó un screen_mode
    if(changedTipo===null||changedTipo==="screen_mode"){
      if(active.screen_mode_config){
        const sc=typeof active.screen_mode_config==="string"?JSON.parse(active.screen_mode_config):active.screen_mode_config;
        setScreenModeCfg(sc||null);
      } else if(changedTipo===null){ setScreenModeCfg(null); }
    }
    // Solo tocar text_style si es carga inicial o se equipó un text_style
    if(changedTipo===null||changedTipo==="text_style"){
      if(active.text_style_config){
        const ts=typeof active.text_style_config==="string"?JSON.parse(active.text_style_config):active.text_style_config;
        setTextStyleCfg({...ts,custom_txt:active.custom_txt_color,custom_sub:active.custom_sub_color,custom_card:active.custom_card_color});
      } else if(changedTipo===null){ setTextStyleCfg(null); }
    }
  };

  useEffect(()=>{
    api.customMe().then(d=>{
      const data=d.data||d;
      setCustomActive(data?.active||null);
      applyActive(data?.active||null);
    }).catch(()=>{});
  },[]);

  const nameColorConfig = customActive?.name_color_config
    ? (typeof customActive.name_color_config==="string"
        ? JSON.parse(customActive.name_color_config)
        : customActive.name_color_config)
    : null;

  // ── Balance animado ──────────────────────────────────────────
  const displayBalance = useCountUp(balance, 500);
  const [balDir,setBalDir] = useState(null); // 'up'|'down'|null
  const prevBal = useRef(balance);
  useEffect(()=>{
    if(balance===prevBal.current) return;
    setBalDir(balance>prevBal.current?"up":"down");
    prevBal.current=balance;
    const t=setTimeout(()=>setBalDir(null),1600);
    return()=>clearTimeout(t);
  },[balance]);

  const hideNav = ["chat","noticias","votaciones","reportes","notificaciones"].includes(tab);

  // ── Socket notificaciones ────────────────────────────────────
  useEffect(()=>{
    const token=localStorage.getItem("ec_token");
    if(!token) return;
    const s=connectSocket(token);
    const onNotif=(n)=>{
      setNotifs(prev=>[{...n,id:Date.now(),leida:false},...prev.slice(0,19)]);
      if(n.type==="chat_personal") setBadges(b=>({...b,chat:b.chat+1}));
      else setBadges(b=>({...b,notifs:b.notifs+1}));
      const msg=n.type==="reward"?`Recibiste 🪙${n.amount} — ${n.description||""}`
        :n.type==="transfer"?`Te enviaron 🪙${n.amount}`
        :n.type==="chat_personal"?`Nuevo mensaje de ${n.from}`
        :n.type==="mission_approved"?`Mision aprobada! +🪙${n.amount}`
        :n.type==="checkin"?`Check-in dia ${n.racha}! +🪙${n.recompensa}`
        :n.type==="gift"?`Regalo de ${n.from}! 🎁`
        :n.type==="tax"?`Impuesto: -🪙${n.amount} — ${n.motivo||""}`
        :"Nueva notificacion";
      showToast(msg);
      if(["reward","transfer","checkin","gift"].includes(n.type)) refreshBalance();
    };
    s.on('notification',onNotif);
    return()=>s.off('notification',onNotif);
  },[]);

  const navTo=(dest)=>{
    setTab(dest);
    if(dest==="chat") setBadges(b=>({...b,chat:0}));
    if(dest==="notificaciones"||dest==="opciones") setBadges(b=>({...b,notifs:0}));
  };

  return(
    <ThemeCtx.Provider value={theme}>
    <div style={{maxWidth:480,margin:"0 auto",height:"100vh",background:theme.pageBg,
      display:"flex",flexDirection:"column",fontFamily:"Nunito,sans-serif",
      transition:"background .3s",overflow:"hidden"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:hideNav?0:90,animation:"fadeIn .18s ease"}}>
        {tab==="home"       && <AHome       me={me} balance={balance} displayBalance={displayBalance} balDir={balDir} onNav={navTo} badges={badges} nameColorConfig={nameColorConfig}/>}
        {tab==="misiones"   && <AMisiones   me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="tienda"     && <ATienda     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="enviar"     && <AEnviar     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="movimientos"&& <AMovimientos/>}
        {tab==="ingresar"   && <AIngresar   me={me} onBack={()=>setTab("home")}/>}
        {tab==="perfil"     && <APerfil     me={me} balance={balance} logout={logout} showToast={showToast} setMe={setMe}/>}
        {tab==="ranking"    && <ARanking    nameColorConfig={nameColorConfig}/>}
        {tab==="opciones"   && <AOpciones   me={me} logout={logout} notifs={notifs}/>}
        {tab==="notificaciones"&&<ANotificaciones me={me} onBack={()=>navTo("home")} notifs={notifs} setNotifs={setNotifs}/>}
        {tab==="personalizar"&&<ATiendaCustom me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}
          onBack={()=>{clearPreview();navTo("home");}}
          onCustomChange={(active, tipo)=>{
            setCustomActive(active);
            applyActive(active, tipo||null);
          }}
          onThemeChange={(id,directPrimary,isPreview)=>setTheme(id,directPrimary,isPreview)}
          onDarkChange={toggleDark}
          currentThemeId={themeId} isDark={isDark}
          currentPrimary={dbThemePrimary||theme.primary}/>}
        {tab==="chat"       && <AChat       me={me} showToast={showToast} onBack={()=>navTo("home")} nameColorConfig={nameColorConfig}/>}
        {tab==="noticias"   && <ANoticias   me={me} onBack={()=>navTo("home")}/>}
        {tab==="votaciones" && <AVotaciones me={me} showToast={showToast} onBack={()=>navTo("home")}/>}
        {tab==="reportes"   && <AReportes   me={me} showToast={showToast} onBack={()=>navTo("home")}/>}
      </div>

      {/* Modal QR Scanner */}
      {camOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:400,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setCamOpen(false);}}>
          <div style={{background:theme.cardBg,borderRadius:"24px 24px 0 0",
            width:"100%",maxWidth:480,padding:"20px 24px 44px",animation:"slideUp .25s ease"}}>
            <div style={{width:36,height:4,background:theme.isDark?"#555":"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontWeight:900,fontSize:18,color:theme.txt,marginBottom:4,textAlign:"center"}}>Escanear QR</div>
            <div style={{fontSize:12,color:theme.sub,textAlign:"center",marginBottom:16}}>
              Apuntá la cámara al QR de tu compañero
            </div>
            <label style={{display:"block",cursor:"pointer"}}>
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}}
                onChange={()=>{ setCamOpen(false); showToast("Funcion disponible en la app movil"); }}/>
              <div style={{width:200,height:200,margin:"0 auto 16px",borderRadius:20,
                border:`3px solid ${theme.primary}`,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",background:theme.isDark?"#2d2a45":"#f0f9ff"}}>
                <div style={{fontSize:56,marginBottom:8}}>📷</div>
                <div style={{fontSize:12,fontWeight:700,color:theme.primary}}>Toca para abrir cámara</div>
              </div>
            </label>
            <button onClick={()=>{setCamOpen(false);navTo("enviar");}}
              style={{width:"100%",background:theme.primary,border:"none",borderRadius:50,
                color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              Ir a Enviar dinero →
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      {!hideNav&&(
      <div style={{position:"sticky",bottom:0,width:"100%",zIndex:100}}>
        <div style={{position:"absolute",top:-22,left:"50%",transform:"translateX(-50%)",zIndex:101}}>
          <button onClick={()=>setCamOpen(true)} style={{
            width:68,height:68,borderRadius:"50%",background:theme.primary,
            border:`4px solid ${theme.navBg}`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:26,cursor:"pointer",
            boxShadow:`0 4px 20px ${theme.primary}66`,outline:"none",transition:"background .3s"}}>
            📷
          </button>
        </div>
        <div style={{background:theme.navBg,borderTop:`1px solid ${theme.navBord}`,
          padding:"6px 4px 14px",display:"flex",justifyContent:"space-around",
          boxShadow:"0 -2px 16px rgba(0,0,0,.12)",transition:"background .3s"}}>
          {[
            {id:"home",       icon:"🏠",label:"Inicio"},
            {id:"tienda",     icon:"🛒",label:"Tienda"},
            {id:"_cam",       isCam:true},
            {id:"movimientos",icon:"📊",label:"Movimientos"},
            {id:"opciones",   icon:"☰", label:"Opciones"},
          ].map(item=>{
            if(item.isCam) return <div key="_cam" style={{width:68,flexShrink:0}}/>;
            const on=tab===item.id;
            return(
              <button key={item.id} onClick={()=>navTo(item.id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,
                background:"none",border:"none",cursor:"pointer",
                color:on?theme.navActiv:theme.navInact,
                fontFamily:"Nunito,sans-serif",padding:"3px 6px",transition:"color .3s",position:"relative"}}>
                <div style={{width:36,height:30,borderRadius:10,
                  background:on?theme.navPill:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",transition:"background .3s"}}>
                  <span style={{fontSize:19}}>{item.icon}</span>
                </div>
                <span style={{fontSize:9,fontWeight:800}}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
    </ThemeCtx.Provider>
  );
}

export default Alumno;
