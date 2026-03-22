import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../../api";
import { useTheme } from "../../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../../shared/index";


function ApodoPanel({me,owned,items,balance,dark,showToast,onRefresh,onRefreshBalance,cardBg,txt,sub,accent,inputBg,inputBd}){
  const hasPermiso = owned.some(o=>o.tipo==="nickname");
  const nicknameItem = items.find(i=>i.tipo==="nickname");
  const [apodoVal, setApodoVal] = useState(me.apodo||"");
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);

  const comprar=async()=>{
    if(!nicknameItem){showToast("Item no disponible","error");return;}
    if(balance<nicknameItem.precio){showToast("Saldo insuficiente","error");return;}
    setBuying(true);
    try{
      await api.customBuy(nicknameItem.id);
      showToast("Permiso de apodo desbloqueado!");
      await onRefreshBalance();
      onRefresh();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const guardar=async()=>{
    if(!apodoVal.trim()){showToast("Escribe un apodo","error");return;}
    setSaving(true);
    try{
      await api.setApodo(apodoVal.trim());
      showToast("Apodo guardado!");
      onRefresh();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const borrar=async()=>{
    setSaving(true);
    try{
      await api.setApodo(null);
      setApodoVal("");
      showToast("Apodo eliminado");
      onRefresh();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  if(!hasPermiso) return(
    <div style={{background:cardBg,borderRadius:20,padding:24,
      boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:48,marginBottom:8}}>🏷️</div>
        <div style={{fontWeight:800,fontSize:16,color:txt,marginBottom:6}}>Cambio de Apodo</div>
        <div style={{fontSize:12,color:sub,lineHeight:1.6}}>
          Elegis como te ven todos en el chat, ranking y perfil.
          Tu nombre real no cambia.
        </div>
      </div>
      {nicknameItem?(
        <button onClick={comprar} disabled={buying||balance<nicknameItem.precio}
          style={{width:"100%",background:buying||balance<nicknameItem.precio?"#ccc":accent,
            border:"none",borderRadius:50,color:"white",padding:"14px",fontWeight:900,
            fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif",
            boxShadow:`0 4px 14px ${accent}44`}}>
          {buying?"Comprando...":balance<nicknameItem.precio
            ?`Sin saldo (necesitas 🪙${nicknameItem.precio})`
            :`Comprar por 🪙${nicknameItem.precio}`}
        </button>
      ):(
        <div style={{background:inputBg,borderRadius:12,padding:"12px 16px",
          fontSize:12,color:sub,textAlign:"center"}}>
          El administrador aun no habilitó este item en la tienda
        </div>
      )}
    </div>
  );

  return(
    <div style={{background:cardBg,borderRadius:20,padding:20,
      boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>🏷️ Tu Apodo</div>
      <div style={{fontSize:12,color:sub,marginBottom:14,lineHeight:1.5}}>
        Todos te veran por este apodo. Tu nombre real ({me.nombre}) no cambia.
      </div>
      {me.apodo&&(
        <div style={{background:accent+"18",borderRadius:12,padding:"10px 14px",
          marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontWeight:900,fontSize:18,color:accent}}>{me.apodo}</span>
          <span style={{fontSize:11,color:sub}}>— tu apodo actual</span>
        </div>
      )}
      <input value={apodoVal} onChange={e=>setApodoVal(e.target.value)} maxLength={30}
        placeholder="Escribe tu apodo..."
        style={{width:"100%",boxSizing:"border-box",background:inputBg,border:`1.5px solid ${inputBd}`,
          borderRadius:12,padding:"11px 14px",fontSize:15,fontWeight:700,outline:"none",
          color:txt,fontFamily:"Nunito,sans-serif",marginBottom:10}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={guardar} disabled={saving||!apodoVal.trim()}
          style={{flex:1,background:saving||!apodoVal.trim()?"#ccc":accent,border:"none",
            borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:13,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {saving?"Guardando...":"Guardar apodo"}
        </button>
        {me.apodo&&(
          <button onClick={borrar} disabled={saving}
            style={{background:inputBg,border:"none",borderRadius:50,
              color:sub,padding:"12px 16px",fontWeight:700,fontSize:12,cursor:"pointer",
              fontFamily:"Nunito,sans-serif"}}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Panel de Foto de Perfil ───────────────────────────────────

export default ApodoPanel;
