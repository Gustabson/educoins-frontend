import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api.js";
import { useTheme } from "../../ThemeContext.js";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index.js";


function ATienda({me,balance,showToast,refreshBalance}){
  const {primary:accent,isDark:dark,txt,sub:subTxt,cardBg,pageBg:bg,inputBg,inputBd} = useTheme();
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]=useState(null);
  const [revealed,setRevealed]=useState(null);
  const [lightbox,setLightbox]=useState(null);

  useEffect(()=>{
    api.storeItems().then(d=>setItems(Array.isArray(d)?d:d.data||d||[])).finally(()=>setLoading(false));
  },[]);

  const buy=async(item)=>{
    if(balance<item.precio){showToast("No tenes saldo suficiente","error");return;}
    setBuying(item.id);
    try{
      await api.purchase(item.id);
      showToast(`Compraste "${item.nombre}"! 🎉`);
      await refreshBalance();
      const updated=await api.storeItems();
      const arr=Array.isArray(updated)?updated:updated.data||updated||[];
      setItems(arr);
      const freshItem=arr.find(i=>i.id===item.id);
      if(freshItem?.mensaje_oculto) setRevealed(freshItem);
    }catch(e){showToast(e.message||"Error al comprar","error");}
    finally{setBuying(null);}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando tienda...</div>;

  return(
    <div style={{background:bg,minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Tienda"
        extra={<div style={{marginTop:8,fontSize:13,opacity:.9,fontWeight:700}}>
          Tu saldo: 🪙 {balance.toLocaleString("es-AR")}
        </div>}/>

      {/* Lightbox */}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:500,
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <img src={lightbox} alt="" style={{maxWidth:"100%",maxHeight:"80vh",
            borderRadius:16,objectFit:"contain"}}/>
          <button onClick={()=>setLightbox(null)}
            style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",
              border:"none",borderRadius:"50%",color:"white",width:40,height:40,
              cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
            ✕
          </button>
        </div>
      )}

      {/* Modal mensaje oculto */}
      {revealed&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:cardBg,borderRadius:24,padding:28,width:"100%",maxWidth:360,
            textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
            <div style={{fontSize:48,marginBottom:12}}>{revealed.icon||"🎁"}</div>
            <div style={{fontWeight:900,fontSize:16,color:txt,marginBottom:4}}>{revealed.nombre}</div>
            <div style={{fontSize:12,color:subTxt,marginBottom:16}}>Tu recompensa secreta:</div>
            <div style={{background:dark?"#2d2a45":"#faf5ff",border:`1.5px solid ${accent}44`,
              borderRadius:14,padding:"14px 16px",fontSize:13,color:txt,fontWeight:700,
              lineHeight:1.6,marginBottom:20,textAlign:"left"}}>
              🔒 {revealed.mensaje_oculto}
            </div>
            <button onClick={()=>setRevealed(null)}
              style={{background:accent,border:"none",borderRadius:50,color:"white",
                padding:"12px 32px",fontWeight:800,fontSize:14,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              Entendido!
            </button>
          </div>
        </div>
      )}

      <div style={{padding:"0 14px",marginTop:12}}>
        {items.map(item=>{
          const canBuy=balance>=item.precio;
          const sinStock=item.stock===0;
          const hasMensaje=!!item.mensaje_oculto;
          const hasImg=!!item.imagen_url;
          return(
            <div key={item.id} style={{marginBottom:12,background:cardBg,borderRadius:20,
              overflow:"hidden",opacity:sinStock?.5:1,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              {/* Imagen clicable con aspect ratio correcto */}
              {hasImg&&(
                <div onClick={()=>setLightbox(item.imagen_url)}
                  style={{cursor:"pointer",position:"relative",
                    paddingBottom:"52%", // aspect ratio 52% ≈ landscape
                    background:dark?"#2d2a45":"#f5f5f5",overflow:"hidden"}}>
                  <img src={item.imagen_url} alt={item.nombre}
                    style={{position:"absolute",inset:0,width:"100%",height:"100%",
                      objectFit:"cover",transition:"transform .2s"}}
                    onMouseEnter={e=>e.target.style.transform="scale(1.04)"}
                    onMouseLeave={e=>e.target.style.transform="scale(1)"}/>
                  <div style={{position:"absolute",bottom:8,right:8,
                    background:"rgba(0,0,0,.4)",borderRadius:99,padding:"3px 8px",
                    fontSize:10,color:"white",fontWeight:700}}>
                    🔍 Ver completa
                  </div>
                </div>
              )}
              <div style={{padding:"14px 14px",display:"flex",gap:12,alignItems:"center"}}>
                {!hasImg&&<div style={{fontSize:36,flexShrink:0}}>{item.icon||"🎁"}</div>}
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{item.nombre}</div>
                  {item.descripcion&&<div style={{fontSize:12,color:subTxt,marginTop:2}}>{item.descripcion}</div>}
                  {hasMensaje&&(
                    <div style={{marginTop:4}}>
                      <span style={{background:accent+"22",color:accent,borderRadius:99,
                        padding:"2px 8px",fontSize:10,fontWeight:800}}>🔒 Mensaje secreto incluido</span>
                    </div>
                  )}
                  {item.stock!==-1&&<div style={{fontSize:10,color:dark?"#555":"#ccc",fontWeight:700,marginTop:4}}>
                    Stock: {item.stock}
                  </div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:900,color:accent,fontSize:15,marginBottom:8}}>
                    🪙{item.precio}
                  </div>
                  <button onClick={()=>buy(item)}
                    disabled={!canBuy||sinStock||buying===item.id}
                    style={{background:sinStock?"#f0f0f0":!canBuy?"#f0f0f0":buying===item.id?"#ccc":accent,
                      color:sinStock||!canBuy?"#aaa":"white",border:"none",borderRadius:99,
                      padding:"8px 14px",fontWeight:800,fontSize:11,cursor:canBuy&&!sinStock?"pointer":"not-allowed",
                      fontFamily:"Nunito,sans-serif",whiteSpace:"nowrap"}}>
                    {sinStock?"Sin stock":!canBuy?"Sin saldo":buying===item.id?"...":"Comprar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {items.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:40,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🛒</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Tienda vacia</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ATienda;
