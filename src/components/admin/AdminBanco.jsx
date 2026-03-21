import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";




function AdminBanco({me,showToast,onBack}){
  const [sec,setSec]     = useState("enviar"); // enviar|impuesto|historial
  const [users,setUsers] = useState([]);
  const [classrooms,setCl]= useState([]);
  const [historial,setHist]=useState([]);
  // Enviar
  const [rMode,setRMode] = useState("individual"); // individual|students|teachers|classroom|all
  const [selUser,setSelUser]=useState(null);
  const [selClass,setSelClass]=useState(null);
  const [userSearch,setUserSearch]=useState("");
  const [amount,setAmount]=useState("");
  const [desc,setDesc]=useState("");
  const [tipo,setTipo]=useState("premio");
  const [sending,setSending]=useState(false);
  const [lastResult,setLastResult]=useState(null);
  // Revertir
  const [revertId,setRevertId]=useState("");
  const [revertMotivo,setRevertMotivo]=useState("");
  const [reverting,setReverting]=useState(false);
  // Impuesto
  const [taxRMode,setTaxRMode]=useState("individual");
  const [taxUser,setTaxUser]=useState(null);
  const [taxClass,setTaxClass]=useState(null);
  const [taxSearch,setTaxSearch]=useState("");
  const [taxAmt,setTaxAmt]=useState("");
  const [taxMotivo,setTaxMotivo]=useState("");
  const [taxPer,setTaxPer]=useState("unico");
  const [taxing,setTaxing]=useState(false);

  useEffect(()=>{
    api.adminUsers().then(u=>{
      const arr=Array.isArray(u)?u:u.data||u||[];
      setUsers(arr.filter(x=>x.activo&&x.rol!=="admin"));
    }).catch(()=>{});
    api.adminClassrooms().then(d=>setCl(d.data||d||[])).catch(()=>{});
    api.auditLog().then(logs=>{
      const arr=Array.isArray(logs)?logs:logs.data||[];
      setHist(arr.filter(l=>l.action==="reward"||l.details?.tax).slice(0,15));
    }).catch(()=>{});
  },[]);

  const filtUsers=users.filter(u=>u.nombre.toLowerCase().includes(userSearch.toLowerCase())||u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filtTaxUsers=users.filter(u=>u.nombre.toLowerCase().includes(taxSearch.toLowerCase()));

  const enviar=async()=>{
    if(!amount||parseInt(amount)<=0){showToast("Ingresa un monto","error");return;}
    if(rMode==="individual"&&!selUser){showToast("Selecciona un destinatario","error");return;}
    if(rMode==="classroom"&&!selClass){showToast("Selecciona un aula","error");return;}
    setSending(true);
    try{
      const recipients = rMode==="individual"?[selUser.id]:rMode;
      const d=await api.bankTransfer({
        recipients, classroom_id:selClass?.id||null,
        amount:parseInt(amount), descripcion:desc.trim()||null, tipo
      });
      const r=d.data||d;
      setLastResult(r);
      showToast(`Enviado a ${r.ok} usuario${r.ok!==1?"s":""} correctamente`);
      setAmount("");setDesc("");setSelUser(null);
      // Recargar historial
      api.auditLog().then(logs=>{
        const arr=Array.isArray(logs)?logs:logs.data||[];
        setHist(arr.filter(l=>l.action==="reward"||l.details?.tax).slice(0,15));
      }).catch(()=>{});
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSending(false);}
  };

  const revertir=async()=>{
    if(!revertId.trim()||!revertMotivo.trim()){showToast("Completa ID y motivo","error");return;}
    setReverting(true);
    try{
      const d=await api.bankRevert({transaction_id:revertId.trim(),motivo:revertMotivo.trim()});
      const r=d.data||d;
      showToast(`Revertido: -🪙${r.amount} de ${r.user}`);
      setRevertId("");setRevertMotivo("");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setReverting(false);}
  };

  const cobrarImpuesto=async()=>{
    if(!taxAmt||parseInt(taxAmt)<=0){showToast("Ingresa un monto","error");return;}
    if(!taxMotivo.trim()){showToast("El motivo es obligatorio","error");return;}
    if(taxRMode==="individual"&&!taxUser){showToast("Selecciona un alumno","error");return;}
    if(taxRMode==="classroom"&&!taxClass){showToast("Selecciona un aula","error");return;}
    setTaxing(true);
    try{
      const recipients=taxRMode==="individual"?[taxUser.id]:taxRMode==="classroom"?"classroom":"all";
      const d=await api.applyTax({
        recipients, classroom_id:taxClass?.id||null,
        amount:parseInt(taxAmt), motivo:taxMotivo.trim(), periodicidad:taxPer
      });
      const r=d.data||d;
      showToast(`Impuesto aplicado a ${r.ok} alumno${r.ok!==1?"s":""}`);
      setTaxAmt("");setTaxMotivo("");setTaxUser(null);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setTaxing(false);}
  };

  const TIPO_OPTS=[
    {v:"premio","l":"🏆 Premio",col:"#f59e0b"},
    {v:"salario","l":"💼 Salario",col:"#3b82f6"},
    {v:"beca","l":"🎓 Beca",col:"#10b981"},
    {v:"prestamo","l":"🏦 Prestamo",col:"#8b5cf6"},
    {v:"ajuste","l":"⚖️ Ajuste",col:"#64748b"},
    {v:"otro","l":"📋 Otro",col:"#94a3b8"},
  ];
  const RMODE_OPTS=[
    {v:"individual",l:"👤 Individual"},
    {v:"students",l:"🎓 Todos los alumnos"},
    {v:"teachers",l:"👩‍🏫 Todos los docentes"},
    {v:"classroom",l:"🏫 Un aula"},
    {v:"all",l:"🌐 Todos"},
  ];

  const UserSearch=({val,setVal,onSel,excludeTeachers})=>{
    const filtered=(excludeTeachers?users.filter(u=>u.rol!=="teacher"):users)
      .filter(u=>u.nombre.toLowerCase().includes(val.toLowerCase()));
    return(
      <div>
        <input value={val} onChange={e=>{setVal(e.target.value);onSel(null);}}
          placeholder="Buscar por nombre..."
          style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
            borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",
            fontFamily:"Nunito,sans-serif",color:"#1a1a1a",marginBottom:6}}/>
        {val&&filtered.slice(0,5).map(u=>(
          <div key={u.id} onClick={()=>{onSel(u);setVal(u.nombre);}}
            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
              borderRadius:10,cursor:"pointer",background:"#f9f9f9",marginBottom:3}}>
            <Av user={u} sz={28}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:12}}>{u.nombre}</div>
              <div style={{fontSize:10,color:"#aaa"}}>{u.rol}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#10b981",color:"white",padding:"22px 16px 16px",
        position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div>
            <div style={{fontWeight:900,fontSize:20}}>🏛️ Banco Aubank</div>
            <div style={{fontSize:11,opacity:.85}}>Transferencias · Impuestos · Reversas</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["enviar","💸 Enviar"],["impuesto","⚖️ Impuesto"],["historial","📋 Historial"]].map(([id,l])=>(
            <button key={id} onClick={()=>setSec(id)}
              style={{background:sec===id?"rgba(255,255,255,.3)":"rgba(255,255,255,.12)",
                border:"1.5px solid "+(sec===id?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)"),
                borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>

        {/* ── ENVIAR ── */}
        {sec==="enviar"&&(
          <>
            {/* Info pedagógica */}
            <div style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:10,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)",borderLeft:"4px solid #10b981",fontSize:11,
              color:"#555",lineHeight:1.6}}>
              <b>Tesoro</b> crea/destruye monedas. <b>Banco</b> distribuye esas monedas a personas específicas.
              Esta separación pedagógica refleja cómo funciona la economía real.
            </div>

            {/* Tipo de envío */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>Destinatarios</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                {RMODE_OPTS.map(opt=>(
                  <button key={opt.v} onClick={()=>{setRMode(opt.v);setSelUser(null);setSelClass(null);setUserSearch("");}}
                    style={{background:rMode===opt.v?"#10b981":"#f0f0f0",
                      color:rMode===opt.v?"white":"#555",border:"none",borderRadius:99,
                      padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {rMode==="individual"&&(
                <UserSearch val={userSearch} setVal={setUserSearch} onSel={setSelUser}/>
              )}
              {rMode==="classroom"&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {classrooms.map(c=>(
                    <button key={c.id} onClick={()=>setSelClass(c)}
                      style={{background:selClass?.id===c.id?"#10b981":"#f0f0f0",
                        color:selClass?.id===c.id?"white":"#555",border:"none",borderRadius:10,
                        padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {c.nombre} ({c.total_miembros||0})
                    </button>
                  ))}
                </div>
              )}
              {rMode!=="individual"&&rMode!=="classroom"&&(
                <div style={{background:"#f0fdf4",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#10b981",fontWeight:700}}>
                  {rMode==="students"?`Se enviará a todos los alumnos activos (${users.filter(u=>u.rol==="student").length})`
                   :rMode==="teachers"?`Se enviará a todos los docentes (${users.filter(u=>u.rol==="teacher").length})`
                   :`Se enviará a todos los usuarios (${users.length})`}
                </div>
              )}
            </div>

            {/* Tipo de transferencia */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:8}}>Tipo</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {TIPO_OPTS.map(t=>(
                  <button key={t.v} onClick={()=>setTipo(t.v)}
                    style={{background:tipo===t.v?t.col:"#f0f0f0",color:tipo===t.v?"white":"#555",
                      border:"none",borderRadius:99,padding:"6px 12px",fontSize:11,fontWeight:800,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:8}}>Monto y descripcion</div>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                <input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)}
                  placeholder="🪙"
                  style={{width:80,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px",
                    fontSize:18,fontWeight:900,outline:"none",color:"#10b981",textAlign:"center",
                    fontFamily:"Nunito,sans-serif"}}/>
                {[5,10,25,50,100,200,500].map(n=>(
                  <button key={n} onClick={()=>setAmount(String(n))}
                    style={{background:amount===String(n)?"#10b981":"#f0f0f0",
                      color:amount===String(n)?"white":"#555",border:"none",borderRadius:8,
                      padding:"6px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{n}</button>
                ))}
              </div>
              <input value={desc} onChange={e=>setDesc(e.target.value)}
                placeholder="Descripcion (opcional)..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                  padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",color:"#1a1a1a"}}/>
            </div>

            <button onClick={enviar} disabled={sending||!amount}
              style={{width:"100%",background:sending||!amount?"#ccc":"#10b981",
                border:"none",borderRadius:50,color:"white",padding:"15px",fontWeight:900,
                fontSize:15,cursor:sending||!amount?"not-allowed":"pointer",
                fontFamily:"Nunito,sans-serif",boxShadow:"0 4px 16px #10b98133",marginBottom:10}}>
              {sending?"Enviando...":"Enviar transferencia"}
            </button>

            {lastResult&&(
              <div style={{background:"#f0fdf4",borderRadius:14,padding:"12px 14px",
                border:"1.5px solid #10b981",fontSize:12,color:"#10b981",fontWeight:700}}>
                ✅ Enviado a {lastResult.ok}/{lastResult.total} usuarios
                {lastResult.failed>0&&<span style={{color:"#ef4444"}}> · {lastResult.failed} fallidos</span>}
              </div>
            )}

            {/* Revertir */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginTop:12,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)",borderLeft:"4px solid #ef4444"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:4}}>↩️ Revertir transaccion</div>
              <div style={{fontSize:11,color:"#aaa",marginBottom:10}}>Pega el ID de la transaccion a revertir (visible en Audit Log)</div>
              <input value={revertId} onChange={e=>setRevertId(e.target.value)}
                placeholder="UUID de la transaccion..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #fecaca",borderRadius:12,
                  padding:"9px 14px",fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif",
                  color:"#1a1a1a",marginBottom:6,fontFamily:"monospace"}}/>
              <input value={revertMotivo} onChange={e=>setRevertMotivo(e.target.value)}
                placeholder="Motivo de la reversa..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #fecaca",borderRadius:12,
                  padding:"9px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",
                  color:"#1a1a1a",marginBottom:8}}/>
              <button onClick={revertir} disabled={reverting||!revertId||!revertMotivo}
                style={{width:"100%",background:reverting||!revertId||!revertMotivo?"#ccc":"#ef4444",
                  border:"none",borderRadius:50,color:"white",padding:"11px",fontWeight:800,
                  fontSize:13,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                {reverting?"Revirtiendo...":"Confirmar reversa"}
              </button>
            </div>
          </>
        )}

        {/* ── IMPUESTO ── */}
        {sec==="impuesto"&&(
          <>
            <div style={{background:"#fff7ed",borderRadius:14,padding:"12px 14px",marginBottom:10,
              border:"1.5px solid #fed7aa",fontSize:11,color:"#92400e",lineHeight:1.6}}>
              <b>Impuesto / Penalidad</b> — descuenta monedas de los alumnos y las devuelve al Tesoro.
              El alumno recibe una notificación con el motivo.
            </div>

            {/* Destinatarios */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>Destinatarios</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {[{v:"individual",l:"👤 Individual"},{v:"classroom",l:"🏫 Un aula"},{v:"all",l:"🎓 Todos los alumnos"}].map(opt=>(
                  <button key={opt.v} onClick={()=>{setTaxRMode(opt.v);setTaxUser(null);setTaxClass(null);setTaxSearch("");}}
                    style={{background:taxRMode===opt.v?"#f97316":"#f0f0f0",
                      color:taxRMode===opt.v?"white":"#555",border:"none",borderRadius:99,
                      padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {taxRMode==="individual"&&(
                <UserSearch val={taxSearch} setVal={setTaxSearch} onSel={setTaxUser} excludeTeachers/>
              )}
              {taxRMode==="classroom"&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {classrooms.map(c=>(
                    <button key={c.id} onClick={()=>setTaxClass(c)}
                      style={{background:taxClass?.id===c.id?"#f97316":"#f0f0f0",
                        color:taxClass?.id===c.id?"white":"#555",border:"none",borderRadius:10,
                        padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monto, motivo, periodicidad */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:8}}>Detalle</div>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <input type="number" min="1" value={taxAmt} onChange={e=>setTaxAmt(e.target.value)}
                  placeholder="🪙"
                  style={{width:80,border:"1.5px solid #fed7aa",borderRadius:12,padding:"10px",
                    fontSize:18,fontWeight:900,outline:"none",color:"#f97316",textAlign:"center",
                    fontFamily:"Nunito,sans-serif"}}/>
                {[5,10,25,50,100].map(n=>(
                  <button key={n} onClick={()=>setTaxAmt(String(n))}
                    style={{background:taxAmt===String(n)?"#f97316":"#f0f0f0",
                      color:taxAmt===String(n)?"white":"#555",border:"none",borderRadius:8,
                      padding:"6px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{n}</button>
                ))}
              </div>
              <input value={taxMotivo} onChange={e=>setTaxMotivo(e.target.value)}
                placeholder="Motivo obligatorio (visible para el alumno)..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #fed7aa",borderRadius:12,
                  padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",
                  color:"#1a1a1a",marginBottom:8}}/>
              <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Periodicidad</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[["unico","📌 Unico"],["diario","📅 Diario"],["semanal","📆 Semanal"],["mensual","🗓️ Mensual"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setTaxPer(v)}
                    style={{background:taxPer===v?"#f97316":"#f0f0f0",color:taxPer===v?"white":"#555",
                      border:"none",borderRadius:99,padding:"6px 12px",fontSize:11,fontWeight:800,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{l}</button>
                ))}
              </div>
            </div>

            <button onClick={cobrarImpuesto} disabled={taxing||!taxAmt||!taxMotivo}
              style={{width:"100%",background:taxing||!taxAmt||!taxMotivo?"#ccc":"#f97316",
                border:"none",borderRadius:50,color:"white",padding:"15px",fontWeight:900,
                fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                boxShadow:"0 4px 16px #f9731633"}}>
              {taxing?"Aplicando...":"Aplicar impuesto/penalidad"}
            </button>
          </>
        )}

        {/* ── HISTORIAL ── */}
        {sec==="historial"&&(
          <>
            <div style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:10,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)",fontSize:11,color:"#555",lineHeight:1.6}}>
              💡 Toca el icono 📋 de cualquier transaccion para copiar su ID y usarlo en "Revertir".
            </div>
            {historial.length===0&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Sin historial todavia</div>}
            {historial.map((h,i)=>{
              const txId = h.details?.transaction_id||h.id||"";
              return(
                <div key={i} style={{background:"white",borderRadius:14,padding:"12px 14px",
                  marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{h.details?.tax?"⚖️":"🏛️"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:12,color:"#1a1a1a"}}>
                        → {h.target_nombre||"Varios usuarios"}
                      </div>
                      <div style={{fontSize:10,color:"#aaa"}}>
                        {new Date(h.created_at).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                      </div>
                      {txId&&(
                        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                          <span style={{fontSize:9,color:"#bbb",fontFamily:"monospace"}}>
                            {txId.slice(0,18)}...
                          </span>
                          <button onClick={()=>{
                            navigator.clipboard?.writeText(txId);
                            showToast("ID copiado");
                          }} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,padding:2}}>📋</button>
                        </div>
                      )}
                    </div>
                    <div style={{fontWeight:900,fontSize:13,color:h.details?.tax?"#f97316":"#10b981",textAlign:"right"}}>
                      {h.details?.tax?"-":"+"} 🪙{h.details?.amount||"?"}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}


// ── StoreItemForm — componente propio para evitar re-mount bug ─

export default AdminBanco;
