import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";
import { TAG_COLORS, TAG_LIST } from "../../constants";

function ANoticias({me,onBack}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, navBord} = useTheme();
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [sel,setSel]=useState(null);
  const [tagFilt,setTagFilt]=useState("Todos");


  useEffect(()=>{
    setLoading(true);
    api.posts(tagFilt==="Todos"?null:tagFilt)
      .then(d=>setPosts(d.posts||[]))
      .catch(()=>setPosts([]))
      .finally(()=>setLoading(false));
  },[tagFilt]);

  if(sel) return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <div style={{background:accent,padding:"22px 16px 20px",color:"white",
        display:"flex",alignItems:"flex-start",gap:12}}>
        <button onClick={()=>setSel(null)} style={{background:"rgba(255,255,255,.2)",border:"none",
          borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>←</button>
        <div>
          <span style={{background:"rgba(255,255,255,.2)",borderRadius:99,padding:"3px 10px",
            fontSize:11,fontWeight:800}}>{sel.tag}</span>
          <div style={{fontWeight:900,fontSize:19,marginTop:6,lineHeight:1.2}}>{sel.titulo}</div>
          <div style={{fontSize:11,opacity:.8,marginTop:4}}>
            {sel.autor_nombre} · {new Date(sel.created_at).toLocaleDateString("es-AR")}
          </div>
        </div>
      </div>
      <div style={{padding:"20px 16px"}}>
        <div style={{background:cardBg,borderRadius:20,padding:"20px 18px",
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <p style={{color:txt,fontSize:14,lineHeight:1.8,margin:0,fontWeight:600}}>{sel.cuerpo}</p>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="📰 Noticias" onBack={onBack}/>
      {/* Filtro de tags */}
      <div style={{display:"flex",gap:6,padding:"10px 14px 0",overflowX:"auto"}}>
        {TAG_LIST.map(t=>(
          <button key={t} onClick={()=>setTagFilt(t)} style={{
            background:tagFilt===t?accent:"transparent",
            border:`1.5px solid ${tagFilt===t?dark?"#52177f":"#00c1fc":navBord}`,
            color:tagFilt===t?"white":sub,
            borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:800,cursor:"pointer",
            whiteSpace:"nowrap",fontFamily:"Nunito,sans-serif",transition:"all .2s"}}>
            {t}
          </button>
        ))}
      </div>
      <div style={{padding:"10px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:"#aaa"}}>Cargando noticias...</div>}
        {!loading&&posts.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>📰</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin noticias por ahora</div>
          </div>
        )}
        {posts.map(n=>{
          const col=TAG_COLORS[n.tag]||"#64748b";
          return(
            <div key={n.id} onClick={()=>setSel(n)}
              style={{background:cardBg,borderRadius:20,marginBottom:10,overflow:"hidden",
                cursor:"pointer",boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{height:5,background:col}}/>
              <div style={{padding:"13px 16px"}}>
                <span style={{background:col+"22",color:col,borderRadius:99,padding:"2px 9px",
                  fontSize:10,fontWeight:800}}>{n.tag}</span>
                <div style={{fontWeight:800,fontSize:14,color:txt,marginTop:5,lineHeight:1.2}}>{n.titulo}</div>
                <div style={{fontSize:12,color:sub,marginTop:4,lineHeight:1.4}}>
                  {n.cuerpo.substring(0,80)}{n.cuerpo.length>80?"...":""}
                </div>
                <div style={{fontSize:10,color:sub,marginTop:6}}>
                  {n.autor_nombre} · {new Date(n.created_at).toLocaleDateString("es-AR")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── VOTACIONES ────────────────────────────────────────────────

export default ANoticias;
