'use client';
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '@/lib/supabase';
import {type Profile} from '@/lib/model';

type Vote={reviewer_id:string;reviewer_name:string;attack:number|null;defense:number|null;updated_at:string};
type Correction={id:number;reviewer_id:string;actor_id:string;old_attack:number|null;old_defense:number|null;new_attack:number|null;new_defense:number|null;reason:string;created_at:string};
const note=(n:number|null)=>n===null?'Sem nota':`${n} ★`;
const errorText=(e:unknown)=>e&&typeof e==='object'&&'message' in e?String(e.message):'Falha ao conectar. Tente novamente.';

function VoteEditor({vote,sessionId,playerId,saved,cancel}:{vote:Vote;sessionId:string;playerId:string;saved:()=>void;cancel:()=>void}){
 const [attack,setAttack]=useState(String(vote.attack??'')),[defense,setDefense]=useState(String(vote.defense??'')),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className="vote-editor" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{const {error}=await getSupabase()!.rpc('admin_correct_review',{p_session_id:sessionId,p_player_id:playerId,p_reviewer_id:vote.reviewer_id,p_attack:attack?Number(attack):null,p_defense:defense?Number(defense):null,p_expected_updated_at:vote.updated_at,p_reason:reason.trim()});if(error)throw error;saved();}catch(e){setError(errorText(e));}finally{setBusy(false);}}}>
 <h3>Corrigir voto de {vote.reviewer_name}</h3><div className="form-grid">{([['Ataque',attack,setAttack],['Defesa',defense,setDefense]] as const).map(([label,value,set])=><label key={label}>{label}<select disabled={busy} value={value} onChange={e=>set(e.target.value)}><option value="">Não conseguiu avaliar</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} estrelas</option>)}</select></label>)}</div>
 <label>Motivo da correção<input value={reason} onChange={e=>setReason(e.target.value)} required minLength={3} maxLength={500} disabled={busy}/></label>
 <p className="muted">A nota anterior e o motivo ficam no histórico. As médias serão recalculadas.</p>{error&&<p className="error" role="alert">{error}</p>}
 <button className="primary" disabled={busy||reason.trim().length<3}>{busy?'Salvando…':'Salvar correção'}</button><button type="button" className="secondary" disabled={busy} onClick={cancel}>Voltar aos votos</button>
 </form>;
}

export function AdminReviewVotes({sessionId,player,profiles,onChanged}:{sessionId:string;player:Profile;profiles:Profile[];onChanged:()=>void}){
 const [votes,setVotes]=useState<Vote[]>([]),[history,setHistory]=useState<Correction[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[editing,setEditing]=useState<Vote|null>(null);
 useEffect(()=>{let live=true;setLoading(true);setError('');async function load(){try{const sb=getSupabase()!;const [v,h]=await Promise.all([sb.rpc('admin_review_votes',{p_session_id:sessionId,p_player_id:player.id}),sb.from('review_corrections').select('*').eq('session_id',sessionId).eq('player_id',player.id).order('created_at',{ascending:false})]);if(v.error)throw v.error;if(h.error)throw h.error;if(live){setVotes(v.data??[]);setHistory(h.data??[]);}}catch(e){if(live)setError(errorText(e));}finally{if(live)setLoading(false);}}void load();return()=>{live=false;};},[sessionId,player.id,revision]);
 return <section className="admin-vote-details" aria-label={`Votos de ${player.display_name}`}><div className="section-heading"><h3>Quem avaliou {player.display_name}</h3><button className="secondary" disabled={loading||Boolean(editing)} onClick={()=>setRevision(v=>v+1)}>Atualizar votos</button></div>
 {loading?<p role="status">Carregando votos…</p>:error?<p className="error" role="alert">{error}</p>:editing?<VoteEditor key={editing.reviewer_id+editing.updated_at} vote={editing} sessionId={sessionId} playerId={player.id} cancel={()=>{setEditing(null);setRevision(v=>v+1);}} saved={()=>{setEditing(null);setRevision(v=>v+1);onChanged();}}/>:<><div className="review-results-table"><table className="admin-review-table"><thead><tr><th>Quem votou</th><th>Ataque</th><th>Defesa</th><th>Ação</th></tr></thead><tbody>{votes.map(v=><tr key={v.reviewer_id}><th scope="row">{v.reviewer_name}</th><td>{note(v.attack)}</td><td>{note(v.defense)}</td><td><button className="secondary" onClick={()=>setEditing(v)}>Corrigir</button></td></tr>)}</tbody></table></div>{!votes.length&&<p>Nenhuma avaliação recebida ainda.</p>}</>}
 {history.length>0&&<details><summary>Histórico de correções ({history.length})</summary>{history.map(h=><div className="vote-history" key={h.id}><strong>Voto de {profiles.find(p=>p.id===h.reviewer_id)?.display_name??'Jogador'}</strong><p>Ataque: {note(h.old_attack)} → {note(h.new_attack)} · Defesa: {note(h.old_defense)} → {note(h.new_defense)}</p><p>{h.reason}</p><small>{profiles.find(p=>p.id===h.actor_id)?.display_name??'Administrador'} · {new Date(h.created_at).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'})}</small></div>)}</details>}
 </section>;
}

export function ReviewListDialog({text,onClose}:{text:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),[copied,setCopied]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className="modal review-modal" aria-label="Lista de médias" onCancel={onClose}><div className="section-heading"><h2>Lista de médias</h2><button className="secondary" onClick={onClose}>Fechar</button></div><p className="muted">Texto pronto para compartilhar, sem os autores dos votos.</p><textarea className="review-share-text" aria-label="Texto da lista de médias" readOnly value={text} onFocus={e=>e.target.select()}/><div className="review-share-actions"><button className="primary" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setError('');}catch{setError('Não foi possível copiar automaticamente. Selecione o texto acima e copie.');}}}>{copied?'Copiado!':'Copiar lista'}</button><button className="secondary" onClick={()=>{const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='medias-pelada.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Baixar TXT</button></div>{error&&<p role="alert">{error}</p>}</dialog>;
}
