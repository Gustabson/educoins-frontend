import { useState, useEffect, useRef } from "react";
import { api } from "../../api.js";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index.js";




function AdminNoticias({showToast, onBack}){
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(false);
  const [titulo,setTitulo]=useState("");
  const [cuerpo,setCuerpo]=useState("");
  const [tag,setTag]=useState("General");
  const [saving,setSaving]=useState(false);
  const TAGS=["General","Académico","Deportes","Evento","Aviso"];
  const TAG_COL={General:"#64748b",Académico:"#3b82f6",Deportes:"#10b981",Evento:"#f59e0b",Aviso:"#8b5cf6"};

  const load=()=>{ api.posts().then(d=>setPosts(d.posts||d||[])).catch(()=>[]).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const crear=async()=>{
    if(!titulo.trim()||!cuerpo.trim()){showToast("Completá título y cuerpo","error");return;}
    setSaving(true);
    try{
      await api.createPost({titulo:titulo.trim(),cuerpo:cuerpo.trim(),tag});
      showToast("Noticia publicada ✅");
      setForm(false);setTitulo("");setCuerpo("");setTag("General");
      load();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const desactivar=async(id)=>{
    if(!window.confirm("¿Desactivar esta noticia?")) return;
    try{ await api.deletePost(id); showToast("Noticia desactivada"); load(); }
    catch(e){showToast(e.message||"Error","error");}
  };

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>📰 Noticias</div>
          <button onClick={()=>setForm(f=>!f)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:99,color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
            {form?"✕ Cerrar":"+ Nueva"}
          </button>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {form&&(
          <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginBottom:10}}>Nueva noticia</div>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Título..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <textarea value={cuerpo} onChange={e=>setCuerpo(e.target.value)} placeholder="Contenido..."
              rows={4} style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",resize:"none",fontFamily:"Nunito,sans-serif"}}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {TAGS.map(t=>(
                <button key={t} onClick={()=>setTag(t)} style={{
                  border:`1.5px solid ${tag===t?TAG_COL[t]:"#e8e8e8"}`,
                  background:tag===t?TAG_COL[t]+"22":"transparent",
                  color:tag===t?TAG_COL[t]:"#666",borderRadius:99,padding:"4px 12px",
                  fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{t}</button>
              ))}
            </div>
            <button onClick={crear} disabled={saving} style={{width:"100%",background:saving?"#ccc":"#00c1fc",
              border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
              fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Publicando...":"Publicar noticia"}
            </button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {posts.map(p=>{
          const col=TAG_COL[p.tag]||"#64748b";
          return(
            <div key={p.id} style={{background:"white",borderRadius:16,marginBottom:8,overflow:"hidden",
              boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{height:4,background:col}}/>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <span style={{background:col+"22",color:col,borderRadius:99,padding:"2px 8px",
                    fontSize:10,fontWeight:800}}>{p.tag}</span>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginTop:4}}>{p.titulo}</div>
                  <div style={{fontSize:11,color:"#555",marginTop:2}}>
                    {p.autor_nombre} · {new Date(p.created_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <button onClick={()=>desactivar(p.id)} style={{background:"#fee2e2",border:"none",
                  borderRadius:8,color:"#ef4444",padding:"6px 10px",fontSize:11,fontWeight:800,
                  cursor:"pointer",flexShrink:0}}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// ADMIN — VOTACIONES
// ════════════════════════════════════════════════════════════

export default AdminNoticias;
