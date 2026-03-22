import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../../api";
import { useTheme } from "../../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../../shared/index";


function TextoStylePanel({items,owned,ownedIds,active,subs,balance,buying,dark,cardBg,txt,sub,accent,inputBg,inputBd,equipar,comprar,suscribir,showToast,onCustomChange}){
  const [customColors,setCustomColors] = useState({
    txt: active?.custom_txt_color||"#1a1a1a",
    sub: active?.custom_sub_color||"#555555",
  });
  const [savingCustom,setSavingCustom] = useState(false);

  const customItem = items.find(i=>i.config?.custom||
    (typeof i.config==="string"&&JSON.parse(i.config||"{}").custom));
  const hasCustom = ownedIds.has(customItem?.id)||customItem?.precio===0;
  const isCustomActive = active?.text_style_id===customItem?.id;

  const saveCustomColors = async() => {
    if(!customItem) return;
    setSavingCustom(true);
    try{
      const resp = await api.customEquipText(customItem.id, customColors.txt, customColors.sub);
      if(onCustomChange) onCustomChange(resp.data||resp, "text_style");
      showToast("Colores guardados ✅");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingCustom(false);}
  };

  const diasRestantesItem=(nombre)=>{
    const s=subs.find(x=>x.item_nombre===nombre);
    if(!s) return null;
    return Math.max(0,Math.ceil((new Date(s.next_charge)-new Date())/86400000));
  };

  return(
    <div>
      <div style={{background:inputBg,borderRadius:14,padding:"10px 14px",
        marginBottom:12,fontSize:11,color:sub,lineHeight:1.6}}>
        ✍️ Estos estilos cambian los colores de títulos y texto sobre cualquier modo de pantalla.
        Se suman al fondo que elegiste.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {items.filter(i=>{
          const cfg=typeof i.config==="string"?JSON.parse(i.config||"{}"):i.config||{};
          return !cfg.custom;
        }).map(item=>{
          const isOwned = ownedIds.has(item.id)||item.precio===0;
          const isActive= active?.text_style_id===item.id;
          const isSub   = item.es_suscripcion;
          const precio  = isSub?(item.precio_mensual??item.precio):item.precio;
          const cfg     = typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
          const dias    = diasRestantesItem(item.nombre);
          // Preview del estilo con colores reales
          const previewTxt = cfg.txt&&cfg.txt!=="default"?cfg.txt:(txt);
          const previewSub = cfg.sub&&cfg.sub!=="default"?cfg.sub:(sub);
          return(
            <div key={item.id} style={{background:cardBg,borderRadius:14,overflow:"hidden",
              border:`2px solid ${isActive?accent:inputBg}`,
              opacity:!isOwned&&precio>0?.8:1}}>
              {/* Preview visual de los colores de texto */}
              <div style={{padding:"10px 10px 6px",background:dark?"#1a1828":"#f8f8f8"}}>
                <div style={{fontWeight:800,fontSize:13,color:previewTxt,marginBottom:2,lineHeight:1.2}}>
                  {item.nombre}
                </div>
                <div style={{fontSize:10,color:previewSub}}>
                  Así se verá el subtítulo
                </div>
                <div style={{display:"flex",gap:4,marginTop:4}}>
                  <div style={{width:14,height:14,borderRadius:"50%",background:previewTxt,flexShrink:0}}/>
                  <div style={{width:14,height:14,borderRadius:"50%",background:previewSub,flexShrink:0}}/>
                </div>
              </div>
              <div style={{padding:"6px 8px"}}>
                {isActive&&dias!==null&&(
                  <div style={{fontSize:9,fontWeight:700,color:dias<=3?"#ef4444":dias<=7?"#f59e0b":"#10b981",marginBottom:3}}>
                    ⏳{dias}d restantes
                  </div>
                )}
                {precio===0&&<div style={{fontSize:9,color:"#10b981",fontWeight:700,marginBottom:3}}>Gratis</div>}
                {isSub&&precio>0&&<div style={{fontSize:9,color:sub,marginBottom:3}}>🔄{item.periodo_default==="weekly"?"sem":item.periodo_default==="annual"?"año":"mes"}</div>}
                {isOwned
                  ? <button onClick={()=>equipar("text_style",item.id)}
                      style={{width:"100%",background:isActive?accent:"none",
                        border:`1px solid ${isActive?accent:inputBd}`,
                        borderRadius:99,padding:"4px 0",fontSize:10,
                        color:isActive?"white":accent,fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {isActive?"✅ Activo":"Equipar"}
                    </button>
                  : <button onClick={()=>isSub?suscribir(item,item.periodo_default||"monthly"):comprar(item)}
                      disabled={buying===item.id||precio>balance}
                      style={{width:"100%",background:precio>balance?"#f0f0f0":accent,
                        color:precio>balance?"#aaa":"white",border:"none",borderRadius:99,
                        padding:"4px 0",fontSize:10,fontWeight:800,cursor:precio>balance?"not-allowed":"pointer",
                        fontFamily:"Nunito,sans-serif"}}>
                      {buying===item.id?"...":`🪙${precio}${isSub?"/mes":""}`}
                    </button>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Item personalizado — ocupa ancho completo */}
      {customItem&&(
        <div style={{background:cardBg,borderRadius:14,marginTop:10,overflow:"hidden",
          border:`2px solid ${isCustomActive?accent:inputBg}`}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${inputBg}`}}>
            <div style={{fontWeight:800,fontSize:14,color:txt,marginBottom:2}}>🎨 Estilo Personalizado</div>
            <div style={{fontSize:11,color:sub}}>Elegí vos el color de cada elemento de texto</div>
          </div>
          {hasCustom?(
            <div style={{padding:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                {[
                  {key:"txt",label:"Títulos",desc:"Texto principal"},
                  {key:"sub",label:"Subtítulos",desc:"Texto secundario"},
                ].map(({key,label,desc})=>(
                  <div key={key}>
                    <div style={{fontSize:11,fontWeight:700,color:txt,marginBottom:4}}>{label}</div>
                    <div style={{fontSize:10,color:sub,marginBottom:6}}>{desc}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" value={customColors[key]}
                        onChange={e=>setCustomColors(c=>({...c,[key]:e.target.value}))}
                        style={{width:40,height:36,borderRadius:8,border:"none",cursor:"pointer",padding:2}}/>
                      <div style={{flex:1,height:36,borderRadius:8,background:customColors[key],
                        border:`1px solid ${inputBd}`}}/>
                    </div>
                  </div>
                ))}
              </div>
              {/* Preview */}
              <div style={{background:dark?"#2d2a45":"#f0f4ff",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                <div style={{fontWeight:800,fontSize:14,color:customColors.txt}}>Título de ejemplo</div>
                <div style={{fontSize:12,color:customColors.sub,marginTop:2}}>Subtítulo de ejemplo</div>
              </div>
              <button onClick={saveCustomColors} disabled={savingCustom}
                style={{width:"100%",background:savingCustom?"#ccc":accent,border:"none",
                  borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:13,
                  cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                {savingCustom?"Guardando...":"Guardar estilo"}
              </button>
            </div>
          ):(
            <div style={{padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:12,color:sub,marginBottom:12}}>
                Comprá el pase para poder personalizar cada color de texto
              </div>
              <button onClick={()=>customItem.es_suscripcion
                  ?suscribir(customItem,customItem.periodo_default||"monthly")
                  :comprar(customItem)}
                disabled={buying===customItem.id||(customItem.precio_mensual??customItem.precio)>balance}
                style={{background:accent,border:"none",borderRadius:50,color:"white",
                  padding:"11px 24px",fontWeight:800,fontSize:13,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                {buying===customItem.id?"Comprando..."
                  :(customItem.precio_mensual??customItem.precio)>balance
                  ?`Sin saldo (🪙${customItem.precio_mensual??customItem.precio})`
                  :`Comprar 🪙${customItem.precio_mensual??customItem.precio}/mes`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TIENDA DE PERSONALIZACIÓN
// ════════════════════════════════════════════════════════════

export default TextoStylePanel;
