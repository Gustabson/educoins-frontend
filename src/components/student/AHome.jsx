import { useState, useEffect, useRef } from "react";
import { getLv, nextLv } from "../../constants";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";

function AHome({me,balance,displayBalance,balDir,onNav,badges={},nameColorConfig}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg} = useTheme();
  const lv=getLv(me.total_earned||0);
  const next=nextLv(me.total_earned||0);
  const prog=next?Math.min(100,((me.total_earned||0)-lv.min)/(next.min-lv.min)*100):100;
  const [checkin,setCheckin]=useState(null);
  const [doingCheckin,setDoingCheckin]=useState(false);
  const arrow = dark?"#555":"#ddd";

  useEffect(()=>{ api.checkinMe().then(d=>setCheckin(d.data||d)).catch(()=>{}); },[]);

  const hacerCheckin=async()=>{
    setDoingCheckin(true);
    try{
      const d=await api.checkin();
      const data=d.data||d;
      setCheckin(prev=>({...prev, ya_hizo_hoy:true, racha_actual:data.racha, hoy:data}));
    }catch(e){}
    finally{setDoingCheckin(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:pageBg,transition:"background .3s"}}>
      <div style={{background:accent,position:"sticky",top:0,zIndex:50,overflow:"hidden",
        paddingBottom:12,color:"white",transition:"background .3s"}}>
        <div style={{position:"absolute",width:260,height:260,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-80,right:-70,pointerEvents:"none"}}/>
        <div style={{padding:"22px 20px 0",position:"relative"}}>

          {/* Fila superior */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <button onClick={()=>onNav("perfil")} style={{display:"flex",alignItems:"center",gap:10,
              background:"none",border:"none",cursor:"pointer",padding:0,color:"white"}}>
              <Av user={me} sz={44}/>
              <div style={{fontWeight:900,fontSize:17,lineHeight:1.1}}>Hola, {me.nombre.split(" ")[0]} 👋</div>
            </button>
            <button onClick={()=>onNav("personalizar")} style={{
              display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.18)",
              border:"1.5px solid rgba(255,255,255,.3)",borderRadius:50,padding:"6px 12px",
              cursor:"pointer",color:"white",fontSize:12,fontWeight:800,fontFamily:"Nunito,sans-serif"}}>
              🎨 Tema
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
            <CircBtn icon="👥" label="Amigos"    onClick={()=>onNav("chat")}/>
            <CircBtn icon="⚡" label="Misiones"  onClick={()=>onNav("misiones")}/>
            <CircBtn icon="🏆" label="Ranking"   onClick={()=>onNav("ranking")}/>
          </div>
        </div>
      </div>

      {/* Accesos rápidos con check-in */}
      <div style={{padding:"14px 14px 8px",background:pageBg,minHeight:"60vh",transition:"background .3s"}}>

        {/* Widget check-in */}
        {checkin&&(
          <div onClick={!checkin.ya_hizo_hoy&&!doingCheckin?hacerCheckin:undefined}
            style={{marginBottom:12,borderRadius:20,padding:"14px 16px",cursor:!checkin.ya_hizo_hoy?"pointer":"default",
              background:checkin.ya_hizo_hoy
                ?(dark?"#052e16":"#f0fdf4")
                :accent+"22",
              border:`1.5px solid ${checkin.ya_hizo_hoy?"#10b981":(dark?"#7c3aed":"#00c1fc")}`,
              display:"flex",alignItems:"center",gap:12,transition:"all .2s"}}>
            <div style={{fontSize:32}}>{checkin.ya_hizo_hoy?"✅":"🔥"}</div>
            <div style={{flex:1}}>
              {checkin.ya_hizo_hoy?(
                <>
                  <div style={{fontWeight:800,fontSize:14,color:"#10b981"}}>Check-in completado</div>
                  <div style={{fontSize:12,color:sub}}>Racha: {checkin.racha_actual} día{checkin.racha_actual!==1?"s":""} 🔥</div>
                </>
              ):(
                <>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>Hacé tu check-in diario</div>
                  <div style={{fontSize:12,color:sub}}>
                    {doingCheckin?"Registrando...":
                     `Racha actual: ${checkin.racha_actual||0} días · Ganás 🪙${checkin.config?.base_reward||5}`}
                  </div>
                </>
              )}
            </div>
            {!checkin.ya_hizo_hoy&&!doingCheckin&&(
              <div style={{background:"#10b981",borderRadius:99,padding:"6px 12px",
                fontSize:11,fontWeight:800,color:"white"}}>
                +🪙{checkin.config?.base_reward||5}
              </div>
            )}
          </div>
        )}

        <div style={{fontWeight:900,color:txt,fontSize:15,marginBottom:10,transition:"color .3s"}}>Accesos rápidos</div>
        {[
          ["💬","Chat",          "Personal · Aula · Global",    "#3b82f6","chat",         badges.chat],
          ["📰","Noticias",      "Novedades de la escuela",     "#10b981","noticias",     0],
          ["🗳️","Votaciones",    "Participá en encuestas",      "#8b5cf6","votaciones",   0],
          ["🎨","Personalizar",  "Temas, emojis y más",         "#f59e0b","personalizar", 0],
          ["🔔","Notificaciones","Misiones, premios y más",     "#ef4444","notificaciones",badges.notifs],
          ["🚩","Reportes",      "Enviá un reporte",            "#64748b","reportes",     0],
        ].map(([ic,lb,sb,col,dest,badge])=>(
          <div key={lb} onClick={()=>onNav(dest)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",
              marginBottom:8,background:dark?`${accent}22`:`${accent}18`,borderRadius:20,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
              transition:"background .3s",position:"relative"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:46,height:46,borderRadius:14,background:col+"22",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{ic}</div>
              {badge>0&&(
                <div style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"white",
                  borderRadius:99,minWidth:18,height:18,fontSize:10,fontWeight:900,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>
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
        ))}
      </div>
    </div>
  );
}

export default AHome;
