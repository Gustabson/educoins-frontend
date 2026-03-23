import { useState, useEffect, useRef } from "react";
import { getLv } from "../../constants";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function ARanking({nameColorConfig}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg} = useTheme();
  const [periodo,setPeriodo] = useState("weekly");
  const [scope,setScope]     = useState("global");
  const [classrooms,setCl]   = useState([]);
  const [selClass,setSelClass]= useState(null);
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [closing,setClosing] = useState(false);

  const PERIODO_LABEL = {daily:"📅 Hoy", weekly:"📆 Semana", monthly:"🗓️ Mes"};
  const MEDAL = ["🥇","🥈","🥉"];

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({periodo,scope});
    if(scope==="aula"&&selClass) params.append("classroom_id",selClass.id);
    apiFetch(`/ranking/live?${params}`)
      .then(d=>setData(d.data||d))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    api.chatClassroomInfo().then(d=>{ const ci=d.data||d; if(ci?.id) setCl([ci]); }).catch(()=>{});
  },[]);
  useEffect(()=>{ load(); },[periodo, scope, selClass]);

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      {/* Header con tabs */}
      <div style={{background:accent,position:"sticky",top:0,zIndex:50,color:"white",
        paddingBottom:12}}>
        <div style={{padding:"20px 16px 8px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,fontWeight:900,fontSize:20}}>🏆 Ranking</div>
        </div>

        {/* Período */}
        <div style={{display:"flex",gap:6,padding:"0 14px",marginBottom:8}}>
          {Object.entries(PERIODO_LABEL).map(([k,v])=>(
            <button key={k} onClick={()=>setPeriodo(k)}
              style={{flex:1,background:periodo===k?"rgba(255,255,255,.3)":"rgba(255,255,255,.15)",
                border:`1.5px solid ${periodo===k?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`,
                borderRadius:99,padding:"7px 4px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {v}
            </button>
          ))}
        </div>

        {/* Scope */}
        <div style={{display:"flex",gap:6,padding:"0 14px"}}>
          {[["global","🌐 Global"],["aula","🏫 Mi Aula"]].map(([k,v])=>(
            <button key={k} onClick={()=>setScope(k)}
              style={{flex:1,background:scope===k?"rgba(255,255,255,.3)":"rgba(255,255,255,.15)",
                border:`1.5px solid ${scope===k?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`,
                borderRadius:99,padding:"7px 4px",fontSize:12,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Banner período + premios */}
        {data?.config?.length>0&&(
          <div style={{background:cardBg,borderRadius:16,padding:"12px 14px",marginBottom:12,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:12,color:txt,marginBottom:8}}>
              💰 Premios {PERIODO_LABEL[periodo]}
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
