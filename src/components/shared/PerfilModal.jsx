import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { getLv, LEVELS } from "../../constants";
import { Av, displayName } from "./index";

function PerfilModal({userId, onClose, showToast}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg} = useTheme();
  const [perfil,setPerfil]   = useState(null);
  const [loading,setLoading] = useState(true);
  const [tab,setTab]         = useState("info");

  useEffect(()=>{
    if(!userId){ setLoading(false); return; }
    setLoading(true);
    api.publicProfile(userId)
      .then(d=>{
        const data = d?.id ? d : (d?.data || d);
        setPerfil(data?.id ? data : null);
      })
      .catch(()=>{ setPerfil(null); })
      .finally(()=>setLoading(false));
  },[userId]);

  if(!userId) return null;

  const lv   = perfil ? getLv(perfil.total_earned||0) : null;
  const next  = perfil ? LEVELS.find(l=>l.min>(perfil.total_earned||0)) : null;
  const prog  = (lv&&next) ? Math.min(100,((perfil.total_earned||0)-lv.min)/(next.min-lv.min)*100) : 100;

  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",
      flexDirection:"column",background:bg,fontFamily:"Nunito,sans-serif"}}>

      <div style={{background:accent,color:"white",padding:"16px 16px 0",
        display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onClose}
          style={{background:"rgba(0,0,0,.2)",border:"none",borderRadius:"50%",
            width:34,height:34,color:"white",fontSize:20,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          ←
        </button>
        <div style={{fontWeight:800,fontSize:16}}>Perfil</div>
      </div>

      {loading&&(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:sub}}>
          Cargando...
        </div>
      )}

      {!loading&&!perfil&&(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
          flexDirection:"column",gap:8,color:sub}}>
          <div style={{fontSize:40}}>😶</div>
          <div style={{fontWeight:700}}>Perfil no disponible</div>
        </div>
      )}

      {!loading&&perfil&&(
        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{background:accent,padding:"0 0 28px",
            display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{width:88,height:88,borderRadius:"50%",
              border:"3px solid white",marginTop:8,overflow:"hidden",
              boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
              <Av user={perfil} sz={88}/>
            </div>
            <div style={{marginTop:10,textAlign:"center",paddingBottom:8}}>
              <div style={{fontWeight:900,fontSize:20,color:"white"}}>
                {displayName(perfil)}
              </div>
              {perfil.apodo&&perfil.apodo!==perfil.nombre&&(
                <div style={{fontSize:12,color:"rgba(255,255,255,.75)",fontWeight:600}}>
                  {perfil.nombre}
                </div>
              )}
              {perfil.titulo_custom&&(
                <div style={{fontSize:11,color:"rgba(255,255,255,.85)",marginTop:2,fontWeight:700}}>
                  {perfil.titulo_custom}
                </div>
              )}
            </div>
          </div>

          <div style={{background:cardBg,margin:"12px 14px",borderRadius:16,
            padding:"14px 16px",boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:44,height:44,borderRadius:14,background:accent+"22",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {lv?.icon||"⭐"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:txt}}>
                  Nivel {lv?.level||1} — {lv?.label||"Novato"}
                </div>
                <div style={{fontSize:11,color:sub}}>
                  {perfil.total_earned||0} 🪙 ganadas en total
                </div>
              </div>
            </div>
            {next&&(
              <>
                <div style={{background:dark?"#2d2a45":"#f0f0f0",borderRadius:99,height:8,overflow:"hidden"}}>
                  <div style={{width:prog+"%",height:"100%",background:accent,borderRadius:99}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:10,color:sub,fontWeight:600}}>{lv?.min||0} 🪙</span>
                  <span style={{fontSize:10,color:accent,fontWeight:700}}>{Math.round(prog)}% → Nv {(lv?.level||0)+1}</span>
                  <span style={{fontSize:10,color:sub,fontWeight:600}}>{next.min} 🪙</span>
                </div>
              </>
            )}
          </div>

          <div style={{display:"flex",background:cardBg,borderBottom:`1px solid ${dark?"#2d2a45":"#eee"}`}}>
            {[["info","📊 Stats"],["logros","🏆 Logros"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{flex:1,padding:"11px 4px",background:"none",border:"none",
                  fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                  color:tab===id?accent:sub,
                  borderBottom:`2.5px solid ${tab===id?accent:"transparent"}`}}>
                {label}
              </button>
            ))}
          </div>

          {tab==="info"&&(
            <div style={{padding:"12px 14px 24px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  {icon:"🪙",label:"Balance",val:perfil.balance??0},
                  {icon:"⚡",label:"Misiones",val:perfil.misiones||0},
                  {icon:"📅",label:"Check-ins",val:perfil.checkins||0},
                  {icon:"🔥",label:"Racha máx.",val:perfil.racha||0},
                ].map(s=>(
                  <div key={s.label} style={{background:cardBg,borderRadius:16,
                    padding:"16px 14px",textAlign:"center",
                    boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
                    <div style={{fontSize:28,marginBottom:4}}>{s.icon}</div>
                    <div style={{fontWeight:900,fontSize:22,color:accent}}>{s.val}</div>
                    <div style={{fontSize:11,color:sub,fontWeight:700}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="logros"&&(
            <div style={{padding:"12px 14px 24px"}}>
              {[
                {icon:"⚡",label:"Misionero",desc:"Completó 10 misiones",done:(perfil.misiones||0)>=10},
                {icon:"🔥",label:"En racha",desc:"7 días seguidos de check-in",done:(perfil.racha||0)>=7},
                {icon:"💰",label:"Ahorrista",desc:"Acumuló 500 monedas",done:(perfil.total_earned||0)>=500},
                {icon:"🎓",label:"Veterano",desc:"Completó 50 misiones",done:(perfil.misiones||0)>=50},
                {icon:"👑",label:"Leyenda",desc:"Ganó 2000 monedas en total",done:(perfil.total_earned||0)>=2000},
                {icon:"📅",label:"Constante",desc:"30 check-ins totales",done:(perfil.checkins||0)>=30},
              ].map((l,i)=>(
                <div key={i} style={{background:cardBg,borderRadius:16,
                  padding:"14px 16px",marginBottom:8,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  opacity:l.done?1:.4,display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:14,
                    background:l.done?accent+"22":dark?"#2d2a45":"#f0f0f0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                    {l.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14,color:l.done?txt:sub}}>{l.label}</div>
                    <div style={{fontSize:11,color:sub}}>{l.desc}</div>
                  </div>
                  {l.done&&<span style={{color:accent,fontSize:18,fontWeight:900}}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PerfilModal;
