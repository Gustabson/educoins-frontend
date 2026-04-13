import { useState, useEffect, useRef, useMemo } from "react";
import { api, connectSocket } from "../../api";
import { ThemeCtx, useTheme } from "../../ThemeContext";
import { DUAL_THEMES, BUILTIN_SCREEN_MODES, normalizeMode, GS, VERDICT_SEVERITY } from "../../constants";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";
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
import AAmigos from "./AAmigos";
import AMisPremios from "./AMisPremios";
import AP2P from "./AP2P";
import ANoticias from "./ANoticias";
import AVotaciones from "./AVotaciones";
import AReportes from "./AReportes";
import AVeredictos from "./AVeredictos";
import AAsistente  from "./AAsistente";
import ATiendaCustom from "./personalizar/ATiendaCustom";
import AWellness from "./AWellness";
import AHorarios from "./AHorarios";
import ACalendario from "./ACalendario";

const SIREN_STYLE = `
  @keyframes sirenPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.7), inset 0 0 80px rgba(220,38,38,.15); }
    50%      { box-shadow: 0 0 0 24px rgba(220,38,38,0), inset 0 0 80px rgba(220,38,38,.35); }
  }
  @keyframes badgePop {
    0%   { transform: scale(0) rotate(-10deg); opacity:0; }
    60%  { transform: scale(1.15) rotate(3deg); }
    100% { transform: scale(1) rotate(0deg); opacity:1; }
  }
  @keyframes slideUp {
    from { transform: translateY(60px); opacity:0; }
    to   { transform: translateY(0);    opacity:1; }
  }
`;

function VerdictModal({ verdict, onDismiss }) {
  const { cardBg, txt, sub, isDark } = useTheme();
  const cfg = VERDICT_SEVERITY[verdict.severity] || VERDICT_SEVERITY.advertencia;
  return (
    <>
      <style>{SIREN_STYLE}</style>
      <div style={{ position:"fixed", inset:0, zIndex:9999,
        background:"rgba(0,0,0,.88)",
        display:"flex", alignItems:"flex-end", justifyContent:"center",
        fontFamily:"Nunito,sans-serif" }}>
        <div style={{ width:"100%", maxWidth:480, background:cardBg,
          borderRadius:"28px 28px 0 0", overflow:"hidden",
          animation:"slideUp .35s ease", transition:"background .3s" }}>

          {/* Franja superior animada */}
          <div style={{ background:primary, padding:"28px 24px 20px",
            animation:"sirenPulse 1.4s ease-in-out infinite",
            textAlign:"center", color:"white" }}>
            <div style={{ fontSize:52, marginBottom:10,
              animation:"badgePop .5s ease .1s both", display:"inline-block" }}>
              {cfg.icon}
            </div>
            <div style={{ fontWeight:900, fontSize:22, letterSpacing:"-.5px",
              textTransform:"uppercase", marginBottom:4 }}>
              Veredicto Oficial
            </div>
            <div style={{ display:"inline-block", background:"rgba(255,255,255,.2)",
              borderRadius:99, padding:"4px 14px", fontSize:12, fontWeight:800 }}>
              {cfg.label}
            </div>
          </div>

          {/* Cuerpo */}
          <div style={{ padding:"22px 24px 10px" }}>
            <div style={{ fontSize:15, color:txt, lineHeight:1.6,
              fontWeight:700, marginBottom:verdict.coins_penalty>0?16:8,
              transition:"color .3s" }}>
              {verdict.mensaje}
            </div>

            {verdict.coins_penalty > 0 && (
              <div style={{ background:isDark?"rgba(239,68,68,.2)":"#fee2e2",
                borderRadius:14, padding:"12px 16px",
                display:"flex", alignItems:"center", gap:10, marginBottom:8,
                transition:"background .3s" }}>
                <span style={{ fontSize:24 }}>🪙</span>
                <div>
                  <div style={{ fontWeight:900, fontSize:14, color:"#dc2626" }}>
                    -{verdict.coins_penalty} EduCoins descontados
                  </div>
                  <div style={{ fontSize:11, color:"#ef4444", marginTop:2 }}>
                    El monto fue debitado de tu cuenta automáticamente
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize:11, color:sub, textAlign:"center", marginBottom:20,
              transition:"color .3s" }}>
              Emitido por la Administración · {new Date(verdict.created_at).toLocaleDateString("es-AR")}
            </div>
          </div>

          {/* Botón */}
          <div style={{ padding:"0 24px 40px" }}>
            <button onClick={onDismiss} style={{ width:"100%",
              background:primary, border:"none", borderRadius:50,
              color:"white", padding:"15px", fontWeight:900, fontSize:15,
              cursor:"pointer", fontFamily:"Nunito,sans-serif",
              boxShadow:`0 4px 20px ${primary}66` }}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Alumno({me,balance,refreshBalance,logout,setMe}){
  const [tab,setTab]=useState("home");
  // Single date instance — shared across all child tabs to avoid redundant new Date() calls
  const today = useMemo(()=>new Date(),[]);
  const [toast,showToast]=useToast();
  const [camOpen,setCamOpen]=useState(false);
  const [wellnessOpen,setWellnessOpen]=useState(false);
  const [todayMood,setTodayMood]=useState(null);
  const [moodLoaded,setMoodLoaded]=useState(false);
  const [notifs,setNotifs]=useState([]);
  const [badges,setBadges]=useState({chat:0,notifs:0,veredictos:0});
  const [pendingVerdict,setPendingVerdict]=useState(null); // modal bloqueante
  const [perfilUserId,setPerfilUserId]=useState(null); // perfil modal global
  const [chatInitialFriend,setChatInitialFriend]=useState(null);

  // ── localStorage namespaced por usuario ──────────────────────
  const lk = k => `${me.id}_${k}`;

  // ── Sistema de tema unificado ────────────────────────────────
  // activeMode: objeto con todos los colores del modo activo (claro/oscuro/sepia/etc)
  // activePrimary: color de acento equipado (null = usa el default del modo)
  const savedModeId  = localStorage.getItem(lk("ec_mode_id"))||"claro";
  const savedPrimary = localStorage.getItem(lk("ec_primary"))||null;

  const [activeModeId,  setActiveModeId]  = useState(savedModeId);
  const [activePrimary, setActivePrimary] = useState(savedPrimary);
  const [previewPrimary,setPreviewPrimary]= useState(null);
  const [textStyleCfg,  setTextStyleCfg]  = useState(null);
  const [customActive,  setCustomActive]  = useState(null);

  // Resolver el modo activo: buscar en built-ins primero, luego puede venir de DB
  const [dbModeCfg, setDbModeCfg] = useState(()=>{
    // Lazy initializer — solo corre una vez al montar
    try { const s=localStorage.getItem(lk("ec_mode_cfg")); return s?normalizeMode(JSON.parse(s)):null; } catch{return null;}
  });

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
      if(primary) localStorage.setItem(lk("ec_primary"), primary);
      else localStorage.removeItem(lk("ec_primary"));
      // Guardar en servidor en background
      api.patchSchedulePrefs({ ec_primary: primary||"" }).catch(()=>{});
    }
  };

  // Cambiar modo de pantalla (claro/oscuro/sepia/etc — todos iguales)
  const setMode=(modeId, modeCfg=null)=>{
    setPreviewPrimary(null);
    if(modeCfg){
      const normalized = normalizeMode({...modeCfg, id: modeCfg.id||modeId||"personalizado"});
      setDbModeCfg(normalized);
      setActiveModeId(normalized.id);
      localStorage.setItem(lk("ec_mode_id"), normalized.id);
      localStorage.setItem(lk("ec_mode_cfg"), JSON.stringify(normalized));
      api.patchSchedulePrefs({ ec_mode_id: normalized.id, ec_mode_cfg: JSON.stringify(normalized) }).catch(()=>{});
    } else {
      setDbModeCfg(null);
      setActiveModeId(modeId||"claro");
      localStorage.setItem(lk("ec_mode_id"), modeId||"claro");
      localStorage.removeItem(lk("ec_mode_cfg"));
      api.patchSchedulePrefs({ ec_mode_id: modeId||"claro", ec_mode_cfg: "" }).catch(()=>{});
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
        // Normalizar el config del server al formato estándar
        const sc = typeof active.screen_mode_config==="string"?JSON.parse(active.screen_mode_config):active.screen_mode_config;
        setMode(sc.id||"custom", sc); // setMode ya normaliza internamente
      } else if(active.custom_mode_config){
        const cm = typeof active.custom_mode_config==="string"?JSON.parse(active.custom_mode_config):active.custom_mode_config;
        setMode("personalizado", cm); // setMode ya normaliza
      } else {
        // Sin screen_mode en servidor — respetar lo que hay en localStorage
        // (puede ser claro, oscuro, o personalizado)
        const savedId  = localStorage.getItem(lk("ec_mode_id"))||"claro";
        const savedCfg = (() => { try { const s=localStorage.getItem(lk("ec_mode_cfg")); return s?JSON.parse(s):null; } catch{return null;} })();
        if(savedCfg && savedId==="personalizado"){
          // Restaurar modo personalizado desde localStorage
          setMode("personalizado", savedCfg);
        } else if(["claro","oscuro"].includes(savedId)){
          setMode(savedId, null);
        }
        // Si no coincide con nada conocido, no tocar — dejar el estado actual
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
    // Load customization + server-saved theme prefs in parallel
    Promise.all([
      api.customMe().catch(()=>null),
      api.getSchedulePrefs().catch(()=>null),
    ]).then(([customData, prefs])=>{
      const active = customData ? (customData.data||customData)?.active||null : null;
      setCustomActive(active);
      applyActive(active);
      // Apply server-saved theme prefs only when customMe has no theme config
      if(prefs && !active?.screen_mode_config && !active?.custom_mode_config){
        if(prefs.ec_mode_cfg && prefs.ec_mode_id){
          try {
            const cfg = typeof prefs.ec_mode_cfg==="string" ? JSON.parse(prefs.ec_mode_cfg) : prefs.ec_mode_cfg;
            if(cfg && Object.keys(cfg).length > 0) setMode(prefs.ec_mode_id, cfg);
            else setMode(prefs.ec_mode_id||"claro", null);
          } catch { setMode(prefs.ec_mode_id||"claro", null); }
        } else if(prefs.ec_mode_id){
          setMode(prefs.ec_mode_id, null);
        }
      }
      if(prefs && !active?.theme_config && prefs.ec_primary){
        setAccent(prefs.ec_primary, false);
      }
    });
    api.wellnessToday().then(d=>{
      if(d?.mood) setTodayMood(d.mood);
      setMoodLoaded(true);
    }).catch(()=>{ setMoodLoaded(true); });
  },[]);// eslint-disable-line

  const nameColorConfig = customActive?.name_color_config
    ? (typeof customActive.name_color_config==="string"
        ? JSON.parse(customActive.name_color_config)
        : customActive.name_color_config)
    : null;


  const hideNav = ["chat","amigos","mispremios","p2p","noticias","votaciones","reportes","notificaciones","veredictos","asistente","horarios"].includes(tab);

  // ── Socket notificaciones ────────────────────────────────────
  useEffect(()=>{
    const token=localStorage.getItem("ec_token");
    if(!token) return;
    const s=connectSocket(token);
    const onNotif=(n)=>{
      setNotifs(prev=>[{...n,id:Date.now(),leida:false},...prev.slice(0,19)]);
      const tipo = n.type || n.tipo || "";
      if(tipo==="chat_personal") setBadges(b=>({...b,chat:b.chat+1}));
      else setBadges(b=>({...b,notifs:b.notifs+1}));
      const msg=tipo==="reward"?`Recibiste 🪙${n.amount} — ${n.description||""}`
        :tipo==="transfer"?`Te enviaron 🪙${n.amount}`
        :tipo==="chat_personal"?`Nuevo mensaje de ${n.from}`
        :tipo==="mission_approved"?`Mision aprobada! +🪙${n.amount}`
        :tipo==="checkin"?`Check-in dia ${n.racha}! +🪙${n.recompensa}`
        :tipo==="gift"?`Regalo de ${n.from}! 🎁`
        :tipo==="tax"?`Impuesto: -🪙${n.amount} — ${n.motivo||""}`
        :tipo==="premio_monedas"?`${n.mensaje||"Premio recibido!"}`
        :tipo==="premio"||tipo==="titulo_otorgado"?`🏆 ${n.mensaje||"Recibiste un premio!"}`
        :"Nueva notificacion";
      showToast(msg);
      if(["reward","transfer","checkin","gift","premio_monedas","premio","titulo_otorgado"].includes(tipo))
        refreshBalance();
    };
    s.on('notification',onNotif);

    // P2P: refrescar balance cuando se completa o cancela una orden
    const onP2P = (payload) => {
      if (['order_completed','new_order','payment_sent'].includes(payload.type)) {
        refreshBalance();
      }
    };
    s.on('p2p_update', onP2P);

    // Veredictos: modal bloqueante
    const onVerdict = (v) => {
      setPendingVerdict(v);
      setBadges(b=>({...b,veredictos:b.veredictos+1}));
      // refreshBalance se llama al cerrar el modal para que la animación sea visible
    };
    s.on('new_verdict', onVerdict);

    return()=>{
      s.off('notification',onNotif);
      s.off('p2p_update',onP2P);
      s.off('new_verdict',onVerdict);
    };
  },[]);

  const navTo=(dest)=>{
    setTab(dest);
    if(dest==="chat") setBadges(b=>({...b,chat:0}));
    if(dest==="amigos") setBadges(b=>({...b,amigos:0}));
    if(dest==="notificaciones"||dest==="opciones") setBadges(b=>({...b,notifs:0}));
    if(dest==="veredictos") setBadges(b=>({...b,veredictos:0}));
  };

  const dismissVerdict = () => {
    if (pendingVerdict?.id) {
      api.readVerdict(pendingVerdict.id).catch(()=>{});
    }
    const hadPenalty = pendingVerdict?.coins_penalty > 0;
    setPendingVerdict(null);
    // Actualizar balance DESPUÉS de cerrar el modal → animación visible
    if (hadPenalty) refreshBalance();
  };

  return(
    <ThemeCtx.Provider value={theme}>
    <div style={{maxWidth:480,margin:"0 auto",height:"100vh",background:theme.pageBg,
      display:"flex",flexDirection:"column",fontFamily:"Nunito,sans-serif",
      transition:"background .3s",position:"relative"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:0,animation:"fadeIn .18s ease"}}>
        {tab==="home"       && <AHome       me={me} balance={balance} onNav={navTo} badges={badges} nameColorConfig={nameColorConfig} todayMood={todayMood} moodLoaded={moodLoaded} onOpenWellness={()=>setWellnessOpen(true)}/>}
        {tab==="misiones"   && <AMisiones   me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="tienda"     && <ATienda     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="enviar"     && <AEnviar     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="movimientos"&& <AMovimientos/>}
        {tab==="ingresar"   && <AIngresar   me={me} onBack={()=>setTab("home")}/>}
        {tab==="perfil"     && <APerfil     me={me} balance={balance} logout={logout} showToast={showToast} setMe={setMe} refreshBalance={refreshBalance}/>}
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
        {tab==="chat"       && <AChat       me={me} showToast={showToast} onBack={()=>navTo("home")} nameColorConfig={nameColorConfig} onOpenPerfil={setPerfilUserId} initialFriend={chatInitialFriend} onChatOpened={()=>setChatInitialFriend(null)}/>}
        {tab==="mispremios" && <AMisPremios me={me} showToast={showToast} onBack={()=>navTo("home")}/>}
        {tab==="p2p"        && <AP2P me={me} balance={balance} showToast={showToast} onBack={()=>navTo("home")} refreshBalance={refreshBalance}/>}
        {tab==="amigos"     && <AAmigos     me={me} showToast={showToast} onBack={()=>navTo("home")} onOpenPerfil={setPerfilUserId} onOpenChat={(friend)=>{ setChatInitialFriend(friend); navTo("chat"); }}/>}
        {tab==="noticias"   && <ANoticias   me={me} onBack={()=>navTo("home")}/>}
        {tab==="votaciones" && <AVotaciones me={me} showToast={showToast} onBack={()=>navTo("home")}/>}
        {tab==="reportes"   && <AReportes   me={me} showToast={showToast} onBack={()=>navTo("home")}/>}
        {tab==="veredictos" && <AVeredictos me={me} onBack={()=>navTo("home")}/>}
        {tab==="asistente"  && <AAsistente  me={me} onBack={()=>navTo("home")}/>}
        {tab==="horarios"   && <AHorarios   me={me} showToast={showToast} onBack={()=>navTo("home")} today={today}/>}
        {tab==="calendario" && <ACalendario me={me} onBack={()=>navTo("home")} today={today}/>}
      </div>

      {/* Modal Bienestar */}
      {wellnessOpen&&(
        <AWellness
          onClose={()=>setWellnessOpen(false)}
          showToast={showToast}
          refreshBalance={refreshBalance}
          initialMood={todayMood}
          onCheckinDone={(mood)=>{ setTodayMood(mood); }}
          onGoReportes={()=>{ setWellnessOpen(false); navTo("reportes"); }}
        />
      )}

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

    {/* Modal bloqueante de veredicto */}
    {pendingVerdict&&(
      <VerdictModal verdict={pendingVerdict} onDismiss={dismissVerdict}/>
    )}
    </ThemeCtx.Provider>
  );
}

export default Alumno;
