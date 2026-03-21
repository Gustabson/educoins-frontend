import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api.js";
import { useTheme } from "../../ThemeContext.js";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index.js";


function AMisiones({me,balance,showToast,refreshBalance}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg} = useTheme();
  const [missions,setMissions]=useState([]);
  const [mySubmissions,setMySubmissions]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    Promise.all([api.missions(), api.allSubmissions().catch(()=>[])])
      .then(([ms, subs])=>{
        setMissions(ms);
        setMySubmissions(subs.filter?.(s=>s.student_id===me.id)||[]);
      })
      .finally(()=>setLoading(false));
  },[]);

  const submit=async(missionId)=>{
    try{
      await api.submitMission(missionId);
      showToast("¡Misión entregada! Esperá la aprobación 📬");
      const subs=await api.allSubmissions().catch(()=>[]);
      setMySubmissions(subs.filter?.(s=>s.student_id===me.id)||[]);
    }catch(e){
      showToast(e.message||"Error al entregar","error");
    }
  };

  const getSubState=(missionId)=>mySubmissions.find(s=>s.mission_id===missionId);

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando misiones...</div>;

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Misiones ⚡"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {missions.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center"}}>
            <div style={{fontSize:40}}>✨</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin misiones disponibles</div>
          </div>
        )}
        {missions.map(m=>{
          const estado=sub?.estado;
          return(
            <div key={m.id} style={{marginBottom:10,background:cardBg,borderRadius:20,padding:16,
              borderLeft:`4px solid ${DIFCOL[m.dificultad]||"#ddd"}`,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",transition:"background .3s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
                    {estado&&<Pill text={estado==="aprobada"?"✅ Aprobada":estado==="rechazada"?"❌ Rechazada":"⏳ Pendiente"}
                      col={estado==="aprobada"?"#10b981":estado==="rechazada"?"#ef4444":"#f59e0b"}/>}
                  </div>
                  <div style={{fontWeight:800,fontSize:15,color:txt}}>{m.titulo}</div>
                  {m.descripcion&&<div style={{fontSize:12,color:dark?"#888":"#888",marginTop:2}}>{m.descripcion}</div>}
                  <div style={{marginTop:8,fontWeight:800,color:dark?"#c084fc":"#00c1fc",fontSize:14}}>🪙 {m.recompensa}</div>
                </div>
                {!estado&&(
                  <PBtn label="Entregar" sm onClick={()=>submit(m.id)} color={dark?"#52177f":"#10b981"}/>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AMisiones;
