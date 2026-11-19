"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Check,X} from "lucide-react";
import {monthLabel,type Profile} from "@/lib/model";
import {PAYMENT_PIX} from "@/lib/pix-payment";
import {validPaymentAmount} from "@/lib/payments";
import {friendlyError} from "@/lib/supabase";

export function ManualPayment({player,month,close,confirm}:{player:Profile;month:string;close:()=>void;confirm:(player:Profile,month:string,amount:number)=>Promise<void>}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [amount,setAmount]=useState(String(PAYMENT_PIX.amount));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{dialog.current?.showModal();},[]);
  async function save(event:FormEvent){
    event.preventDefault();
    if(busy || !validPaymentAmount(Number(amount)))return;
    setBusy(true);setError("");
    try{await confirm(player,month,Number(amount));close();}
    catch(e){setError(friendlyError(e));setBusy(false);}
  }
  return <dialog ref={dialog} className="modal payment-modal" onCancel={e=>{if(busy)e.preventDefault();else close();}}>
    <div className="modal-heading"><h2>Confirmar sem comprovante</h2><button className="icon-button" aria-label="Fechar janela" disabled={busy} onClick={close}><X size={20}/></button></div>
    <p><strong>{player.display_name}</strong> · {monthLabel(month)}</p>
    <p className="muted">Confirme somente se você já recebeu o pagamento. A confirmação ficará registrada em seu nome, sem anexo.</p>
    <form onSubmit={save}>
      <label>Valor recebido (R$)<input aria-label="Valor recebido" type="number" inputMode="decimal" min="0.01" max="9999.99" step="0.01" required value={amount} disabled={busy} onChange={e=>setAmount(e.target.value)}/></label>
      {error&&<p className="error" role="alert">{error}</p>}
      <button className="primary full" disabled={busy||!validPaymentAmount(Number(amount))}><Check size={18}/>{busy?"Confirmando…":"Confirmar pagamento recebido"}</button>
    </form>
  </dialog>;
}
