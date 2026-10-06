'use client';

import {useEffect,useState} from 'react';
import {getSupabase} from '@/lib/supabase';
import {dateLabel,type Match,type Profile} from '@/lib/model';
import './player-reviews.css';

type Row={player_id:string;attack:number|null;attack_count:number;defense:number|null;defense_count:number;overall:number|null;attack_notes:number[];defense_notes:number[]};
const score=(value:number|null)=>value===null?'—':Number(value).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

export function AdminReviews({sessions,profiles,enabled}:{sessions:Match[];profiles:Profile[];enabled:boolean}){
 const games=sessions.filter(s=>s.status!=='cancelled').sort((a,b)=>b.played_on.localeCompare(a.played_on)||a.id.localeCompare(b.id));
 const [selected,setSelected]=useState(''),[revision,setRevision]=useState(0);
 const id=games.some(s=>s.id===selected)?selected:games[0]?.id;
 const [state,setState]=useState<{id:string;rows:Row[];closed:boolean;exists:boolean}|null>(null);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let live=true;setState(null);setError('');setLoading(true);
  if(!enabled||!id){setLoading(false);return;}
  async function load(){try{
   const sb=getSupabase()!;
   const [round,results]=await Promise.all([sb.from('review_rounds').select('closed_at').eq('session_id',id).maybeSingle(),sb.rpc('admin_player_review_results',{p_session_id:id})]);
   if(round.error)throw round.error;if(results.error)throw results.error;
   if(live)setState({id:id!,rows:results.data??[],closed:Boolean(round.data?.closed_at),exists:Boolean(round.data)});
  }catch(e){if(live)setError(e&&typeof e==='object'&&'message' in e?String(e.message):'Não foi possível carregar as avaliações. Tente novamente.');}
  finally{if(live)setLoading(false);}}
  void load();return()=>{live=false;};
 },[id,revision,enabled]);
 const rows=state?.id===id?[...state.rows].sort((a,b)=>(profiles.find(p=>p.id===a.player_id)?.display_name??'').localeCompare(profiles.find(p=>p.id===b.player_id)?.display_name??'','pt-BR')):[];
 return <section className="panel admin-reviews" aria-label="Painel de avaliações"><div className="section-heading"><div><span className="eyebrow">VISÃO DO ADMINISTRADOR</span><h2>Notas da galera.</h2></div><button className="secondary" disabled={loading||!enabled||!id} onClick={()=>setRevision(v=>v+1)}>Atualizar notas</button></div>
 <p className="muted">Veja as notas recebidas e a média de cada jogador, inclusive enquanto a votação estiver em andamento.</p>
 {!enabled?<p>As avaliações ficam disponíveis ao entrar com sua conta de administrador.</p>:!games.length?<p>Nenhuma pelada cadastrada.</p>:<>
 <label className="admin-review-picker">Pelada avaliada<select value={id} onChange={e=>setSelected(e.target.value)}>{games.map(s=><option key={s.id} value={s.id}>{s.name} · {dateLabel(s.played_on)} · {s.played_on.slice(0,4)}</option>)}</select></label>
 {loading?<p role="status">Carregando notas…</p>:error?<p className="error" role="alert">{error}</p>:state?.id===id&&!state.exists?<p>A votação desta pelada ainda não foi aberta. Confira os participantes ao encerrar a pelada.</p>:state?.id===id?<>
 <div className="section-heading"><span className="badge">{state.closed?'Resultado final':'Resultado parcial · votação em andamento'}</span><span className="muted">{rows.length} jogadores</span></div>
 <p className="muted">Média geral = soma de todas as notas válidas de ataque e defesa ÷ quantidade dessas notas. “Não consegui avaliar” não entra no cálculo. Sem notas, mostramos —.</p>
 <div className="review-results-table"><table className="admin-review-table"><caption className="sr-only">Médias por jogador, de 1 a 5 estrelas</caption><thead><tr><th>Jogador</th><th>Ataque</th><th>Defesa</th><th>Média geral</th></tr></thead><tbody>{rows.map(r=><tr key={r.player_id}><th scope="row">{profiles.find(p=>p.id===r.player_id)?.display_name??'Jogador'}<details><summary>Ver notas recebidas</summary><p>Ataque: {r.attack_notes.length?r.attack_notes.join(' · '):'sem notas'}</p><p>Defesa: {r.defense_notes.length?r.defense_notes.join(' · '):'sem notas'}</p></details></th><td><strong>{score(r.attack)}</strong><small>{r.attack_count} notas</small></td><td><strong>{score(r.defense)}</strong><small>{r.defense_count} notas</small></td><td><strong>{score(r.overall)}</strong><small>de 5 estrelas</small></td></tr>)}</tbody></table></div>
 <p className="muted">Os autores das notas não são identificados. Estas médias não alteram a pontuação da carta.</p>
 </>:null}</>}
 </section>;
}
