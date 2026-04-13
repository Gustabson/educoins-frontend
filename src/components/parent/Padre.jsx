import { useState, useEffect } from "react";
import { api } from "../../api";
import { GS, BUILTIN_SCREEN_MODES, normalizeMode } from "../../constants";
import { ThemeCtx } from "../../ThemeContext";
import { Toast, useToast } from "../shared/index";

import AVotaciones    from "../student/AVotaciones";
import AP2P          from "../student/AP2P";
import AAsistente    from "../student/AAsistente";
import ATiendaCustom from "../student/personalizar/ATiendaCustom";
import ANoticias     from "../student/ANoticias";
import ARanking      from "../student/ARanking";
import APerfil       from "../student/APerfil";

import PHome         from "./PHome";
import PChat2        from "./PChat2";
import PAMigos       from "./PAMigos";
import DiwyHub       from "../diwy/DiwyHub";
import PVeredictos   from "./PVeredictos";
import PSugerencias  from "./PSugerencias";
import PVinculacion  from "./PVinculacion";
import PQuemar       from "./PQuemar";
import PEnviar       from "./PEnviar";
import PIngresar     from "./PIngresar";
import PContacto     from "./PContacto";
import ACalendario  from "../student/ACalendario";

// Sub-páginas que ocultan la barra de nav (tienen su propio botón ←)
const HIDE_NAV = new Set([
  "diwy","veredictos-hijo","sugerencias","noticias","asistente",
  "personalizar","exchange","quemar","vincular","chat","amigos",
  "enviar","ingresar","contacto","calendario",
]);

// ─────────────────────────────────────────────────────────────
// CONTENEDOR PRINCIPAL
// ─────────────────────────────────────────────────────────────
function Padre({ me, balance, refreshBalance, logout, setMe }) {
  const [tab, setTab]         = useState("home");
  const [toast, showToast]    = useToast();
  const [camOpen, setCamOpen] = useState(false);
  const showNav = !HIDE_NAV.has(tab);

  // ── localStorage namespaced por usuario ──────────────────────
  const lk = k => `${me.id}_${k}`;

  // ── Theme state machine (mirrors Alumno) ──────────────────────
  const savedModeId  = localStorage.getItem(lk("ec_mode_id")) || "claro";
  const savedPrimary = localStorage.getItem(lk("ec_primary")) || null;

  const [activeModeId,  setActiveModeId]  = useState(savedModeId);
  const [activePrimary, setActivePrimary] = useState(savedPrimary);
  const [previewPrimary,setPreviewPrimary]= useState(null);
  const [dbModeCfg, setDbModeCfg] = useState(() => {
    try { const s = localStorage.getItem(lk("ec_mode_cfg")); return s ? normalizeMode(JSON.parse(s)) : null; } catch { return null; }
  });

  const sm      = dbModeCfg || BUILTIN_SCREEN_MODES.find(m => m.id === activeModeId) || BUILTIN_SCREEN_MODES[0];
  const isDark  = sm.isDark || false;
  const primary = previewPrimary || activePrimary || "#00c1fc";

  const theme = {
    primary,
    secondary: "#0369a1",
    isDark,
    pageBg:   sm.pageBg,
    darkBg:   sm.bg || sm.pageBg,
    cardBg:   sm.card,
    navBg:    sm.nav,
    navBord:  sm.navBord,
    navPill:  sm.navPill,
    navInact: sm.navInact,
    navActiv: primary,
    inputBg:  sm.inputBg,
    inputBd:  sm.inputBd,
    txt:      sm.txt,
    sub:      sm.sub,
  };

  const setAccent = (p, isPreview = false) => {
    if (isPreview) { setPreviewPrimary(p || null); }
    else {
      setPreviewPrimary(null);
      setActivePrimary(p || null);
      if (p) localStorage.setItem(lk("ec_primary"), p);
      else localStorage.removeItem(lk("ec_primary"));
      api.patchSchedulePrefs({ ec_primary: p || "" }).catch(() => {});
    }
  };

  const setMode = (modeId, modeCfg = null) => {
    setPreviewPrimary(null);
    if (modeCfg) {
      const normalized = normalizeMode({ ...modeCfg, id: modeCfg.id || modeId || "personalizado" });
      setDbModeCfg(normalized);
      setActiveModeId(normalized.id);
      localStorage.setItem(lk("ec_mode_id"), normalized.id);
      localStorage.setItem(lk("ec_mode_cfg"), JSON.stringify(normalized));
      api.patchSchedulePrefs({ ec_mode_id: normalized.id, ec_mode_cfg: JSON.stringify(normalized) }).catch(() => {});
    } else {
      setDbModeCfg(null);
      setActiveModeId(modeId || "claro");
      localStorage.setItem(lk("ec_mode_id"), modeId || "claro");
      localStorage.removeItem(lk("ec_mode_cfg"));
      api.patchSchedulePrefs({ ec_mode_id: modeId || "claro", ec_mode_cfg: "" }).catch(() => {});
    }
  };

  const clearPreview = () => { setPreviewPrimary(null); };

  // Cargar tema guardado en servidor al montar (fallback si no hay en localStorage)
  useEffect(() => {
    api.getSchedulePrefs().then(prefs => {
      if (!prefs) return;
      // Solo aplicar si el localStorage no tiene nada guardado aún
      const localModeId = localStorage.getItem(lk("ec_mode_id"));
      const localPrimary = localStorage.getItem(lk("ec_primary"));
      if (!localModeId && prefs.ec_mode_id) {
        if (prefs.ec_mode_cfg) {
          try {
            const cfg = typeof prefs.ec_mode_cfg === "string" ? JSON.parse(prefs.ec_mode_cfg) : prefs.ec_mode_cfg;
            if (cfg && Object.keys(cfg).length > 0) setMode(prefs.ec_mode_id, cfg);
            else setMode(prefs.ec_mode_id, null);
          } catch { setMode(prefs.ec_mode_id, null); }
        } else {
          setMode(prefs.ec_mode_id, null);
        }
      }
      if (!localPrimary && prefs.ec_primary) {
        setAccent(prefs.ec_primary, false);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  return (
    <ThemeCtx.Provider value={theme}>
    <div style={{ maxWidth:480, margin:"0 auto", height:"100vh", background:theme.pageBg,
      fontFamily:"Nunito,sans-serif", display:"flex", flexDirection:"column", overflow:"hidden",
      transition:"background .3s" }}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{ flex:1, overflowY:"auto", paddingBottom:0, animation:"fadeIn .18s ease" }}>

        {tab==="home"            && <PHome me={me} balance={balance}
                                     showToast={showToast} setTab={setTab}/>}
        {tab==="enviar"          && <PEnviar me={me} balance={balance} showToast={showToast}
                                     refreshBalance={refreshBalance} setTab={setTab}/>}
        {tab==="ingresar"        && <PIngresar me={me} setTab={setTab}/>}
        {tab==="chat"            && <PChat2 me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="amigos"          && <PAMigos me={me} showToast={showToast} onBack={()=>setTab("home")}
                                     onOpenChat={()=>setTab("chat")}/>}
        {tab==="ranking"         && <ARanking me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="votar"           && <AVotaciones me={me} showToast={showToast}
                                     onBack={()=>setTab("home")} parentMode={true}/>}
        {tab==="perfil"          && <APerfil me={me} balance={balance} logout={logout}
                                     showToast={showToast} setMe={setMe} refreshBalance={refreshBalance}/>}
        {tab==="diwy"            && <DiwyHub me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="veredictos-hijo" && <PVeredictos me={me} showToast={showToast} setTab={setTab}/>}
        {tab==="sugerencias"     && <PSugerencias setTab={setTab}/>}
        {tab==="noticias"        && <ANoticias me={me} onBack={()=>setTab("home")} readOnly={true}/>}
        {tab==="asistente"       && <AAsistente me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="personalizar"    && <ATiendaCustom me={me} showToast={showToast} onBack={()=>setTab("home")}
                                     onPreviewAccent={p=>setAccent(p,true)}
                                     onClearPreview={clearPreview}
                                     onSetMode={setMode}/>}
        {tab==="vincular"        && <PVinculacion me={me} showToast={showToast} setTab={setTab}/>}
        {tab==="exchange"        && <AP2P me={me} balance={balance} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="quemar"          && <PQuemar me={me} balance={balance}
                                     refreshBalance={refreshBalance} showToast={showToast} setTab={setTab}/>}
        {tab==="contacto"        && <PContacto me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="calendario"      && <ACalendario me={me} onBack={()=>setTab("home")}/>}

      </div>

      {/* Modal QR Scanner */}
      {camOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:400,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={e=>{ if(e.target===e.currentTarget) setCamOpen(false); }}>
          <div style={{ background:theme.cardBg, borderRadius:"24px 24px 0 0",
            width:"100%", maxWidth:480, padding:"20px 24px 44px", animation:"slideUp .25s ease" }}>
            <div style={{ width:36, height:4, background:theme.isDark?"#555":"#ddd",
              borderRadius:2, margin:"0 auto 16px" }}/>
            <div style={{ fontWeight:900, fontSize:18, color:theme.txt, marginBottom:4, textAlign:"center" }}>
              Escanear QR
            </div>
            <div style={{ fontSize:12, color:theme.sub, textAlign:"center", marginBottom:16 }}>
              Apuntá la cámara al QR de tu hijo/a
            </div>
            <label style={{ display:"block", cursor:"pointer" }}>
              <input type="file" accept="image/*" capture="environment" style={{ display:"none" }}
                onChange={()=>{ setCamOpen(false); showToast("Función disponible en la app móvil"); }}/>
              <div style={{ width:200, height:200, margin:"0 auto 16px", borderRadius:20,
                border:`3px solid ${theme.primary}`, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                background:theme.isDark?"#2d2a45":"#f0f9ff" }}>
                <div style={{ fontSize:56, marginBottom:8 }}>📷</div>
                <div style={{ fontSize:12, fontWeight:700, color:theme.primary }}>Toca para abrir cámara</div>
              </div>
            </label>
            <button onClick={()=>setCamOpen(false)}
              style={{ width:"100%", background:theme.primary, border:"none", borderRadius:50,
                color:"white", padding:"13px", fontWeight:800, fontSize:14, cursor:"pointer",
                fontFamily:"Nunito,sans-serif" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      {showNav && (
        <div style={{ position:"sticky", bottom:0, width:"100%", zIndex:100 }}>
          {/* Floating camera button */}
          <div style={{ position:"absolute", top:-22, left:"50%", transform:"translateX(-50%)", zIndex:101 }}>
            <button onClick={()=>setCamOpen(true)} style={{
              width:68, height:68, borderRadius:"50%", background:theme.primary,
              border:`4px solid ${theme.navBg}`, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:26, cursor:"pointer",
              boxShadow:`0 4px 20px ${theme.primary}66`, outline:"none", transition:"background .3s" }}>
              📷
            </button>
          </div>
          <div style={{ background:theme.navBg, borderTop:`1px solid ${theme.navBord}`,
            padding:"6px 4px 20px", display:"flex", justifyContent:"space-around",
            boxShadow:"0 -2px 16px rgba(0,0,0,.12)", transition:"background .3s" }}>
            {[
              { id:"home",    icon:"🏠", label:"Inicio"  },
              { id:"chat",    icon:"💬", label:"Chat"    },
              { id:"_cam",    isCam:true },
              { id:"amigos",  icon:"👥", label:"Amigos"  },
              { id:"perfil",  icon:"👤", label:"Perfil"  },
            ].map(item => {
              if (item.isCam) return <div key="_cam" style={{ width:68, flexShrink:0 }}/>;
              const on = tab === item.id;
              return (
                <button key={item.id} onClick={()=>setTab(item.id)} style={{
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1,
                  background:"none", border:"none", cursor:"pointer",
                  color:on?theme.navActiv:theme.navInact,
                  fontFamily:"Nunito,sans-serif", padding:"3px 2px",
                  transition:"color .3s", position:"relative" }}>
                  <div style={{ width:36, height:30, borderRadius:10,
                    background:on?theme.navPill:"transparent",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    position:"relative", transition:"background .3s" }}>
                    <span style={{ fontSize:19 }}>{item.icon}</span>
                    {item.badge > 0 && (
                      <span style={{ position:"absolute", top:-2, right:-2, background:"#ef4444",
                        color:"white", borderRadius:99, fontSize:9, fontWeight:900,
                        minWidth:16, height:16, display:"flex", alignItems:"center",
                        justifyContent:"center", padding:"0 3px" }}>{item.badge}</span>
                    )}
                  </div>
                  <span style={{ fontSize:9, fontWeight:800 }}>{item.label}</span>
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

export default Padre;
