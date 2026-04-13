import { useState, useEffect, useRef } from "react";
import { getLv } from "../../constants";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function ARanking({nameColorConfig, onBack}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, navBord} = useTheme();
  const [periodo,setPeriodo] = useState("weekly");
  const [scope,setScope]     = useState("global");
  const [classrooms,setCl]   = useState([]);
  const [selClass,setSelClass]= useState(null);
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [closing,setClosing] = useState(false);

  const PERIODO_LABEL = {daily:"📅 Diario", weekly:"📆 Semanal", monthly:"🗓️ Mensual"};

  // Countdown to next period reset
  const getNextReset = (periodo) => {
    const now = new Date();
    if(periodo==="daily"){
      const next = new Date(now); next.setHours(18,0,0,0);
      if(next<=now) next.setDate(next.getDate()+1);
      return next;
    }
    if(periodo==="weekly"){
      const day = now.getDay(); // 0=sun,5=fri
      const daysUntilFri = (5-day+7)%7||7;
      const next = new Date(now); next.setDate(now.getDate()+daysUntilFri); next.setHours(18,0,0,0);
      return next;
    }
    // monthly: day 1 of next month
    const next = new Date(now.getFullYear(), now.getMonth()+1, 1, 18, 0, 0);
    return next;
  };

  const [countdown, setCountdown] = useState("");
  useEffect(()=>{
    const tick=()=>{
      const next = getNextReset(periodo);
      const diff = next - new Date();
      if(diff<=0){setCountdown("¡Cerrando!");return;}
      const h=Math.floor(diff/3600000);
      const m=Math.floor((diff%3600000)/60000);
      const s=Math.floor((diff%60000)/1000);
      if(h>=24){
        const d=Math.floor(h/24); setCountdown(`${d}d ${h%24}h`);
      } else {
        setCountdown(`${h}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`);
      }
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[periodo]);
  const MEDAL = ["🥇","🥈","🥉"];

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({periodo,scope});
    if(scope==="aula"&&selClass) params.append("classroom_id",selClass.id);
    api.rankingData(params)
      .then(d=>setData(d.data||d))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    api.chatClassroomInfo().then(d=>{ const ci=d.data||d; if(ci?.id) setCl([ci]); }).catch(()=>{});
  },[]);
  useEffect(()=>{ load(); },[periodo, scope, selClass]);

  return(
    <div style={{background:bg, display:"flex", flexDirection:"column", height:"100%"}}>
      {/* ── Header: solo título centrado + back ─────────────── */}
      <div style={{background:accent,position:"sticky",top:0,zIndex:50,color:"white",
        overflow:"hidden", transition:"background .3s"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
        <div style={{padding:"22px 20px 18px",position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",position:"relative",minHeight:32}}>
            {onBack && (
              <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",
                borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1}}>←</button>
            )}
            <div style={{position:"absolute",left:0,right:0,textAlign:"center",
              pointerEvents:"none",fontWeight:900,fontSize:20,color:"white"}}>
              🏆 Ranking
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtros (fuera del header) ──────────────────────── */}
      <div style={{background:cardBg, borderBottom:`1px solid ${navBord}`,
        padding:"12px 14px", transition:"background .3s, border-color .3s"}}>
        {/* Período */}
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          {Object.entries(PERIODO_LABEL).map(([k,v])=>(
            <button key={k} onClick={()=>setPeriodo(k)}
              style={{flex:1, background:periodo===k?accent:"transparent",
                border:`1.5px solid ${periodo===k?accent:navBord}`,
                borderRadius:99,padding:"7px 4px",fontSize:11,fontWeight:800,
                color:periodo===k?"white":sub,
                cursor:"pointer",fontFamily:"Nunito,sans-serif",
                transition:"all .2s"}}>
              {v}
            </button>
          ))}
        </div>
        {/* Scope */}
        <div style={{display:"flex",gap:6}}>
          {[["global","🌐 Global"],["aula","🏫 Mi Aula"]].map(([k,v])=>(
            <button key={k} onClick={()=>setScope(k)}
              style={{flex:1, background:scope===k?accent:"transparent",
                border:`1.5px solid ${scope===k?accent:navBord}`,
                borderRadius:99,padding:"7px 4px",fontSize:12,fontWeight:800,
                color:scope===k?"white":sub,
                cursor:"pointer",fontFamily:"Nunito,sans-serif",
                transition:"all .2s"}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {/* Banner período + premios */}
        {data?.config?.length>0&&(
          <div style={{background:cardBg,borderRadius:16,padding:"12px 14px",marginBottom:12,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:12,color:txt,marginBottom:8}}>
              💰 Premios {PERIODO_LABEL[periodo]}
              {countdown&&<span style={{fontSize:10,opacity:.8,marginLeft:6}}>⏱ {countdown}</span>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {data.config.slice(0,5).map(c=>(
                <div key={c.posicion} style={{background:accent+"18",borderRadius:99,
                  padding:"4px 10px",fontSize:11,fontWeight:700,color:accent}}>
                  #{c.posicion} 🪙{c.premio}
                </div>
              ))}
            </div>
            {data.ya_pagado&&(
              <div style={{marginTop:8,fontSize:10,color:"#10b981",fontWeight:700}}>
                ✅ Premios de este período ya fueron distribuidos
              </div>
            )}
          </div>
        )}

        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}

        {!loading&&(data?.ranking||[]).map((u,i)=>{
          const lv = getLv(u.total_earned||0);
          const medal = i<3?MEDAL[i]:`#${i+1}`;
          return(
            <div key={u.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,
              padding:"12px 14px",background:cardBg,borderRadius:20,
              boxShadow:i===0?`0 2px 12px ${accent}33`:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
              border:i===0?`1.5px solid ${accent}44`:"none"}}>
              <div style={{width:28,textAlign:"center",fontWeight:900,
                fontSize:i<3?18:14,flexShrink:0,color:i<3?"inherit":sub}}>
                {medal}
              </div>
              <Av user={u} sz={42} avatarBg={u?.avatar_bg||null}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,
                  color:nameColorConfig?.rainbow?"transparent":nameColorConfig?.color||txt,
                  background:nameColorConfig?.rainbow?"linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6,#00c1fc)":"none",
                  WebkitBackgroundClip:nameColorConfig?.rainbow?"text":"unset",
                  WebkitTextFillColor:nameColorConfig?.rainbow?"transparent":"unset",
                }}>{displayName(u)}</div>
                <div style={{fontSize:10,color:sub}}>🪙{u.ganado_periodo.toLocaleString("es-AR")} este período</div>
              </div>
              {u.premio>0&&(
                <div style={{background:"#10b98122",color:"#10b981",borderRadius:99,
                  padding:"3px 10px",fontSize:11,fontWeight:800,flexShrink:0}}>
                  +🪙{u.premio}
                </div>
              )}
            </div>
          );
        })}

        {!loading&&(!data?.ranking||data.ranking.length===0)&&(
          <div style={{background:cardBg,borderRadius:16,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🏆</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin datos para este período</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ARanking;
