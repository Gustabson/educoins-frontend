import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";


function StoreItemForm({creating, editing, onClose, onSaved, showToast}){
  const [fNombre,setFNombre] = useState(editing?.nombre||"");
  const [fDesc,setFDesc]     = useState(editing?.descripcion||"");
  const [fPrecio,setFPrecio] = useState(editing?String(editing.precio):"");
  const [fStock,setFStock]   = useState(editing?.stock===-1?"":String(editing?.stock||""));
  const [fIcon,setFIcon]     = useState(editing?.icon||"🎁");
  const [fImagen,setFImagen] = useState(editing?.imagen_url||"");
  const [fMensaje,setFMensaje]=useState(editing?.mensaje_oculto||"");
  const [fActivo,setFActivo] = useState(editing?.activo!==false);
  const [saving,setSaving]   = useState(false);

  const handleImg=(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>setFImagen(ev.target.result);
    r.readAsDataURL(f);
  };

  const guardar=async()=>{
    if(!fNombre.trim()||!fPrecio){showToast("Nombre y precio requeridos","error");return;}
    setSaving(true);
    const body={
      nombre:fNombre.trim(), descripcion:fDesc.trim(),
      precio:parseInt(fPrecio)||0, stock:fStock?parseInt(fStock):-1,
      icon:fIcon, imagen_url:fImagen||null,
      mensaje_oculto:fMensaje.trim()||null, activo:fActivo,
    };
    try{
      if(creating) await api.createItem(body);
      else await api.updateItem(editing.id,body);
      showToast(creating?"Item creado ✅":"Item actualizado ✅");
      onSaved();
    }catch(e){showToast(e.message||"Error al guardar","error");}
    finally{setSaving(false);}
  };

  return(
    <Sheet title={creating?"Nuevo item":fNombre} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input value={fIcon} onChange={e=>setFIcon(e.target.value)} maxLength={4}
            style={{width:54,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px",
              fontSize:22,textAlign:"center",outline:"none",fontFamily:"Nunito,sans-serif"}}/>
          <div style={{flex:1}}><Inp val={fNombre} set={setFNombre} ph="Nombre del item"/></div>
        </div>
        <Inp val={fDesc} set={setFDesc} ph="Descripcion visible" icon="📝"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp val={fPrecio} set={setFPrecio} ph="Precio 🪙" type="number"/>
          <Inp val={fStock}  set={setFStock}  ph="Stock (vacio=∞)" type="number"/>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>📸 Imagen (opcional)</div>
          {fImagen&&(
            <div style={{position:"relative",marginBottom:8}}>
              <img src={fImagen} alt="" style={{width:"100%",height:100,objectFit:"cover",borderRadius:10}}/>
              <button onClick={()=>setFImagen("")}
                style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,.6)",border:"none",
                  borderRadius:"50%",color:"white",width:26,height:26,cursor:"pointer",fontSize:13,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          )}
          <label style={{display:"block",cursor:"pointer"}}>
            <input type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
            <div style={{border:"1.5px dashed #ddd",borderRadius:10,padding:"10px",
              textAlign:"center",fontSize:12,color:"#aaa",fontWeight:700}}>
              {fImagen?"📸 Cambiar imagen":"📱 Subir imagen del celular"}
            </div>
          </label>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#8b5cf6",marginBottom:6}}>
            🔒 Mensaje oculto (solo visible al comprar)
          </div>
          <textarea value={fMensaje} onChange={e=>setFMensaje(e.target.value)} rows={3}
            placeholder="Contraseña, codigo, instruccion secreta..."
            style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e0d4ff",
              borderRadius:10,padding:"9px 12px",fontSize:12,outline:"none",resize:"none",
              fontFamily:"Nunito,sans-serif",color:"#1a1a1a",background:"#faf5ff"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setFActivo(a=>!a)}
            style={{background:fActivo?"#10b981":"#f0f0f0",color:fActivo?"white":"#555",
              border:"none",borderRadius:99,padding:"7px 14px",fontWeight:800,fontSize:12,
              cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            {fActivo?"Activo":"Inactivo"}
          </button>
          <span style={{fontSize:11,color:"#aaa"}}>Los inactivos no aparecen en la tienda</span>
        </div>
        <button onClick={guardar} disabled={saving}
          style={{background:saving?"#ccc":"#00c1fc",border:"none",borderRadius:50,
            color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
            fontFamily:"Nunito,sans-serif"}}>
          {saving?"Guardando...":creating?"Crear item":"Guardar cambios"}
        </button>
      </div>
    </Sheet>
  );
}

function AdminTienda({showToast}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState(null); // null | {type:'create'} | {type:'edit',item}
  const [delConfirm,setDelConfirm]=useState(null);

  const load=()=>{ setLoading(true); api.storeItems().then(d=>setItems(Array.isArray(d)?d:d.data||d||[])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const eliminar=async(id)=>{
    try{ await api.deleteItem(id); setItems(prev=>prev.filter(i=>i.id!==id)); setDelConfirm(null); showToast("Item eliminado"); }
    catch(e){ showToast(e.message||"Error","error"); }
  };

  return(
    <div>
      <OHdr title="Tienda" sub="ADMIN"
        extra={<button onClick={()=>setMode({type:"create"})}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nuevo item
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {items.map(item=>(
          <div key={item.id} style={{background:"white",borderRadius:16,marginBottom:10,
            overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.06)",opacity:item.activo!==false?1:.55}}>
            {item.imagen_url&&<img src={item.imagen_url} alt={item.nombre} style={{width:"100%",height:100,objectFit:"cover"}}/>}
            <div style={{padding:"12px 14px",display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:28,flexShrink:0}}>{item.icon||"🎁"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{item.nombre}</div>
                {item.descripcion&&<div style={{fontSize:11,color:"#aaa",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.descripcion}</div>}
                <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontWeight:800,color:"#00c1fc",fontSize:12}}>🪙{item.precio}</span>
                  <span style={{fontSize:10,color:"#ddd"}}>Stock:{item.stock===-1?"∞":item.stock}</span>
                  {item.mensaje_oculto&&<span style={{background:"#8b5cf622",color:"#8b5cf6",borderRadius:99,padding:"1px 6px",fontSize:9,fontWeight:800}}>🔒 Oculto</span>}
                  {item.activo===false&&<span style={{background:"#f0f0f0",color:"#aaa",borderRadius:99,padding:"1px 6px",fontSize:9,fontWeight:800}}>Inactivo</span>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <button onClick={()=>setMode({type:"edit",item})}
                  style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"7px 12px",fontSize:11,fontWeight:800,cursor:"pointer",color:"#555",fontFamily:"Nunito,sans-serif"}}>Editar</button>
                <button onClick={()=>setDelConfirm(item.id)}
                  style={{background:"#fee2e2",border:"none",borderRadius:10,padding:"7px 12px",fontSize:11,fontWeight:800,cursor:"pointer",color:"#ef4444",fontFamily:"Nunito,sans-serif"}}>Borrar</button>
              </div>
            </div>
          </div>
        ))}
        {!loading&&items.length===0&&(
          <div style={{background:"white",borderRadius:16,padding:40,textAlign:"center",boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🛒</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Tienda vacia</div>
          </div>
        )}
      </div>

      {mode?.type==="create"&&(
        <StoreItemForm creating={true} editing={null}
          onClose={()=>setMode(null)} onSaved={()=>{setMode(null);load();}} showToast={showToast}/>
      )}
      {mode?.type==="edit"&&(
        <StoreItemForm creating={false} editing={mode.item}
          onClose={()=>setMode(null)} onSaved={()=>{setMode(null);load();}} showToast={showToast}/>
      )}

      {delConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"white",borderRadius:20,padding:"24px",width:"100%",maxWidth:340}}>
            <div style={{fontWeight:900,fontSize:16,color:"#1a1a1a",marginBottom:8,textAlign:"center"}}>Eliminar item</div>
            <div style={{fontSize:13,color:"#555",textAlign:"center",marginBottom:20}}>Esta accion no se puede deshacer.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setDelConfirm(null)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:50,padding:"12px",fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>Cancelar</button>
              <button onClick={()=>eliminar(delConfirm)} style={{flex:1,background:"#ef4444",border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTienda;
