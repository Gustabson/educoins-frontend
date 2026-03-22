import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function AEnviar({me,balance,showToast,refreshBalance}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, inputBd} = useTheme();
  const [friends,setFriends]   = useState([]);
  const [search,setSearch]     = useState("");
  const [results,setResults]   = useState([]);
  const [searching,setSearching]= useState(false);
  const [selected,setSelected] = useState(null);
  const [amount,setAmount]     = useState("");
  const [sending,setSending]   = useState(false);
  const [tab,setTab]           = useState("amigos"); // "amigos" | "buscar" | "manual"
  const [manualId,setManualId] = useState("");
  const debounceRef            = useRef(null);


  useEffect(()=>{
    api.chatFriends()
      .then(d=>{
        const all = d.data||d||[];
        setFriends(all.filter(f=>f.estado==='accepted'));
      }).catch(()=>{});
  },[]);

  // Búsqueda con debounce
  useEffect(()=>{
    if(tab!=="buscar") return;
    clearTimeout(debounceRef.current);
    if(search.trim().length<2){setResults([]);return;}
    debounceRef.current = setTimeout(async()=>{
      setSearching(true);
      try{
        const d = await api.chatSearch(search.trim());
        setResults(d.data||d||[]);
      }catch(e){}
      finally{setSearching(false);}
    }, 400);
  },[search,tab]);

  const selectUser = (u) => {
    setSelected({id: u.user_id||u.id, nombre: u.nombre, skin: u.skin, border: u.border});
    setAmount("");
  };

  const send = async() => {
    let toId = selected?.id;
    if(tab==="manual"){
      toId = manualId.trim();
      if(!toId){showToast("Ingresá un ID válido","error");return;}
    }
    const amt = parseInt(amount);
    if(!toId||!amt||amt<=0){showToast("Completá destinatario y monto","error");return;}
    if(amt>balance){showToast("Saldo insuficiente","error");return;}
    setSending(true);
    try{
      await api.transfer(toId, amt);
      showToast(`¡Enviaste 🪙${amt.toLocaleString("es-AR")}! 🎉`);
      await refreshBalance();
      setSelected(null);setAmount("");setManualId("");
    }catch(e){
      showToast(e.message||"Error al transferir","error");
    }finally{setSending(false);}
  };

  const TABS=[["amigos","👥 Amigos"],["buscar","🔍 Buscar"],["manual","✏️ Manual"]];

  return(
    <div style={{background:pageBg,minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Enviar 💸"
        extra={<div style={{marginTop:6,fontSize:13,opacity:.9,fontWeight:700}}>
          Saldo disponible: 🪙 {balance.toLocaleString("es-AR")}
        </div>}/>

      {/* Tabs */}
      <div style={{display:"flex",background:cardBg,borderBottom:`1px solid ${inputBg}`}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>{setTab(id);setSelected(null);setSearch("");setResults([]);}}
            style={{flex:1,padding:"11px 4px",background:"none",border:"none",
              fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif",
              color:tab===id?accent:sub,
              borderBottom:`2.5px solid ${tab===id?accent:"transparent"}`,
              transition:"all .2s"}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px"}}>

        {/* TAB AMIGOS */}
        {tab==="amigos"&&(
          <div>
            {friends.length===0&&(
              <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
                <div style={{fontSize:36,marginBottom:8}}>👥</div>
                <div style={{fontWeight:800,color:txt,marginBottom:4}}>Sin amigos agregados</div>
                <div style={{fontSize:12,color:sub}}>Andá a Chat → buscá compañeros para agregarlos</div>
              </div>
            )}
            {friends.map(f=>(
              <div key={f.friendship_id} onClick={()=>selectUser(f)}
                style={{background:selected?.id===f.user_id?accent+"22":cardBg,
                  borderRadius:16,padding:"12px 14px",marginBottom:8,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:12,
                  border:`1.5px solid ${selected?.id===f.user_id?accent:"transparent"}`,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"all .15s"}}>
                <Av user={f} sz={42}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{f.nombre}</div>
                  <div style={{fontSize:11,color:sub,marginTop:1}}>
                    {f.rol==="teacher"?"👩‍🏫 Docente":"👨‍🎓 Alumno"}
                  </div>
                </div>
                {selected?.id===f.user_id&&(
                  <span style={{color:accent,fontSize:20}}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB BUSCAR */}
        {tab==="buscar"&&(
          <div>
            <div style={{background:cardBg,borderRadius:16,padding:"10px 14px",marginBottom:10,
              display:"flex",alignItems:"center",gap:8,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <span style={{fontSize:16}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                style={{flex:1,background:"none",border:"none",outline:"none",
                  fontSize:14,color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
              {searching&&<span style={{fontSize:12,color:sub}}>...</span>}
            </div>
            {results.map(u=>(
              <div key={u.id} onClick={()=>selectUser(u)}
                style={{background:selected?.id===u.id?accent+"22":cardBg,
                  borderRadius:16,padding:"12px 14px",marginBottom:8,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:12,
                  border:`1.5px solid ${selected?.id===u.id?accent:"transparent"}`,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"all .15s"}}>
                <Av user={u} sz={42}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{u.nombre}</div>
                  <div style={{fontSize:11,color:sub}}>
                    {u.friendship_estado==="accepted"?"✓ Ya son amigos":
                     u.friendship_estado==="pending"?"⏳ Solicitud pendiente":
                     u.rol==="teacher"?"👩‍🏫 Docente":"👨‍🎓 Alumno"}
                  </div>
                </div>
                {selected?.id===u.id&&<span style={{color:accent,fontSize:20}}>✓</span>}
              </div>
            ))}
            {search.length>=2&&results.length===0&&!searching&&(
              <div style={{textAlign:"center",color:sub,padding:24,fontSize:13}}>Sin resultados para "{search}"</div>
            )}
          </div>
        )}

        {/* TAB MANUAL */}
        {tab==="manual"&&(
          <div style={{background:cardBg,borderRadius:20,padding:16,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,color:txt,marginBottom:4}}>ID del destinatario</div>
            <div style={{fontSize:11,color:sub,marginBottom:10}}>
              Pedile a tu compañero su ID desde la pantalla "Ingresar"
            </div>
            <input value={manualId} onChange={e=>setManualId(e.target.value)}
              placeholder="Pegá el ID aquí..."
              style={{width:"100%",boxSizing:"border-box",background:inputBg,
                border:`1.5px solid ${inputBd}`,borderRadius:12,padding:"11px 14px",
                fontSize:13,outline:"none",color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600,
                marginBottom:0}}/>
          </div>
        )}

        {/* Monto + confirmar — aparece cuando hay destinatario seleccionado o manual */}
        {(selected||(tab==="manual"&&manualId.trim()))&&(
          <div style={{background:cardBg,borderRadius:20,padding:16,marginTop:10,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            {selected&&(
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,
                padding:"10px 12px",background:dark?"rgba(255,255,255,.05)":"#f7f7f7",borderRadius:12}}>
                <Av user={selected} sz={36}/>
                <div>
                  <div style={{fontSize:11,color:sub,fontWeight:700}}>Enviando a</div>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{selected.nombre}</div>
                </div>
              </div>
            )}
            <div style={{fontWeight:800,color:txt,marginBottom:8}}>¿Cuántas monedas?</div>
            <div style={{background:inputBg,border:`1.5px solid ${inputBd}`,borderRadius:14,
              display:"flex",alignItems:"center",padding:"4px 14px",marginBottom:12}}>
              <span style={{fontSize:20,marginRight:8}}>🪙</span>
              <input value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/,""))}
                placeholder="0" type="number" min="1"
                style={{flex:1,background:"none",border:"none",outline:"none",fontSize:22,
                  fontWeight:900,color:accent,fontFamily:"Nunito,sans-serif"}}/>
            </div>
            {/* Atajos de monto */}
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {[10,50,100,500].map(n=>(
                <button key={n} onClick={()=>setAmount(String(n))}
                  style={{flex:1,background:amount===String(n)?accent:"transparent",
                    color:amount===String(n)?"white":accent,
                    border:`1.5px solid ${accent}`,borderRadius:99,
                    padding:"5px",fontSize:12,fontWeight:800,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  {n}
                </button>
              ))}
            </div>
            <button onClick={send} disabled={sending||!amount||parseInt(amount)<=0}
              style={{width:"100%",background:sending?"#ccc":accent,border:"none",
                borderRadius:50,color:"white",padding:"13px",fontWeight:900,fontSize:15,
                cursor:sending?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif",
                boxShadow:sending?"none":`0 4px 16px ${accent}55`}}>
              {sending?"Enviando...":"Confirmar envío 💸"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── INGRESAR — CVU + QR ───────────────────────────────────────

export default AEnviar;
