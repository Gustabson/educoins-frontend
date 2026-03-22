import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { getLv, LEVELS } from "../../constants";
import { Av, displayName } from "./index";

const ROL_LABEL = { student:"Alumno", teacher:"Profe", admin:"Admin" };
const ROL_ICON  = { student:"🎓", teacher:"📚", admin:"⚙️" };

function PerfilModal({userId, onClose}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg,inputBg} = useTheme();
  const [perfil,      setPerfil]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("info");
  const [friendship,  setFriendship]  = useState(null);
  const [addingFriend,setAddingFriend]= useState(false);

  useEffect(()=>{
    if(!userId){ setLoading(false); return; }
    setLoading(true);
    setPerfil(null);
    setFriendship(null);
    setTab("info");
    Promise.all([
      api.publicProfile(userId),
      api.chatFriends().catch(()=>[]),
    ]).then(([pRes, fRes])=>{
      const data = pRes?.id ? pRes : (pRes?.data||pRes);
      setPerfil(data?.id ? data : null);
      const friends = Array.isArray(fRes) ? fRes : (fRes?.data||[]);
      const rel = friends.find(f=>f.user_id===userId||f.friend_id===userId);
      if(!rel) setFriendship('none');
      else if(rel.estado==='accepted') setFriendship('friend');
      else setFriendship('pending');
    })
    .catch(()=>{ setPerfil(null); setFriendship('none'); })
    .finally(()=>setLoading(false));
  },[userId]);

  const sendFriendRequest=async()=>{
    setAddingFriend(true);
    try{ await api.chatFriendReq(userId); setFriendship('pending'); }
    catch(e){}
    finally{ setAddingFriend(false); }
  };

  if(!userId) return null;

  const isStudent = !perfil?.rol || perfil?.rol==="student";
  const lv   = isStudent&&perfil ? getLv(perfil.total_earned||0) : null;
  const next  = lv ? LEVELS.find(l=>l.min>(perfil.total_earned||0)) : null;
  const prog  = (lv&&next)
    ? Math.min(100,((perfil.total_earned||0)-lv.min)/(next.min-lv.min)*100)
    : 100;

  const LOGROS = [
    {icon:"⚡",label:"Misionero",  desc:"Completó 10 misiones",   done:(perfil?.misiones||0)>=10},
    {icon:"🔥",label:"En racha",   desc:"7 días seguidos",         done:(perfil?.racha||0)>=7},
    {icon:"💰",label:"Ahorrista",  desc:"Acumuló 500 monedas",     done:(perfil?.total_earned||0)>=500},
    {icon:"🎓",label:"Veterano",   desc:"Completó 50 misiones",    done:(perfil?.misiones||0)>=50},
    {icon:"👑",label:"Leyenda",    desc:"2000 monedas ganadas",    done:(perfil?.total_earned||0)>=2000},
    {icon:"📅",label:"Constante",  desc:"30 check-ins totales",    done:(perfil?.checkins||0)>=30},
  ];

  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",
      flexDirection:"column",background:bg,fontFamily:"Nunito,sans-serif"}}>

      {/* Header */}
      <div style={{background:accent,color:"white",padding:"20px 16px 0",
        display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onClose}
          style={{background:"rgba(0,0,0,.2)",border:"none",borderRadius:"50%",
            width:36,height:36,color:"white",fontSize:18,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          ←
        </button>
        <span style={{fontWeight:800,fontSize:16}}>Perfil</span>
      </div>

      {/* Loading */}
      {loading&&(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:sub}}>
          Cargando...
        </div>
      )}

      {/* Error */}
      {!loading&&!perfil&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",gap:8,color:sub}}>
          <div style={{fontSize:40}}>😶</div>
          <div style={{fontWeight:700}}>Perfil no disponible</div>
        </div>
      )}

      {/* Contenido */}
      {!loading&&perfil&&(
        <div style={{flex:1,overflowY:"auto"}}>

          {/* Banner */}
          <div style={{background:accent,padding:"8px 0 24px",
            display:"flex",flexDirection:"column",alignItems:"center"}}>
            <Av user={perfil} sz={84}/>
            <div style={{marginTop:10,textAlign:"center",padding:"0 20px"}}>
              <div style={{fontWeight:900,fontSize:20,color:"white"}}>
                {displayName(perfil)}
              </div>
              {perfil.apodo&&perfil.apodo!==perfil.nombre&&(
                <div style={{fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:600}}>
                  {perfil.nombre}
                </div>
              )}
              <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:4,
                background:"rgba(0,0,0,.2)",borderRadius:99,padding:"3px 10px"}}>
                <span>{ROL_ICON[perfil.rol]||"🎓"}</span>
                <span style={{fontSize:11,fontWeight:700,color:"white"}}>
                  {ROL_LABEL[perfil.rol]||"Alumno"}
                </span>
              </div>
              {perfil.titulo_custom&&(
                <div style={{fontSize:11,color:"rgba(255,255,255,.8)",marginTop:4,fontWeight:700}}>
                  {perfil.titulo_custom}
                </div>
              )}
              {perfil.estado&&(
                <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:3,fontStyle:"italic"}}>
                  "{perfil.estado}"
                </div>
              )}
            </div>

            {/* Botón amistad */}
            {friendship!==null&&(
              <div style={{marginTop:12}}>
                {friendship==='friend'&&(
                  <div style={{background:"rgba(255,255,255,.2)",borderRadius:99,
                    padding:"7px 20px",fontSize:12,fontWeight:800,color:"white",
                    display:"inline-flex",alignItems:"center",gap:6}}>
                    👥 Amigos
                  </div>
                )}
                {friendship==='pending'&&(
                  <div style={{background:"rgba(255,255,255,.15)",borderRadius:99,
                    padding:"7px 20px",fontSize:12,fontWeight:800,
                    color:"rgba(255,255,255,.8)",display:"inline-flex",alignItems:"center",gap:6}}>
                    ⏳ Solicitud enviada
                  </div>
                )}
                {friendship==='none'&&isStudent&&(
                  <button onClick={sendFriendRequest} disabled={addingFriend}
                    style={{background:"white",border:"none",borderRadius:99,
                      padding:"7px 20px",fontSize:12,fontWeight:800,color:accent,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif",
                      opacity:addingFriend?.7:1}}>
                    {addingFriend?"Enviando...":"+ Agregar amigo"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contenido para alumnos */}
          {isStudent&&(
            <>
              {/* Barra de nivel */}
              <div style={{background:cardBg,margin:"12px 14px",borderRadius:16,
                padding:"14px 16px",boxShadow:dark?"0 2px 12px rgba(0,0,0,.3)":"0 2px 12px rgba(0,0,0,.06)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:next?10:0}}>
                  <div style={{width:42,height:42,borderRadius:12,background:accent+"20",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {lv?.icon||"🌱"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14,color:txt}}>{lv?.name||"Novato"}</div>
                    <div style={{fontSize:11,color:sub}}>{perfil.total_earned||0} 🪙 ganadas en total</div>
                  </div>
                </div>
                {next&&(
                  <>
                    <div style={{background:inputBg,borderRadius:99,height:7,overflow:"hidden"}}>
                      <div style={{width:prog+"%",height:"100%",background:accent,borderRadius:99}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                      <span style={{fontSize:10,color:sub}}>{lv?.min||0} 🪙</span>
                      <span style={{fontSize:10,color:accent,fontWeight:700}}>
                        {Math.round(prog)}% → {next.icon} {next.name}
                      </span>
                      <span style={{fontSize:10,color:sub}}>{next.min} 🪙</span>
                    </div>
                  </>
                )}
              </div>

              {/* Tabs */}
              <div style={{display:"flex",background:cardBg,
                borderBottom:`1px solid ${dark?inputBg:"#eee"}`}}>
                {[["info","📊 Stats"],["logros","🏆 Logros"]].map(([id,lbl])=>(
                  <button key={id} onClick={()=>setTab(id)}
                    style={{flex:1,padding:"11px 4px",background:"none",border:"none",
                      fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                      color:tab===id?accent:sub,
                      borderBottom:`2.5px solid ${tab===id?accent:"transparent"}`}}>
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Stats */}
              {tab==="info"&&(
                <div style={{padding:"12px 14px 24px",
                  display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {icon:"⚡",label:"Misiones",   val:perfil.misiones||0},
                    {icon:"📅",label:"Check-ins",  val:perfil.checkins||0},
                    {icon:"🔥",label:"Racha máx.", val:perfil.racha||0},
                    {icon:"🪙",label:"Total ganado",val:perfil.total_earned||0},
                  ].map(s=>(
                    <div key={s.label} style={{background:cardBg,borderRadius:16,
                      padding:"16px 14px",textAlign:"center",
                      boxShadow:dark?"0 2px 12px rgba(0,0,0,.3)":"0 2px 12px rgba(0,0,0,.06)"}}>
                      <div style={{fontSize:26,marginBottom:4}}>{s.icon}</div>
                      <div style={{fontWeight:900,fontSize:22,color:accent}}>{s.val}</div>
                      <div style={{fontSize:11,color:sub,fontWeight:700}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Logros */}
              {tab==="logros"&&(
                <div style={{padding:"12px 14px 24px"}}>
                  {LOGROS.map((l,i)=>(
                    <div key={i} style={{background:cardBg,borderRadius:14,
                      padding:"12px 14px",marginBottom:8,
                      boxShadow:dark?"0 2px 12px rgba(0,0,0,.3)":"0 2px 12px rgba(0,0,0,.06)",
                      opacity:l.done?1:.38,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:40,height:40,borderRadius:12,flexShrink:0,
                        background:l.done?accent+"22":inputBg,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                        {l.icon}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:13,color:l.done?txt:sub}}>{l.label}</div>
                        <div style={{fontSize:11,color:sub}}>{l.desc}</div>
                      </div>
                      {l.done&&<span style={{color:accent,fontWeight:900,fontSize:16}}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Para teacher/admin */}
          {!isStudent&&(
            <div style={{padding:"24px 14px",textAlign:"center",color:sub,fontSize:13}}>
              {perfil.rol==="teacher" ? "Docente de la institución" : "Administrador del sistema"}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default PerfilModal;
