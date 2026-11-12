"use client";

import {useRef, useState} from "react";
import {Copy, ListChecks} from "lucide-react";
import {monthLabel, type Profile, type Payment} from "@/lib/model";

export function MissingPaymentProofs({profiles, payments, month}: {
  profiles: Profile[];
  payments: Payment[];
  month: string;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const monthly = profiles.filter(p => p.membership === "monthly")
    .sort((a,b) => a.display_name.localeCompare(b.display_name,"pt-BR"));
  const current = new Map(payments.filter(p => p.payment_month.slice(0,7) === month)
    .map(p => [p.player_id,p]));
  const missing = monthly.filter(p => !current.has(p.id));
  const rejected = monthly.filter(p => current.get(p.id)?.status === "rejected");
  const names = (players: Profile[]) => players.map((p,i) => `${i+1}. ${p.display_name}`).join("\n");
  const text = [
    `PELADA CLUB — COMPROVANTES DA MENSALIDADE`,
    monthLabel(month),
    "",
    ...(missing.length ? [`Falta enviar (${missing.length}):`,names(missing)] : ["Todos os mensalistas já enviaram o comprovante."]),
    ...(rejected.length ? ["",`Precisam reenviar após revisão (${rejected.length}):`,names(rejected)] : []),
    ...(missing.length || rejected.length ? ["","Por favor, envie seu comprovante na aba Pagamentos do app."] : []),
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Lista copiada! Pronta para colar no grupo.");
    } catch {
      field.current?.focus();
      field.current?.select();
      setFeedback("Selecione e copie o texto abaixo para compartilhar.");
    }
  }

  return <div className="missing-payment-proofs">
    <button className="secondary" onClick={() => {setOpen(!open);setFeedback("");}} aria-expanded={open} aria-controls="missing-proof-list">
      <ListChecks size={18}/>{open ? "Fechar lista de comprovantes" : "Gerar lista de comprovantes pendentes"}
    </button>
    {open && <div id="missing-proof-list" className="missing-proof-list">
      <p className="muted">Mensalistas do mês selecionado. Quem já enviou e aguarda confirmação não entra na cobrança.</p>
      <textarea ref={field} aria-label="Lista de comprovantes pendentes" value={text} readOnly rows={12}/>
      <button className="primary" onClick={copy}><Copy size={17}/>Copiar lista</button>
      <p role="status">{feedback}</p>
    </div>}
  </div>;
}
