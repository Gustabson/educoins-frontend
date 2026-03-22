import { useState, useEffect, useRef, useMemo } from "react";
import { api, connectSocket } from "../../api";
import { ThemeCtx, useTheme } from "../../ThemeContext";
import { DUAL_THEMES, BUILTIN_SCREEN_MODES, GS } from "../../constants";
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
  const [perfilUserId,setPerfilUserId]=useState(null); // perfil modal global

  // ── Sistema de tema unificado ────────────────────────────────
  // activeMode: objeto con todos los colores del modo activo (claro/oscuro/sepia/etc)
  // activePrimary: color de acento equipado (null = usa el default del modo)
  const savedModeId  = localStorage.getItem("ec_mode_id")||"claro";
  const savedPrimary = localStorage.getItem("ec_primary")||null;

  const [activeModeId,  setActiveModeId]  = useState(savedModeId);
  const [activePrimary, setActivePrimary] = useState(savedPrimary);
  const [previewPrimary,setPreviewPrimary]= useState(null);
  const [textStyleCfg,  setTextStyleCfg]  = useState(null);
  const [customActive,  setCustomActive]  = useState(null);

  // Resolver el modo activo: buscar en built-ins primero, luego puede venir de DB
  const savedModeCfg = (() => { try { const s=localStorage.getItem("ec_mode_cfg"); return s?JSON.parse(s):null; } catch{return null;} })();
  const [dbModeCfg, setDbModeCfg] = useState(savedModeCfg); // config completo de un modo de DB

  const sm = dbModeCfg || BUILTIN_SCREEN_MODES.find(m=>m.id===activeModeId) || BUILTIN_SCREEN_MODES[0];

  // ── Text style: resuelve colores de texto ────────────────────
  const ts = textStyleCfg || {};
  const isDark = sm.isDark || false;

  // 3 casos posibles de preset:
  // "contraste" → máximo contraste según fondo del modo
  // "custom"    → colores elegidos por el alumno
  // cualquier otro (null, "clasico") → colores del modo
  const resolveText = () => {
    if(ts.preset==="contraste" || ts.contrast){
      return {
        txt: isDark ? "#ffffff" : "#000000",
        sub: isDark ? "#cccccc" : "#222222",
      };
    }
    if(ts.preset==="custom"){
      return {
        txt: ts.custom_txt || sm.txt,
        sub: ts.custom_sub || sm.sub,
      };
    }
    // Preset específico con colores definidos (ej: Nocturno)
    if(ts.txt && ts.txt!=="default") {
      return { txt: ts.txt, sub: ts.sub&&ts.sub!=="default"?ts.sub:sm.sub };
    }
    // Default: usar los del modo
    return { txt: sm.txt, sub: sm.sub };
  };
  const {txt: resolvedTxt, sub: resolvedSub} = resolveText();

  const primary = previewPrimary || activePrimary || "#00c1fc";

  const theme = {
    primary,
    secondary: "#0369a1",
    isDark,
    pageBg:    sm.pageBg,
    darkBg:    sm.bg||sm.pageBg,
    cardBg:    sm.card,
    navBg:     sm.nav,
    navBord:   sm.navBord,
    navPill:   sm.navPill,
    // Nav: si hay contraste activo, los labels siguen al txt resuelto
    navInact:  (ts.preset==="contraste"||ts.contrast) ? resolvedSub : sm.navInact,
    navActiv:  primary,
    inputBg:   sm.inputBg,
    inputBd:   sm.inputBd,
    // txt y sub son los colores de TODO el contenido de texto
    txt:       resolvedTxt,
    sub:       resolvedSub,
  };

  // ── Funciones de tema unificadas ─────────────────────────────

  // Cambiar color de acento (paleta)
  const setAccent=(primary, isPreview=false)=>{
    if(isPreview){
      setPreviewPrimary(primary||null);
    } else {
      setPreviewPrimary(null);
      setActivePrimary(primary||null);
      if(primary) localStorage.setItem("ec_primary", primary);
      else localStorage.removeItem("ec_primary");
    }
  };

  // Cambiar modo de pantalla (claro/oscuro/sepia/etc — todos iguales)
  const setMode=(modeId, modeCfg=null)=>{
    setPreviewPrimary(null);
    if(modeCfg){
      // Modo de DB — guardar config completo
      setDbModeCfg(modeCfg);
      setActiveModeId(modeCfg.id||"custom");
      localStorage.setItem("ec_mode_id", modeCfg.id||"custom");
      localStorage.setItem("ec_mode_cfg", JSON.stringify(modeCfg));
    } else {
      // Modo built-in (claro/oscuro)
      setDbModeCfg(null);
      setActiveModeId(modeId||"claro");
      localStorage.setItem("ec_mode_id", modeId||"claro");
      localStorage.removeItem("ec_mode_cfg");
    }
  };

  // Limpiar preview al salir de personalización
  const clearPreview=()=>{ setPreviewPrimary(null); };

  const toggleDark=(d)=>{
    setMode(d?"oscuro":"claro");
  };

  // ── Personalización del server ───────────────────────────────

  const applyActive=(active, changedTipo=null)=>{
    if(!active) return;
    const tipo = changedTipo;

    // Color de acento (paleta de color)
    if(tipo===null||tipo==="theme"){
      if(active.theme_config){
        const tc = typeof active.theme_config==="string"?JSON.parse(active.theme_config):active.theme_config;
        if(tc?.primary) setAccent(tc.primary, false);
      } else if(tipo===null){
        setAccent(null, false);
      }
    }

    // Modo de pantalla
    if(tipo===null||tipo==="screen_mode"){
      if(active.screen_mode_config){
        const sc = typeof active.screen_mode_config==="string"?JSON.parse(active.screen_mode_config):active.screen_mode_config;
        setMode(sc.id||"custom", sc);
      } else if(active.custom_mode_config){
        // Modo personalizado guardado en el servidor
        const cm = typeof active.custom_mode_config==="string"?JSON.parse(active.custom_mode_config):active.custom_mode_config;
        setMode("personalizado", cm);
        localStorage.setItem("ec_mode_id","personalizado");
        localStorage.setItem("ec_mode_cfg",JSON.stringify(cm));
      } else {
        // Sin screen_mode — restaurar al modo guardado (claro/oscuro)
        const savedId = localStorage.getItem("ec_mode_id")||"claro";
        const isBuiltin = ["claro","oscuro"].includes(savedId);
        if(isBuiltin) setMode(savedId, null);
        else setMode("claro", null);
      }
    }

    // Estilo de texto
    if(tipo===null||tipo==="text_style"){
      if(active.text_style_config){
        const ts = typeof active.text_style_config==="string"?JSON.parse(active.text_style_config):active.text_style_config;
        setTextStyleCfg({...ts, custom_txt:active.custom_txt_color, custom_sub:active.custom_sub_color});
      } else if(tipo===null){
        setTextStyleCfg(null);
      }
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
          onBack={()=>{setAccent(activePrimary,false);navTo("home");}}
          onCustomChange={(active, tipo)=>{
            setCustomActive(active);
            applyActive(active, tipo||null);
          }}
          onDarkChange={toggleDark}
          onPreviewAccent={(p)=>setAccent(p,true)}
          onClearPreview={()=>setAccent(activePrimary,false)}
          onSetMode={(id,cfg)=>setMode(id,cfg)}
          currentModeId={activeModeId} isDark={theme.isDark}
          currentPrimary={activePrimary||theme.primary}
          currentMode={sm}/>}
        {tab==="chat"       && <AChat       me={me} showToast={showToast} onBack={()=>navTo("home")} nameColorConfig={nameColorConfig} onOpenPerfil={setPerfilUserId}/>}
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
    {perfilUserId&&<PerfilModal userId={perfilUserId} onClose={()=>setPerfilUserId(null)} showToast={showToast}/>}
    </ThemeCtx.Provider>
  );
}

export default Alumno;
