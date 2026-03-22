import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function AIngresar({me, onBack}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg} = useTheme();
  const [copied,setCopied] = useState(false);

  // CVU = primeros 8 chars del ID del usuario, formateado
  const cvu = me.id.replace(/-/g,"").toUpperCase().slice(0,22);
  const cvuFormateado = cvu.match(/.{1,4}/g)?.join(" ") || cvu;

  const copiar = () => {
    navigator.clipboard?.writeText(cvu).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    }).catch(()=>{
      // Fallback para móvil
      const el = document.createElement("textarea");
      el.value = cvu;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    });
  };

  // QR visual generado con CSS — matriz de 21x21 con patrón único basado en el ID
  const qrData = me.id.replace(/-/g,"");
  const QR_SIZE = 21;
  const qrMatrix = Array.from({length:QR_SIZE}, (_, row) =>
    Array.from({length:QR_SIZE}, (_, col) => {
      // Patrones fijos de esquinas (finder patterns)
      const inTL = row<7&&col<7;
      const inTR = row<7&&col>13;
      const inBL = row>13&&col<7;
      if(inTL||inTR||inBL){
        const lr=inTL?row:(inTR?row:row-14);
        const lc=inTL?col:(inTR?col-14:col);
        if(lr===0||lr===6||lc===0||lc===6) return 1;
        if(lr>=2&&lr<=4&&lc>=2&&lc<=4) return 1;
        return 0;
      }
      // Timing patterns
      if(row===6||col===6) return (row+col)%2===0?1:0;
      // Datos — generados del ID del usuario
      const idx = (row*QR_SIZE+col)%qrData.length;
      const charCode = qrData.charCodeAt(idx);
      return (charCode+(row*7)+(col*3))%3===0?1:0;
    })
  );

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="⬇️ Ingresar" onBack={onBack}
        extra={<div style={{fontSize:12,opacity:.85,marginTop:4,fontWeight:600}}>
          Tu código para recibir monedas
        </div>}/>

      <div style={{padding:"16px 14px",display:"flex",flexDirection:"column",gap:12}}>

        {/* QR Code */}
        <div style={{background:cardBg,borderRadius:24,padding:"24px 20px",textAlign:"center",
          boxShadow:dark?"0 2px 16px rgba(0,0,0,.4)":"0 2px 16px rgba(0,0,0,.08)"}}>
          <div style={{fontSize:13,fontWeight:700,color:sub,marginBottom:16}}>
            Mostrá este QR para recibir monedas
          </div>

          {/* QR Visual */}
          <div style={{display:"inline-block",background:cardBg,padding:12,borderRadius:16,
            boxShadow:"0 2px 12px rgba(0,0,0,.12)"}}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${QR_SIZE},10px)`,gap:0}}>
              {qrMatrix.flat().map((cell,i)=>(
                <div key={i} style={{
                  width:10,height:10,
                  background:cell?"#1a1a1a":"white"
                }}/>
              ))}
            </div>
          </div>

          <div style={{marginTop:16,fontWeight:900,fontSize:13,color:txt}}>{me.nombre}</div>
          <div style={{fontSize:11,color:sub,marginTop:2}}>ID: {me.id.slice(0,8).toUpperCase()}...</div>
        </div>

        {/* CVU */}
        <div style={{background:cardBg,borderRadius:20,padding:"18px 16px",
          boxShadow:dark?"0 2px 16px rgba(0,0,0,.4)":"0 2px 16px rgba(0,0,0,.08)"}}>
          <div style={{fontSize:11,fontWeight:800,color:sub,letterSpacing:".08em",marginBottom:8}}>
            TU ID ÚNICO (CVU)
          </div>
          <div style={{fontWeight:900,fontSize:17,color:txt,letterSpacing:"2px",
            fontFamily:"monospace",marginBottom:14,wordBreak:"break-all"}}>
            {cvuFormateado}
          </div>
          <button onClick={copiar} style={{
            width:"100%",background:copied?"#10b981":accent,border:"none",
            borderRadius:50,color:"white",padding:"13px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif",transition:"background .3s",
            boxShadow:`0 4px 14px ${copied?"#10b981":"#00c1fc"}44`}}>
            {copied?"✓ Copiado!":"📋 Copiar ID"}
          </button>
        </div>

        {/* Instrucciones */}
        <div style={{background:cardBg,borderRadius:20,padding:"16px",
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:10}}>¿Cómo recibir monedas?</div>
          {[
            ["1","Compartí tu QR o tu ID con quien te quiera enviar monedas"],
            ["2","En la pantalla Enviar, el otro alumno pega tu ID en la sección Manual"],
            ["3","Las monedas llegan instantáneamente a tu cuenta"],
          ].map(([n,t])=>(
            <div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:accent+"22",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:900,color:accent,flexShrink:0}}>{n}</div>
              <div style={{fontSize:12,color:sub,lineHeight:1.5}}>{t}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default AIngresar;
