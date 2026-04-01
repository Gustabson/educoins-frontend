import { useState } from "react";
import { getLv, nextLv } from "../../constants";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";

const MOOD_FACES = {1:"😞",2:"😟",3:"😐",4:"😊",5:"😄"};

function AHome({me,balance,displayBalance,balDir,onNav,badges={},nameColorConfig,todayMood,moodLoaded,onOpenWellness}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg, navBord} = useTheme();
  const [gridMode, setGridMode] = useState(() => {
    try { return localStorage.getItem("accesos_grid") === "1"; } catch { return false; }
  });
  const toggleGrid = () => {
    const next = !gridMode;
    setGridMode(next);
    try { localStorage.setItem("accesos_grid", next ? "1" : "0"); } catch {}
  };
  const lv=getLv(me.total_earned||0);
  const next=nextLv(me.total_earned||0);
  const prog=next?Math.min(100,((me.total_earned||0)-lv.min)/(next.min-lv.min)*100):100;
  const arrow = sub;

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
            border:"1.5px solid rgba(255,255,255,.25)",marginBottom:18}}>
            <div style={{fontSize:11,opacity:.8,fontWeight:700,letterSpacing:".1em",marginBottom:4}}>CAJA DE AHORRO</div>
            <div style={{fontWeight:900,fontSize:38,letterSpacing:"-1.5px",lineHeight:1,
              animation:balDir==="up"?"balUp 1.4s ease":balDir==="down"?"balDown 1.4s ease":"none",
              display:"flex",alignItems:"center",gap:10}}>
              🪙 {(displayBalance||balance).toLocaleString("es-AR")}
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
            <CircBtn icon="👥" label="Amigos"    onClick={()=>onNav("amigos")}/>
            <CircBtn icon="⚡" label="Misiones"  onClick={()=>onNav("misiones")}/>
            <CircBtn icon="🏆" label="Ranking"   onClick={()=>onNav("ranking")}/>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div style={{padding:"14px 14px 24px",background:pageBg,transition:"background .3s"}}>

        {/* Cabecera con toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontWeight:900,color:txt,fontSize:15,transition:"color .3s"}}>Accesos rápidos</div>
          <button onClick={toggleGrid}
            style={{background:dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)",border:"none",
              borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",
              alignItems:"center",gap:5,fontFamily:"Nunito,sans-serif",
              fontSize:11,fontWeight:800,color:sub,transition:"background .2s"}}>
            {gridMode ? (
              <><span>▤</span> Lista</>
            ) : (
              <><span>⊞</span> Cuadros</>
            )}
          </button>
        </div>

        {(() => {
          const ITEMS = [
            ["💬","Chat",          "Personal · Aula · Global",    "#3b82f6","chat",          badges.chat],
            ["👥","Amigos",        "Social · Solicitudes · Grupos","#8b5cf6","amigos",        badges.amigos||0],
            ["🏆","Mis Premios",   "Títulos · Items · Colores",   "#f59e0b","mispremios",    0],
            ["💱","Exchange P2P",  "Compra y venta de EduCoins",  "#10b981","p2p",           0],
            ["📰","Noticias",      "Novedades de la escuela",     "#10b981","noticias",      0],
            ["🗳️","Votaciones",   "Participá en encuestas",      "#8b5cf6","votaciones",    0],
            ["🎨","Personalizar",  "Temas, emojis y más",         "#f59e0b","personalizar",  0],
            ["🔔","Notificaciones","Misiones, premios y más",     "#ef4444","notificaciones",badges.notifs],
            ["🚩","Reportes",      "Enviá un reporte",            "#64748b","reportes",      0],
          ];

          if (gridMode) {
            return (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {ITEMS.map(([ic,lb,sb,col,dest,badge])=>(
                  <div key={lb} onClick={()=>onNav(dest)}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",gap:6,padding:"14px 8px",cursor:"pointer",
                      background:cardBg,borderRadius:16,
                      boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                      transition:"background .3s",position:"relative",minHeight:80}}>
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
            );
          }

          return ITEMS.map(([ic,lb,sb,col,dest,badge])=>(
            <div key={lb} onClick={()=>onNav(dest)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                cursor:"pointer",marginBottom:8,background:cardBg,borderRadius:20,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                transition:"background .3s",position:"relative"}}>
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
          ));
        })()}
      </div>
    </div>
  );
}

export default AHome;
