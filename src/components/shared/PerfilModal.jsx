import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { getLv } from "../../constants";
import { Av, displayName } from "./index";

function PerfilModal({userId, onClose, showToast}){
  const {primary:accent,isDark:dark,txt,sub,cardBg} = useTheme();
  const [perfil,setPerfil]=useState(null);
  const [loading,setLoading]=useState(true);
  const [bloqueado,setBloqueado]=useState(false);
  const [blocking,setBlocking]=useState(false);

  useEffect(()=>{
    if(!userId) return;
    setLoading(true);
    api.publicProfile(userId)
      .then(d=>{
        const data = d.data||d;
        if(data?.id) setPerfil(data);
        else setPerfil(null);
      })
      .catch(()=>setPerfil(null))
      .finally(()=>setLoading(false));
  },[userId]);

  const toggleBloquear=async()=>{
    setBlocking(true);
    try{
      if(bloqueado){ await api.unblockUser(userId); setBloqueado(false); showToast("Usuario desbloqueado"); }
      else{ await api.blockUser(userId); setBloqueado(true); showToast("Usuario bloqueado"); }
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBlocking(false);}
  };

  const lv = perfil ? getLv(perfil.total_earned||0) : null;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:500,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:cardBg,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,
        padding:"20px 20px 44px",animation:"slideUp .25s ease",maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:dark?"#555":"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>

        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}
        {!loading&&!perfil&&<div style={{textAlign:"center",padding:32,color:sub}}>Perfil no encontrado</div>}
        {perfil&&(
          <>
            {/* Avatar y nombre */}
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{margin:"0 auto 12px"}}>
                <Av user={perfil} sz={80}/>
              </div>
              <div style={{fontWeight:900,fontSize:20,color:txt}}>{displayName(perfil)}</div>
              {perfil.titulo_custom&&(
                <div style={{fontSize:12,color:accent,fontWeight:700,marginTop:2}}>{perfil.titulo_custom}</div>
              )}
              {!perfil.titulo_custom&&perfil.rol&&(
                <div style={{fontSize:11,color:sub,marginTop:2}}>
                  {perfil.rol==="teacher"?"👩‍🏫 Docente":"🎓 Alumno"}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {icon:"🪙",v:(perfil.total_earned||0).toLocaleString("es-AR"),l:"Ganadas"},
                {icon:"⚡",v:perfil.misiones||0,l:"Misiones"},
                {icon:"🔥",v:perfil.racha||0,l:"Racha"},
              ].map(s=>(
                <div key={s.l} style={{background:dark?"#2d2a45":"#f8f8f8",borderRadius:14,
                  padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontSize:18}}>{s.icon}</div>
                  <div style={{fontWeight:900,fontSize:16,color:accent}}>{s.v}</div>
                  <div style={{fontSize:10,color:sub,fontWeight:700}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Nivel */}
            {lv&&(
              <div style={{background:dark?"#2d2a45":"#f8f8f8",borderRadius:14,padding:"10px 14px",
                marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:22}}>{lv.icon}</span>
                <div>
                  <div style={{fontWeight:800,color:txt,fontSize:13}}>{lv.name}</div>
                  <div style={{fontSize:10,color:sub}}>{perfil.total_earned||0} XP total</div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div style={{display:"flex",gap:8}}>
              <button onClick={toggleBloquear} disabled={blocking}
                style={{flex:1,background:bloqueado?"#fee2e2":"#f0f0f0",
                  color:bloqueado?"#ef4444":sub,border:"none",borderRadius:50,
                  padding:"11px",fontWeight:800,fontSize:12,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                {blocking?"...":(bloqueado?"✓ Bloqueado":"Bloquear")}
              </button>
              <button onClick={onClose}
                style={{flex:1,background:accent,color:"white",border:"none",borderRadius:50,
                  padding:"11px",fontWeight:800,fontSize:12,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — ECONOMÍA (panel unificado con subsecciones tipo cards)
// Reemplaza AdminCustomShop + AdminEconomia
// ════════════════════════════════════════════════════════════

export default PerfilModal;
