import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function TituloCustomPanel({me,owned,items,balance,showToast,onRefresh,onRefreshBalance,cardBg,txt,sub,accent,inputBg,inputBd}){
  const hasPermiso = owned.some(o=>o.tipo==="title_custom");
  const titleItem  = items.find(i=>i.tipo==="title_custom");
  const [tituloVal,setTituloVal] = useState(me.titulo_custom||"");
  const [saving,setSaving] = useState(false);
  const [buying,setBuying] = useState(false);

  const comprar=async()=>{
    if(!titleItem||balance<titleItem.precio){showToast("Saldo insuficiente","error");return;}
    setBuying(true);
    try{ await api.customBuy(titleItem.id); showToast("Título desbloqueado!"); await onRefreshBalance(); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const guardar=async()=>{
    if(!tituloVal.trim()){showToast("Escribí un título","error");return;}
    setSaving(true);
    try{ await api.setTituloCustom(tituloVal.trim()); showToast("Título guardado!"); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const borrar=async()=>{
    setSaving(true);
    try{ await api.setTituloCustom(null); setTituloVal(""); showToast("Título eliminado"); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  if(!hasPermiso) return(
    <div style={{background:cardBg,borderRadius:20,padding:24,textAlign:"center",
      boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontSize:48,marginBottom:8}}>👑</div>
      <div style={{fontWeight:800,fontSize:16,color:txt,marginBottom:6}}>Título Personalizado</div>
      <div style={{fontSize:12,color:sub,lineHeight:1.6,marginBottom:16}}>
        Escribí tu propio título único. Máximo 20 caracteres. Se verá en tu perfil y chat.
      </div>
      {titleItem?(
        <button onClick={comprar} disabled={buying||balance<(titleItem.precio||0)}
          style={{width:"100%",background:buying||balance<(titleItem.precio||0)?"#ccc":accent,
            border:"none",borderRadius:50,color:"white",padding:"14px",fontWeight:900,
            fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {buying?"Comprando...":balance<(titleItem.precio||0)
            ?`Sin saldo (🪙${titleItem.precio})`
            :`Comprar por 🪙${titleItem.precio}`}
        </button>
      ):(
        <div style={{background:"#f0f0f0",borderRadius:12,padding:"12px 16px",fontSize:12,color:sub,textAlign:"center"}}>
          El administrador aún no habilitó este item
        </div>
      )}
    </div>
  );

  return(
    <div style={{background:cardBg,borderRadius:20,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>👑 Tu Título</div>
      <div style={{fontSize:12,color:sub,marginBottom:14}}>Máximo 20 caracteres. Visible en perfil y chat.</div>
      {me.titulo_custom&&(
        <div style={{background:accent+"18",borderRadius:12,padding:"10px 14px",marginBottom:12,
          display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontWeight:900,fontSize:16,color:accent}}>{me.titulo_custom}</span>
          <span style={{fontSize:11,color:sub}}>— tu título actual</span>
        </div>
      )}
      <input value={tituloVal} onChange={e=>setTituloVal(e.target.value.slice(0,20))} maxLength={20}
        placeholder="Ej: El más rápido..."
        style={{width:"100%",boxSizing:"border-box",background:inputBg,border:`1.5px solid ${inputBd}`,
          borderRadius:12,padding:"11px 14px",fontSize:15,fontWeight:700,outline:"none",
          color:txt,fontFamily:"Nunito,sans-serif",marginBottom:4}}/>
      <div style={{fontSize:10,color:sub,textAlign:"right",marginBottom:10}}>
        {tituloVal.length}/20 caracteres
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={guardar} disabled={saving||!tituloVal.trim()}
          style={{flex:1,background:saving||!tituloVal.trim()?"#ccc":accent,border:"none",
            borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:13,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {saving?"Guardando...":"Guardar título"}
        </button>
        {me.titulo_custom&&(
          <button onClick={borrar} disabled={saving}
            style={{background:"#f0f0f0",border:"none",borderRadius:50,color:sub,
              padding:"12px 14px",fontWeight:700,fontSize:12,cursor:"pointer",
              fontFamily:"Nunito,sans-serif"}}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Panel de Estilo de Texto ──────────────────────────────────

export default TituloCustomPanel;
