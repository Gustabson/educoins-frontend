import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../../api";
import { useTheme } from "../../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../../shared/index";


function FotoPanel({me,owned,items,balance,showToast,onRefresh,onRefreshBalance,cardBg,txt,sub,accent,inputBg}){
  const hasPermiso = owned.some(o=>o.tipo==="photo_profile");
  const fotoItem   = items.find(i=>i.tipo==="photo_profile");
  const [buying,setBuying] = useState(false);
  const [saving,setSaving] = useState(false);

  const comprar=async()=>{
    if(!fotoItem||balance<fotoItem.precio){showToast("Saldo insuficiente","error");return;}
    setBuying(true);
    try{ await api.customBuy(fotoItem.id); showToast("Foto desbloqueada!"); await onRefreshBalance(); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const subirFoto=async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>500000){showToast("Imagen muy grande (max 500KB)","error");return;}
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      setSaving(true);
      try{ await api.setFoto(ev.target.result); showToast("Foto actualizada!"); onRefresh(); }
      catch(err){showToast(err.message||"Error","error");}
      finally{setSaving(false);}
    };
    reader.readAsDataURL(file);
  };

  const quitarFoto=async()=>{
    setSaving(true);
    try{ await api.setFoto(null); showToast("Foto eliminada"); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  if(!hasPermiso) return(
    <div style={{background:cardBg,borderRadius:20,padding:24,textAlign:"center",
      boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontSize:48,marginBottom:8}}>📸</div>
      <div style={{fontWeight:800,fontSize:16,color:txt,marginBottom:6}}>Foto de Perfil</div>
      <div style={{fontSize:12,color:sub,lineHeight:1.6,marginBottom:16}}>
        Subi tu propia foto. Se verá en tu perfil, ranking y chat.
      </div>
      {fotoItem?(
        <button onClick={comprar} disabled={buying||balance<(fotoItem.precio||0)}
          style={{width:"100%",background:buying||balance<(fotoItem.precio||0)?"#ccc":accent,
            border:"none",borderRadius:50,color:"white",padding:"14px",fontWeight:900,
            fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {buying?"Comprando...":balance<(fotoItem.precio||0)
            ?`Sin saldo (necesitas 🪙${fotoItem.precio})`
            :`Comprar por 🪙${fotoItem.precio}`}
        </button>
      ):(
        <div style={{background:inputBg,borderRadius:12,padding:"12px 16px",
          fontSize:12,color:sub,textAlign:"center"}}>
          El administrador aún no habilitó este item
        </div>
      )}
    </div>
  );

  return(
    <div style={{background:cardBg,borderRadius:20,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>📸 Tu Foto de Perfil</div>
      <div style={{fontSize:12,color:sub,marginBottom:14}}>Se verá en tu perfil, ranking y chat.</div>
      {me.foto_url&&(
        <div style={{textAlign:"center",marginBottom:14}}>
          <img src={me.foto_url} alt="" style={{width:80,height:80,borderRadius:"50%",
            objectFit:"cover",border:`3px solid ${accent}`}}/>
        </div>
      )}
      <label style={{display:"block",cursor:"pointer",marginBottom:10}}>
        <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
        <div style={{border:`1.5px dashed ${accent}`,borderRadius:12,padding:"14px",
          textAlign:"center",fontSize:13,color:accent,fontWeight:700}}>
          {saving?"Subiendo...":"📱 Subir foto desde el celular"}
        </div>
      </label>
      {me.foto_url&&(
        <button onClick={quitarFoto} disabled={saving}
          style={{width:"100%",background:"#fee2e2",border:"none",borderRadius:50,
            color:"#ef4444",padding:"11px",fontWeight:800,fontSize:13,cursor:"pointer",
            fontFamily:"Nunito,sans-serif"}}>
          Quitar foto
        </button>
      )}
    </div>
  );
}

// ── Panel Título Personalizado ────────────────────────────────

export default FotoPanel;
