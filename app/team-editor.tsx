'use client';

import {useState} from 'react';
import {Search, X, Plus, RotateCcw} from 'lucide-react';
import type {ClubData} from '@/lib/model';

type Team = {slot:number; name:string; players:string[]};
const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();

export function TeamEditor({teams,players,busy,onSave,onCancel,correction=false,rosterProfiles=players}:{correction?:boolean;rosterProfiles?:ClubData['profiles'];teams:Team[];players:ClubData['profiles'];busy:boolean;onSave:(teams:Team[])=>Promise<void>;onCancel?:()=>void}) {
 const [draft,setDraft] = useState<Team[]>(() => teams.length ? teams : Array.from({length:4},(_,i)=>({slot:i+1,name:`Time ${i+1}`,players:[]})));
 const [queries,setQueries] = useState<Record<number,string>>({});
 const update = (slot:number,patch:Partial<Team>) => setDraft(old=>old.map(t=>t.slot===slot?{...t,...patch}:t));
 const search = (slot:number,value:string) => setQueries(old=>({...old,[slot]:value}));
 const add = (slot:number,id:string) => {
  setDraft(old => old.some(t=>t.players.includes(id)) ? old : old.map(t=>t.slot===slot&&t.players.length<6?{...t,players:[...t.players,id]}:t));
  search(slot,'');
 };
 return <form className="tournament-setup" onSubmit={e=>{e.preventDefault();void onSave(draft);}}>
  <h3>{correction?'Corrigir jogadores dos times':'Os quatro times'}</h3>
  <p>Selecione um nome ou digite para buscar entre os jogadores confirmados. Cada time pode ter até seis jogadores. As alterações só entram ao salvar.</p>
  {correction&&<div className="tournament-notice"><p>Os placares e as fases serão preservados. Quem sair perde os bônus dos jogos desse time. Quem entrar começa marcado em todos os jogos do time, inclusive os finalizados: confira depois em “Quem jogou”.</p><p>Gols e assistências não são transferidos. Para lançar ou corrigir, use Administração → Corrigir um desempenho. Se o substituto não aparecer na busca, confirme a presença dele primeiro.</p></div>}
  <fieldset disabled={busy}>
   <div className="tournament-teams team-editor-grid">
    {draft.map(t=>{
     const query=queries[t.slot]??'';
     const options=players.filter(p=>!t.players.includes(p.id)&&normalize(p.display_name).includes(normalize(query)));
     return <section className={`tournament-team team-${t.slot}`} key={t.slot} aria-label={`Montar time ${t.slot}`}>
      <label>Nome do time {t.slot}<input readOnly={correction} required maxLength={40} value={t.name} onChange={e=>update(t.slot,{name:e.target.value})}/></label>
      <div className="team-roster-heading"><strong aria-live="polite">Jogadores · {t.players.length}/6</strong><button type="button" className="team-clear" disabled={!t.players.length} onClick={()=>{update(t.slot,{players:[]});search(t.slot,'');}}><RotateCcw size={14}/>Limpar time</button></div>
      <ul className="team-selected" aria-label={`Jogadores do time ${t.slot}`}>
       {t.players.map(id=>{const name=rosterProfiles.find(p=>p.id===id)?.display_name??'Jogador';return <li key={id}><span>{name}</span><button type="button" aria-label={`Remover ${name} do time ${t.slot}`} onClick={()=>update(t.slot,{players:t.players.filter(p=>p!==id)})}><X size={16}/></button></li>;})}
      </ul>
      {!t.players.length&&<p className="team-empty">Nenhum jogador selecionado.</p>}
      <label className="team-search">Buscar jogador no time {t.slot}<div><Search size={16} aria-hidden="true"/><input type="search" autoComplete="off" value={query} placeholder="Digite o nome…" disabled={t.players.length>=6} onChange={e=>search(t.slot,e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/></div></label>
      {t.players.length>=6?<p role="status">Time completo. Remova um jogador para trocar.</p>:<div className="team-search-results" aria-label={`Resultados para o time ${t.slot}`}>
       {options.map(p=>{const assigned=draft.find(other=>other.slot!==t.slot&&other.players.includes(p.id));return <button key={p.id} type="button" disabled={!!assigned} onClick={()=>add(t.slot,p.id)} aria-label={`Adicionar ${p.display_name} ao time ${t.slot}`}><span>{p.display_name}<small>{assigned?`Já está em ${assigned.name}`:p.position}</small></span>{!assigned&&<Plus size={16} aria-hidden="true"/>}</button>;})}
       {!options.length&&<p role="status">{players.length?'Nenhum jogador encontrado.':'Nenhum jogador confirmado nesta pelada.'}</p>}
      </div>}
     </section>;
    })}
   </div>
   <div className="tournament-actions"><button className="primary" type="submit">{busy?'Salvando…':correction?'Salvar correção dos times':'Salvar times e tabela de jogos'}</button>{onCancel&&<button type="button" className="secondary" onClick={onCancel}>Cancelar edição</button>}</div>
  </fieldset>
 </form>;
}
