'use client';

import {useState} from 'react';
import {Check,Copy,QrCode} from 'lucide-react';
import {PAYMENT_PIX} from '@/lib/pix-payment';
import './payment-pix.css';

export function PaymentPix(){
 const [copied,setCopied]=useState(false),[manual,setManual]=useState(false);
 async function copy(){
  try{await navigator.clipboard.writeText(PAYMENT_PIX.payload);setCopied(true);setManual(false);}
  catch{setCopied(false);setManual(true);}
 }
 return <section className="payment-pix" aria-labelledby="payment-pix-title">
  <div className="payment-pix-info">
   <span className="eyebrow"><QrCode size={16}/> PAGUE COM PIX</span>
   <h2 id="payment-pix-title">Seu Pix, sem complicação.</h2>
   <strong className="payment-pix-amount">{PAYMENT_PIX.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong>
   <dl><div><dt>Recebedor</dt><dd>{PAYMENT_PIX.recipient}</dd></div><div><dt>Banco</dt><dd>{PAYMENT_PIX.bank}</dd></div></dl>
   <p>Escaneie o QR Code ou copie o código e cole na opção Pix Copia e Cola do seu banco.</p>
   <button type="button" className="primary" onClick={()=>void copy()}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?'Pix copiado!':'Copiar Pix'}</button>
   {copied&&<p role="status">Código copiado. Cole no aplicativo do seu banco.</p>}
   {manual&&<label className="payment-pix-manual">Não foi possível copiar automaticamente. Selecione e copie o código abaixo.<textarea aria-label="Código Pix Copia e Cola" readOnly value={PAYMENT_PIX.payload} rows={4} onFocus={e=>e.currentTarget.select()}/></label>}
   <p className="payment-pix-note">Depois de pagar, envie seu comprovante abaixo. A organização confirma o recebimento.</p>
  </div>
  <figure><img src={PAYMENT_PIX.qrPath} width={456} height={456} alt="QR Code Pix de R$ 39,00 para Marcus Vinicius Ramos de Sousa, Nubank"/><figcaption>PIX · R$ 39,00</figcaption></figure>
 </section>;
}
