import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getLv, nextLv } from "../../constants";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";
import { api } from "../../api";

const MOOD_FACES = {1:"😞",2:"😟",3:"😐",4:"😊",5:"😄"};

// Module-level: survive AHome unmount/remount (switching app sections)
let _prevBalance  = null; // last balance AHome saw — for direction + countup start
let _pendingBurst = false; // burst deferred because browser tab was hidden

// ── Coin burst portal ────────────────────────────────────────
const COIN_CFG = [
  {anim:"coinFloatL", delay:"0s",    size:28, left:"6%"},
  {anim:"coinFloat",  delay:"0.5s",  size:34, left:"20%"},
  {anim:"coinFloatR", delay:"0.2s",  size:24, left:"36%"},
  {anim:"coinFloat",  delay:"1.0s",  size:30, left:"50%"},
  {anim:"coinFloatL", delay:"0.35s", size:22, left:"65%"},
  {anim:"coinFloatR", delay:"0.8s",  size:32, left:"78%"},
  {anim:"coinFloat",  delay:"1.4s",  size:26, left:"12%"},
  {anim:"coinFloatL", delay:"0.65s", size:20, left:"88%"},
  {anim:"coinFloatR", delay:"1.2s",  size:28, left:"44%"},
  {anim:"coinFloat",  delay:"0.9s",  size:22, left:"72%"},
  {anim:"coinFloatL", delay:"0.6s",  size:18, left:"30%"},
  {anim:"coinFloatR", delay:"1.1s",  size:20, left:"58%"},
];

function CoinBurst({ burstKey }) {
  if (!burstKey) return null;
  return createPortal(
    <div style={{position:"fixed",left:0,right:0,top:155,height:0,
      pointerEvents:"none",zIndex:99999,overflow:"visible"}}>
      {COIN_CFG.map((c,i) => (
        <span key={i} style={{
          position:"absolute", left:c.left, bottom:0,
          fontSize:c.size, lineHeight:1,
          animation:`${c.anim} 3.5s ease-out ${c.delay} both`,
          display:"block", willChange:"transform,opacity",
        }}>🪙</span>
      ))}
    </div>,
    document.body
  );
}

// Master list — order is the default; dest keys are stable IDs
const ALL_ITEMS = [
  ["💬","Chat",           "Personal · Aula · Global",    "#3b82f6","chat",          "badges.chat"],
  ["📅","Horarios",       "Tu calendario semanal",       "#06b6d4","horarios",      "0"],
  ["👥","Amigos",         "Social · Solicitudes · Grupos","#8b5cf6","amigos",        "badges.amigos"],
  ["🏆","Mis Premios",    "Títulos · Items · Colores",   "#f59e0b","mispremios",    "0"],
  ["💱","Exchange P2P",   "Compra y venta de EduCoins",  "#10b981","p2p",           "0"],
  ["📰","Noticias",       "Novedades de la escuela",     "#10b981","noticias",      "0"],
  ["🗳️","Votaciones",    "Participá en encuestas",      "#8b5cf6","votaciones",    "0"],
  ["🎨","Personalizar",   "Temas, emojis y más",         "#f59e0b","personalizar",  "0"],
  ["🔔","Notificaciones", "Misiones, premios y más",     "#ef4444","notificaciones","badges.notifs"],
  ["🚩","Reportes",       "Enviá un reporte",            "#64748b","reportes",      "0"],
  ["⚖️","Veredictos",     "Comunicados oficiales",       "#7f1d1d","veredictos",    "badges.veredictos"],
  ["🤖","Asistente IA",  "Preguntas sobre reglas",      "#10b981","asistente",     "0"],
  ["🗓️","Calendario",    "Eventos y fechas del año",    "#0ea5e9","calendario",    "0"],
];

function AHome({me,balance,onNav,badges={},nameColorConfig,todayMood,moodLoaded,onOpenWellness}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg} = useTheme();
  const [gridMode, setGridMode] = useState(() => {
    try { return localStorage.getItem(`${me.id}_accesos_grid`) === "1"; } catch { return false; }
  });

  // ── Balance display, direction arrow, and coin burst — all self-contained ──
  const [displayBal, setDisplayBal] = useState(balance || 0);
  const [balDir,     setBalDir]     = useState(null);
  const [burstKey,   setBurstKey]   = useState(0);
  const countupRef = useRef(null);

  // ── Reorderable shortcuts ────────────────────────────────────
  const [itemOrder,   setItemOrder]   = useState(null); // null = not loaded yet
  const [editOrder,   setEditOrder]   = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  // Load order from server on mount
  useEffect(() => {
    api.getSchedulePrefs()
      .then(prefs => {
        if (prefs?.accesos_order?.length) setItemOrder(prefs.accesos_order);
        else setItemOrder(ALL_ITEMS.map(x=>x[4]));
      })
      .catch(() => setItemOrder(ALL_ITEMS.map(x=>x[4])));
  }, []); // eslint-disable-line

  // Build ordered items array (inserting live badge values)
  const getItems = () => {
    const badgeMap = {
      "chat": badges.chat,
      "amigos": badges.amigos||0,
      "notificaciones": badges.notifs,
      "veredictos": badges.veredictos||0,
    };
    const order = itemOrder || ALL_ITEMS.map(x=>x[4]);
    return order
      .map(key => ALL_ITEMS.find(x=>x[4]===key))
      .filter(Boolean)
      .map(([ic,lb,sb,col,dest]) => [ic,lb,sb,col,dest, badgeMap[dest]||0]);
  };

  // Drag handlers — only update local state, save on "Listo"
  const onDragStart = (e, idx) => {
    dragItem.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnter = (idx) => { dragOver.current = idx; };
  const onDragEnd   = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const from = dragItem.current, to = dragOver.current;
    dragItem.current = null; dragOver.current = null;
    if (from === to) return;
    const newOrder = [...(itemOrder || ALL_ITEMS.map(x=>x[4]))];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    setItemOrder(newOrder);
  };

  const finishEditOrder = async () => {
    setEditOrder(false);
    setSavingOrder(true);
    try { await api.patchSchedulePrefs({ accesos_order: itemOrder }); }
    catch(e) { /* silent */ }
    finally { setSavingOrder(false); }
  };

  useEffect(() => {
    if (!balance) return;
    const prev = _prevBalance;
    _prevBalance = balance;

    if (prev === null || balance === prev) { setDisplayBal(balance); return; }

    const isUp = balance > prev;

    setBalDir(isUp ? "up" : "down");
    const dirTimer = setTimeout(() => setBalDir(null), 2200);

    if (countupRef.current) clearInterval(countupRef.current);
    const steps   = Math.min(Math.abs(balance - prev), 40);
    const stepVal = (balance - prev) / steps;
    const msPerStep = Math.max(8, 2000 / steps);
    let current = prev, count = 0;
    countupRef.current = setInterval(() => {
      count++;
      current += stepVal;
      if (count >= steps) { setDisplayBal(balance); clearInterval(countupRef.current); }
      else                { setDisplayBal(Math.round(current)); }
    }, msPerStep);

    if (isUp) {
      if (!document.hidden) { setBurstKey(k => k + 1); }
      else                  { _pendingBurst = true; }
    }

    return () => { clearTimeout(dirTimer); clearInterval(countupRef.current); };
  }, [balance]); // eslint-disable-line

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && _pendingBurst) {
        setBurstKey(k => k + 1);
        _pendingBurst = false;
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []); // eslint-disable-line

  const toggleGrid = () => {
    const next = !gridMode;
    setGridMode(next);
    try { localStorage.setItem(`${me.id}_accesos_grid`, next ? "1" : "0"); } catch {}
  };
  const lv=getLv(me.total_earned||0);
  const next=nextLv(me.total_earned||0);
  const prog=next?Math.min(100,((me.total_earned||0)-lv.min)/(next.min-lv.min)*100):100;
  const arrow = sub;

  const items = getItems();

  return(
    <div style={{background:pageBg,transition:"background .3s"}}>
      <div style={{background:accent,position:"sticky",top:0,zIndex:50,overflow:"hidden",
        paddingBottom:12,color:"white",transition:"background .3s"}}>
        <div style={{position:"absolute",width:260,height:260,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-80,right:-70,pointerEvents:"none"}}/>
        <div style={{padding:"22px 20px 0",position:"relative"}}>

          {/* Fila superior */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <button onClick={()=>onNav("perfil")} style={{display:"flex",alignItems:"center",gap:10,
              background:"none",border:"none",cursor:"pointer",padding:0,color:"white"}}>
              <Av user={me} sz={44} avatarBg={me?.avatar_bg||null}/>
              <div style={{fontWeight:900,fontSize:17,lineHeight:1.1}}>Hola, {me.nombre.split(" ")[0]} 👋</div>
            </button>
            <button onClick={onOpenWellness} style={{
              display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,.18)",
              border:"1.5px solid rgba(255,255,255,.3)",borderRadius:50,padding:"6px 12px",
              cursor:"pointer",color:"white",fontSize:12,fontWeight:800,fontFamily:"Nunito,sans-serif"}}>
              <span style={{fontSize:18}}>{todayMood ? MOOD_FACES[todayMood] : "🙂"}</span>
              {moodLoaded && !todayMood && <span>+3🪙</span>}
            </button>
          </div>

          {/* Caja de ahorro */}
          <div style={{background:"rgba(255,255,255,.18)",borderRadius:22,padding:"16px 20px 14px",
            border:"1.5px solid rgba(255,255,255,.25)",marginBottom:18,position:"relative",overflow:"visible"}}>
            <div style={{fontSize:11,opacity:.8,fontWeight:700,letterSpacing:".1em",marginBottom:4}}>CAJA DE AHORRO</div>
            <CoinBurst key={burstKey} burstKey={burstKey}/>
            <div style={{fontWeight:900,fontSize:38,letterSpacing:"-1.5px",lineHeight:1,
              animation:balDir==="up"?"balUp 1.4s ease":balDir==="down"?"balDown 1.4s ease":"none",
              display:"flex",alignItems:"center",gap:10}}>
              🪙 {displayBal.toLocaleString("es-AR")}
              {balDir&&(
                <span style={{fontSize:18,fontWeight:900,animation:"fadeIn .2s ease",
                  color:balDir==="up"?"#a7f3d0":"#fca5a5"}}>
                  {balDir==="up"?"▲":"▼"}
                </span>
              )}
            </div>
            <div style={{marginTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,opacity:.8,fontWeight:700,marginBottom:4}}>
                <span>{lv.icon} {lv.name}</span>
                {next?<span>→ {next.icon} {next.name} en {next.min-(me.total_earned||0)} XP</span>
                     :<span>👑 Nivel máximo</span>}
              </div>
              <div style={{background:"rgba(0,0,0,.2)",borderRadius:99,height:6}}>
                <div style={{width:prog+"%",height:"100%",background:"white",borderRadius:99,transition:"width .8s ease"}}/>
              </div>
            </div>
          </div>

          {/* 5 botones acción */}
          <div style={{display:"flex",justifyContent:"space-around",paddingBottom:4}}>
            <CircBtn icon="💸" label="Enviar"    onClick={()=>onNav("enviar")}/>
            <CircBtn icon="⬇️" label="Ingresar"  onClick={()=>onNav("ingresar")}/>
            <CircBtn icon="⚡" label="Misiones"  onClick={()=>onNav("misiones")}/>
            <CircBtn icon="🏆" label="Ranking"   onClick={()=>onNav("ranking")}/>
            <CircBtn icon="📅" label="Horarios"  onClick={()=>onNav("horarios")}/>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div style={{padding:"14px 14px 24px",background:pageBg,transition:"background .3s"}}>

        {/* Cabecera con toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontWeight:900,color:txt,fontSize:15,transition:"color .3s"}}>Accesos rápidos</div>
            {savingOrder && <div style={{fontSize:10,color:sub,fontWeight:700}}>guardando...</div>}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={editOrder ? finishEditOrder : ()=>setEditOrder(true)}
              style={{background:editOrder?(accent+"22"):(dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)"),
                border:editOrder?`1.5px solid ${accent}`:"none",
                borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",
                alignItems:"center",gap:5,fontFamily:"Nunito,sans-serif",
                fontSize:11,fontWeight:800,color:editOrder?accent:sub,transition:"all .2s"}}>
              {editOrder ? (savingOrder ? "Guardando..." : "✓ Listo") : "✦ Reordenar"}
            </button>
            <button onClick={toggleGrid}
              style={{background:dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)",border:"none",
                borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",
                alignItems:"center",gap:5,fontFamily:"Nunito,sans-serif",
                fontSize:11,fontWeight:800,color:sub,transition:"background .2s"}}>
              {gridMode ? (<><span>▤</span> Lista</>) : (<><span>⊞</span> Cuadros</>)}
            </button>
          </div>
        </div>

        {editOrder && (
          <div style={{fontSize:11,color:sub,fontWeight:700,marginBottom:8,paddingLeft:2}}>
            Mantené presionado y arrastrá para reordenar
          </div>
        )}

        {itemOrder === null ? (
          <div style={{textAlign:"center",padding:"40px 0",color:sub,fontSize:13,fontWeight:700}}>
            Cargando...
          </div>
        ) : gridMode ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {items.map(([ic,lb,sb,col,dest,badge],idx)=>(
              <div key={dest}
                draggable={editOrder}
                onDragStart={e=>onDragStart(e,idx)}
                onDragEnter={()=>onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e=>e.preventDefault()}
                onClick={editOrder?undefined:()=>onNav(dest)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:6,padding:"14px 8px",cursor:editOrder?"grab":"pointer",
                  background:cardBg,borderRadius:16,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"background .3s",position:"relative",minHeight:80,
                  opacity:editOrder?.85:1,
                  outline:editOrder?`2px dashed ${accent}22`:"none"}}>
                {editOrder && (
                  <div style={{position:"absolute",top:4,right:6,fontSize:10,color:sub,fontWeight:900}}>⠿</div>
                )}
                <div style={{position:"relative"}}>
                  <div style={{width:40,height:40,borderRadius:12,background:col+"22",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                    {ic}
                  </div>
                  {badge>0&&(
                    <div style={{position:"absolute",top:-4,right:-4,background:"#ef4444",
                      color:"white",borderRadius:99,minWidth:16,height:16,fontSize:9,
                      fontWeight:900,display:"flex",alignItems:"center",
                      justifyContent:"center",padding:"0 3px"}}>
                      {badge>9?"9+":badge}
                    </div>
                  )}
                </div>
                <div style={{fontWeight:800,fontSize:11,color:txt,textAlign:"center",
                  lineHeight:1.2,transition:"color .3s"}}>{lb}</div>
              </div>
            ))}
          </div>
        ) : (
          items.map(([ic,lb,sb,col,dest,badge],idx)=>(
            <div key={dest}
              draggable={editOrder}
              onDragStart={e=>onDragStart(e,idx)}
              onDragEnter={()=>onDragEnter(idx)}
              onDragEnd={onDragEnd}
              onDragOver={e=>e.preventDefault()}
              onClick={editOrder?undefined:()=>onNav(dest)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                cursor:editOrder?"grab":"pointer",marginBottom:8,background:cardBg,borderRadius:20,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                transition:"background .3s",position:"relative",
                opacity:editOrder?.85:1,
                outline:editOrder?`2px dashed ${accent}22`:"none"}}>
              {editOrder && (
                <div style={{fontSize:18,color:sub,flexShrink:0,marginRight:-4}}>⠿</div>
              )}
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:46,height:46,borderRadius:14,background:col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{ic}</div>
                {badge>0&&(
                  <div style={{position:"absolute",top:-4,right:-4,background:"#ef4444",
                    color:"white",borderRadius:99,minWidth:18,height:18,fontSize:10,
                    fontWeight:900,display:"flex",alignItems:"center",
                    justifyContent:"center",padding:"0 4px"}}>
                    {badge>9?"9+":badge}
                  </div>
                )}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:txt,transition:"color .3s"}}>{lb}</div>
                <div style={{fontSize:12,color:sub,marginTop:1,transition:"color .3s"}}>{sb}</div>
              </div>
              <span style={{color:arrow,fontSize:18,transition:"color .3s"}}>›</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AHome;
