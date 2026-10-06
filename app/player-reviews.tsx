'use client';
import './player-reviews.css';

import {useCallback, useEffect, useRef, useState} from 'react';
import {Star, Shield, Swords} from 'lucide-react';
import {getSupabase} from '@/lib/supabase';
import {dateLabel, photoStyle, type Match, type Profile} from '@/lib/model';

type Pending = {session_id:string;name:string;played_on:string;help_requested:boolean;total:number;targets:{id:string;name:string}[]};
type Round = {closed_at:string|null};
type Participant = {player_id:string;waived_at:string|null;help_requested:boolean};
type Result = {player_id:string;attack:number|null;attack_count:number;defense:number|null;defense_count:number};
const message = (e:unknown) => e && typeof e==='object' && 'message' in e ? String(e.message) : 'Não foi possível salvar. Confira sua conexão e tente novamente.';
export const refreshReviews = () => window.dispatchEvent(new Event('pelada-reviews'));

function ReviewDialog({children,label}:{children:React.ReactNode;label:string}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dlg=ref.current;dlg?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{dlg?.close();document.body.style.overflow=previous;};},[]);
 return <dialog ref={ref} className="modal review-modal" aria-label={label} onCancel={e=>e.preventDefault()}>{children}</dialog>;
}

function Stars({label,hint,value,onChange,disabled}:{label:string;hint:string;value:number|null|undefined;onChange:(v:number|null)=>void;disabled:boolean}) {
 return <fieldset className="review-category" disabled={disabled}><legend>{label==='Ataque'?<Swords size={18}/>:<Shield size={18}/>} {label}</legend><p>{hint}</p>
 <div className="review-stars" role="radiogroup" aria-label={label}>{[1,2,3,4,5].map(n=><label key={n} className={value!=null&&value>=n?'lit':''}><input type="radio" name={label} value={n} checked={value===n} onChange={()=>onChange(n)} aria-label={`${n} ${n===1?'estrela':'estrelas'} em ${label.toLowerCase()}`}/><Star size={30} fill={value!=null&&value>=n?'currentColor':'none'}/></label>)}</div>
 <label className="review-skip"><input type="radio" name={label} checked={value===null} onChange={()=>onChange(null)}/> Não consegui avaliar</label></fieldset>;
}

function Ballot({round,profiles,save}:{round:Pending;profiles:Profile[];save:(attack:number|null,defense:number|null)=>Promise<void>}) {
 const [attack,setAttack]=useState<number|null>(),[defense,setDefense]=useState<number|null>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const target=round.targets[0],profile=profiles.find(p=>p.id===target.id);
 return <form onSubmit={async e=>{e.preventDefault();if(attack===undefined||defense===undefined||busy)return;setBusy(true);setError('');try{await save(attack,defense);}catch(e){setError(message(e));}finally{setBusy(false);}}}>
  <div className="review-player"><div className="review-avatar">{profile?.photo_url?<img src={profile.photo_url} alt="" style={photoStyle(profile)}/>:target.name.slice(0,2).toUpperCase()}</div><div><small>COMO FOI EM CAMPO?</small><h2>{target.name}</h2><span>{profile?.position}</span></div></div>
  <Stars label="Ataque" hint="Criação, passes, assistências e finalizações." value={attack} onChange={setAttack} disabled={busy}/>
  <Stars label="Defesa" hint="Marcação, recomposição, desarmes e proteção do gol." value={defense} onChange={setDefense} disabled={busy}/>
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="primary full" disabled={busy||attack===undefined||defense===undefined}>{busy?'Salvando…':round.targets.length===1?'Concluir avaliação':'Salvar e continuar'}</button>
 </form>;
}

export function ReviewGate({profiles,me,logout}:{profiles:Profile[];me:Profile;logout:()=>Promise<void>}) {
 const [pending,setPending]=useState<Pending[]|null>(null),[error,setError]=useState(''),[working,setWorking]=useState(false);
 const generation=useRef(0),saving=useRef(false);
 const reload=useCallback(async()=>{const version=++generation.current;const {data,error}=await getSupabase()!.rpc('pending_player_reviews');if(version!==generation.current)return;if(error){setError(message(error));return;}setPending(data??[]);setError('');},[]);
 useEffect(()=>{const update=()=>{if(!document.hidden&&!saving.current)void reload();};void reload();const timer=setInterval(update,30000);window.addEventListener('focus',update);window.addEventListener('pelada-reviews',update);return()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('pelada-reviews',update);};},[reload]);
 const round=pending?.[0];
 async function manage(action:'help'|'waive') {if(!round)return;setWorking(true);try{const {error}=await getSupabase()!.rpc('manage_player_reviews',{p_session_id:round.session_id,p_action:action,p_player_id:me.id});if(error)throw error;await reload();}catch(e){setError(message(e));}finally{setWorking(false);}}
 if(pending&&pending.length===0)return null;
 return <ReviewDialog label="Avaliação da pelada"><span className="eyebrow">RESENHA PÓS-JOGO</span><h1>A voz de quem jogou.</h1>
 {round?<><p>{round.name} · {dateLabel(round.played_on)}</p><p className="muted">Avalie ataque e defesa para continuar no clube. Suas notas individuais não são exibidas aos outros jogadores.</p>
 <div className="review-progress"><span>{round.total-round.targets.length} de {round.total} jogadores avaliados</span><progress max={round.total} value={round.total-round.targets.length}/></div>
 <Ballot key={`${round.session_id}-${round.targets[0].id}`} round={round} profiles={profiles} save={async(attack,defense)=>{saving.current=true;generation.current++;try{const {error}=await getSupabase()!.rpc('submit_player_review',{p_session_id:round.session_id,p_player_id:round.targets[0].id,p_attack:attack,p_defense:defense});if(error){void reload();throw error;}await reload();}finally{saving.current=false;}}}/>
 <p className="review-footnote">Seu progresso é salvo a cada jogador. “Não consegui avaliar” não altera a média.</p>
 {round.help_requested?<p role="status">Pedido de ajuda enviado. O administrador pode dispensar sua avaliação.</p>:<button className="text-button" disabled={working} onClick={()=>manage('help')}>Preciso de ajuda</button>}
 {me.role==='admin'&&<button className="text-button" disabled={working} onClick={()=>{if(window.confirm('Dispensar sua própria avaliação desta pelada?'))void manage('waive');}}>Dispensar minha avaliação (administrador)</button>}
 </>:<p role="status">Conferindo suas avaliações…</p>}
 {error&&<div className="error" role="alert">{error}<button className="secondary" onClick={()=>reload()}>Tentar novamente</button></div>}
 <button className="text-button" onClick={logout}>Sair da conta</button></ReviewDialog>;
}

export function ReviewSetup({match,players,onCancel,onStart}:{match:Match;players:Profile[];onCancel:()=>void;onStart:(ids:string[])=>Promise<void>}) {
 const [selected,setSelected]=useState(players.map(p=>p.id)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <ReviewDialog label="Conferir quem jogou"><span className="eyebrow">APITO FINAL</span><h2>Quem entrou em campo?</h2><p>{match.name}</p><p className="muted">Desmarque quem faltou. Só os selecionados avaliam e recebem notas. A lista da votação fica fixa após a abertura.</p><div className="review-roster">{players.map(p=><label key={p.id}><input type="checkbox" disabled={busy} checked={selected.includes(p.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id))}/>{p.display_name}</label>)}</div>
 <p>{selected.length} participantes · mínimo de 2</p>{error&&<p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy||selected.length<2} onClick={async()=>{setBusy(true);setError('');try{await onStart(selected);}catch(e){setError(message(e));}finally{setBusy(false);}}}>{busy?'Abrindo avaliações…':'Encerrar pelada e abrir avaliações'}</button><button className="secondary full" disabled={busy} onClick={onCancel}>Voltar</button></ReviewDialog>;
}

export function MatchReviews({match,profiles,admin,onStart}:{match:Match;profiles:Profile[];admin:boolean;onStart:()=>void}) {
 const [open,setOpen]=useState(false),[round,setRound]=useState<Round|null>(null),[participants,setParticipants]=useState<Participant[]>([]),[results,setResults]=useState<Result[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{setBusy(true);setError('');try{const sb=getSupabase()!;const r=await sb.from('review_rounds').select('closed_at').eq('session_id',match.id).maybeSingle();if(r.error)throw r.error;setRound(r.data);if(r.data){const results=await sb.rpc('player_review_results',{p_session_id:match.id});if(results.error)throw results.error;setResults(results.data??[]);if(admin){const p=await sb.from('review_participants').select('player_id,waived_at,help_requested').eq('session_id',match.id);if(p.error)throw p.error;setParticipants(p.data??[]);}}}catch(e){setError(message(e));}finally{setBusy(false);}},[match.id,admin]);
 useEffect(()=>{if(open)void load();},[open,load,match.status]);
 async function manage(action:'close'|'waive',playerId?:string) {setBusy(true);setError('');try{const {error}=await getSupabase()!.rpc('manage_player_reviews',{p_session_id:match.id,p_action:action,p_player_id:playerId??null});if(error)throw error;await load();refreshReviews();}catch(e){setError(message(e));}finally{setBusy(false);}}
 if(match.status!=='closed')return null;
 return <section className="match-reviews"><button className="secondary" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Star size={16}/> {open?'Ocultar avaliações':'Avaliações de ataque e defesa'}</button>{open&&<div className="review-results">
 {error&&<p className="error" role="alert">{error}</p>}{busy?<p role="status">Atualizando…</p>:!round?<><p>As avaliações ainda não foram abertas.</p>{admin&&<button className="primary" onClick={onStart}>Conferir participantes e abrir</button>}</>:round.closed_at?<><h3>Quem jogou, avaliou.</h3><p className="muted">Médias de 1 a 5. Respostas sem nota não entram na média. Os pontos da carta continuam iguais.</p><div className="review-results-table"><table><thead><tr><th>Jogador</th><th>Ataque</th><th>Defesa</th></tr></thead><tbody>{results.sort((a,b)=>(profiles.find(p=>p.id===a.player_id)?.display_name??'').localeCompare(profiles.find(p=>p.id===b.player_id)?.display_name??'','pt-BR')).map(r=><tr key={r.player_id}><th>{profiles.find(p=>p.id===r.player_id)?.display_name??'Jogador'}</th><td><strong>{r.attack??'—'} ★</strong><small>{r.attack_count} notas</small></td><td><strong>{r.defense??'—'} ★</strong><small>{r.defense_count} notas</small></td></tr>)}</tbody></table></div></>:<><p>Votação em andamento. As médias aparecem quando todos terminarem ou o administrador encerrar.</p>{admin&&<><div className="review-roster">{participants.map(p=><div className="review-admin-person" key={p.player_id}><span>{profiles.find(f=>f.id===p.player_id)?.display_name}{p.help_requested&&<small> Pediu ajuda</small>}</span>{p.waived_at?<small>Dispensado</small>:<button className="secondary" onClick={()=>{if(window.confirm('Dispensar a avaliação deste jogador?'))void manage('waive',p.player_id);}}>Dispensar</button>}</div>)}</div><button className="secondary" onClick={()=>{if(window.confirm('Encerrar a votação, liberar todas as pendências e publicar as médias recebidas?'))void manage('close');}}>Encerrar votação e liberar pendências</button></>}</>}
 <button className="text-button" disabled={busy} onClick={()=>load()}>Atualizar avaliações</button></div>}</section>;
}
