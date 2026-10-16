'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {Trophy,Timer,Play,Pause,RotateCcw,Flag,Users} from 'lucide-react';
import {getSupabase} from '@/lib/supabase';
import {dateLabel,type ClubData,type Match} from '@/lib/model';
import './tournament.css';

type Team={slot:number;name:string;players:string[]};
type Game={number:number;stage:'group'|'semi'|'final';home:number;away:number;home_score:number;away_score:number;finished:boolean;winner:number|null;remaining_seconds:number;timer_started_at:string|null};
type Standing={slot:number;name:string;played:number;wins:number;draws:number;losses:number;gf:number;ga:number;points:number};
type Snapshot={revision:number|null;server_time:string;teams:Team[];games:Game[];standings:Standing[]};
type Action=(action:string,payload?:Record<string,unknown>)=>Promise<boolean>;
const errorMessage=(e:unknown)=>e&&typeof e==='object'&&'message' in e?String(e.message):'Não foi possível atualizar. Confira a conexão e tente novamente.';

export function Tournament({data,isAdmin,demo}:{data:ClubData;isAdmin:boolean;demo:boolean}){
 const sessions=[...data.sessions].sort((a,b)=>b.played_on.localeCompare(a.played_on));
 const [selected,setSelected]=useState(()=>sessions.find(s=>s.status==='open')?.id??sessions[0]?.id??'');
 const match=sessions.find(s=>s.id===selected);
 return <section className="tournament"><div className="tournament-heading"><div><span className="eyebrow">QUATRO TIMES · UMA TAÇA</span><h2>Campeonato da pelada</h2><p>Da fase de pontos à grande final. Acompanhe os jogos e a classificação.</p></div><Trophy size={42}/></div>
 <label className="tournament-selector">Escolha a pelada<select value={selected} onChange={e=>setSelected(e.target.value)}>{!sessions.length&&<option value="">Nenhuma pelada criada</option>}{sessions.map(s=><option value={s.id} key={s.id}>{s.name} · {dateLabel(s.played_on)}{s.status==='cancelled'?' · cancelada':''}</option>)}</select></label>
 {demo?<p className="empty">O campeonato compartilhado está disponível ao entrar na sua conta.</p>:match?<TournamentSession key={match.id} match={match} data={data} isAdmin={isAdmin}/>:<p className="empty">Crie uma pelada para organizar o campeonato.</p>}
 </section>;
}

function TournamentSession({match,data,isAdmin}:{match:Match;data:ClubData;isAdmin:boolean}){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[resetPrompt,setResetPrompt]=useState(false);
 const [now,setNow]=useState(Date.now());const offset=useRef(0),busyRef=useRef(false),request=useRef(0),revision=useRef<number|null>(null);
 const accept=useCallback((value:Snapshot)=>{offset.current=Date.parse(value.server_time)-Date.now();revision.current=value.revision;setSnapshot(value);setNow(Date.now()+offset.current);},[]);
 const load=useCallback(async()=>{if(busyRef.current)return;const ticket=++request.current;try{const result=await getSupabase()!.rpc('get_tournament',{p_session_id:match.id});if(ticket!==request.current)return;if(result.error)throw result.error;accept(result.data);setError('');}catch(e){if(ticket===request.current)setError(errorMessage(e));}},[match.id,accept]);
 useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};const poll=setInterval(refresh,5000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{++request.current;clearInterval(poll);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[load]);
 useEffect(()=>{const tick=setInterval(()=>setNow(Date.now()+offset.current),250);return()=>clearInterval(tick);},[]);
 const action:Action=async(p_action,p_payload={})=>{if(busyRef.current)return false;busyRef.current=true;setBusy(true);setError('');++request.current;try{const result=await getSupabase()!.rpc('manage_tournament',{p_session_id:match.id,p_revision:revision.current,p_action,p_payload});if(result.error)throw result.error;accept(result.data);return true;}catch(e){setError(errorMessage(e));return false;}finally{busyRef.current=false;setBusy(false);}};
 const canEdit=isAdmin&&match.status!=='cancelled';
 const games=snapshot?.games??[],teams=snapshot?.teams??[];
 const teamName=(slot:number)=>teams.find(t=>t.slot===slot)?.name??'Time';
 const final=games.find(g=>g.stage==='final'),hasSemis=games.some(g=>g.stage==='semi');
 const eligible=data.profiles.filter(p=>data.attendances.some(a=>a.session_id===match.id&&a.player_id===p.id&&a.status!=='waiting')).sort((a,b)=>a.display_name.localeCompare(b.display_name,'pt-BR'));
 return <>
 {error&&<div className="form-error" role="alert">{error} <button type="button" onClick={()=>void load()} disabled={busy}>Atualizar campeonato</button></div>}
 {!snapshot&&!error&&<p role="status">Carregando campeonato…</p>}
 {match.status==='cancelled'&&<p className="tournament-notice">Pelada cancelada. O campeonato está disponível apenas para consulta.</p>}
 {snapshot&&<>
 {final?.finished&&<div className="tournament-champion"><Trophy size={44}/><div><span>CAMPEÃO DA PELADA</span><h2>{teamName(final.winner!)}</h2><p>{final.home_score} × {final.away_score}{final.home_score===final.away_score?' · Vitória nos pênaltis':''}</p></div></div>}
 {(!teams.length||editing)&&canEdit?<TeamEditor teams={teams} players={eligible} busy={busy} onCancel={teams.length?()=>setEditing(false):undefined} onSave={async(value)=>{if(await action('teams',{teams:value}))setEditing(false);}}/>:<>
 {!teams.length?<p className="empty">O administrador ainda vai cadastrar os quatro times desta pelada.</p>:<div className="tournament-teams">{teams.map(t=><article className={`tournament-team team-${t.slot}`} key={t.slot}><span>TIME {t.slot}</span><h3>{t.name}</h3><p><Users size={14}/> {t.players.length}/6 jogadores</p><ul>{t.players.map(id=><li key={id}>{data.profiles.find(p=>p.id===id)?.display_name??'Jogador'}</li>)}</ul></article>)}</div>}
 {canEdit&&teams.length>0&&!games.some(g=>g.finished||g.timer_started_at||g.remaining_seconds!==480||g.home_score||g.away_score)&&<button className="secondary" onClick={()=>setEditing(true)}>Editar os quatro times</button>}
 </>}
 {teams.length>0&&<>
 <div className="tournament-section-title"><h3>Classificação</h3><span>Vitória 3 pts · Empate 1 pt</span></div>
 <div className="tournament-table-wrap"><table className="tournament-table"><thead><tr><th>Pos.</th><th>Time</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th></tr></thead><tbody>{snapshot.standings.map((s,i)=><tr key={s.slot} className={i===0?'leader':''}><td>{i+1}º</td><th scope="row">{s.name}{i===0&&<small>LÍDER</small>}</th><td><strong>{s.points}</strong></td><td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td><td>{s.gf}</td><td>{s.ga}</td><td>{s.gf-s.ga>0?'+':''}{s.gf-s.ga}</td></tr>)}</tbody></table></div>
 <p className="tournament-caption">Desempate: pontos, vitórias, saldo de gols, gols marcados e nome do time. A tabela considera os jogos finalizados.</p>
 {(['group','semi','final'] as const).map(stage=>{const list=games.filter(g=>g.stage===stage);if(!list.length)return null;return <section key={stage}><div className="tournament-section-title"><h3>{stage==='group'?'Fase de pontos':stage==='semi'?'Semifinais':'Grande final'}</h3><span>{stage==='group'?'Todos contra todos · 6 jogos':'Mata-mata'}</span></div><div className="tournament-games">{list.map(g=><GameCard key={g.number} game={g} teams={teams} now={now} busy={busy} action={action} canEdit={canEdit&&!(g.stage==='group'&&hasSemis)&&!(g.stage==='semi'&&!!final)}/>)}</div></section>;})}
 {canEdit&&<div className="tournament-actions">
 {!hasSemis&&<button className="primary" disabled={busy||games.filter(g=>g.stage==='group'&&g.finished).length!==6} onClick={()=>void action('semis')}><Flag size={18}/>Gerar semifinais · 1º × 4º e 3º × 2º</button>}
 {hasSemis&&!final&&<button className="primary" disabled={busy||games.filter(g=>g.stage==='semi'&&g.finished).length!==2} onClick={()=>void action('final')}><Trophy size={18}/>Gerar final</button>}
 {hasSemis&&!resetPrompt&&<button className="secondary" disabled={busy} onClick={()=>setResetPrompt(true)}>Desfazer mata-mata para corrigir</button>}
 {resetPrompt&&<div className="tournament-notice" role="alert"><p>Isso apaga semifinais e final, incluindo placares e cronômetros. Os seis jogos da fase de pontos serão mantidos.</p><button className="secondary" disabled={busy} onClick={()=>setResetPrompt(false)}>Manter mata-mata</button><button className="primary" disabled={busy} onClick={async()=>{if(await action('reset_bracket'))setResetPrompt(false);}}>Confirmar: desfazer mata-mata</button></div>}
 </div>}
 <p className="tournament-caption">Atualização automática a cada 5 segundos nesta aba. O cronômetro chega a 00:00; o ADM finaliza o resultado. Este campeonato não altera os pontos individuais do mês.</p>
 </>}
 </>}
 </>;
}

function TeamEditor({teams,players,busy,onSave,onCancel}:{teams:Team[];players:ClubData['profiles'];busy:boolean;onSave:(teams:Team[])=>Promise<void>;onCancel?:()=>void}){
 const [draft,setDraft]=useState<Team[]>(()=>teams.length?teams:Array.from({length:4},(_,i)=>({slot:i+1,name:`Time ${i+1}`,players:[]})));
 const update=(slot:number,patch:Partial<Team>)=>setDraft(old=>old.map(t=>t.slot===slot?{...t,...patch}:t));
 return <form className="tournament-setup" onSubmit={e=>{e.preventDefault();void onSave(draft);}}><h3>Os quatro times</h3><p>Informe os times já definidos no campo. Selecione até seis jogadores confirmados em cada um; você também pode começar apenas com os nomes dos times.</p><fieldset disabled={busy}><div className="tournament-teams">{draft.map(t=><div className={`tournament-team team-${t.slot}`} key={t.slot}><label>Nome do time {t.slot}<input required maxLength={40} value={t.name} onChange={e=>update(t.slot,{name:e.target.value})}/></label><details><summary>Jogadores · {t.players.length}/6</summary><div className="tournament-player-options">{players.map(p=>{const selected=t.players.includes(p.id);const elsewhere=draft.some(other=>other.slot!==t.slot&&other.players.includes(p.id));return <label key={p.id}><input type="checkbox" checked={selected} disabled={elsewhere||(!selected&&t.players.length>=6)} onChange={()=>update(t.slot,{players:selected?t.players.filter(id=>id!==p.id):[...t.players,p.id]})}/>{p.display_name}{elsewhere?' · em outro time':''}</label>;})}{!players.length&&<p>Nenhum jogador confirmado ainda.</p>}</div></details></div>)}</div><div className="tournament-actions"><button className="primary" type="submit">{busy?'Salvando…':'Salvar times e tabela de jogos'}</button>{onCancel&&<button type="button" className="secondary" onClick={onCancel}>Cancelar edição</button>}</div></fieldset></form>;
}

function GameCard({game:g,teams,now,busy,action,canEdit}:{game:Game;teams:Team[];now:number;busy:boolean;action:Action;canEdit:boolean}){
 const [home,setHome]=useState(String(g.home_score)),[away,setAway]=useState(String(g.away_score)),[winner,setWinner]=useState('');
 useEffect(()=>{setHome(String(g.home_score));setAway(String(g.away_score));setWinner('');},[g.home_score,g.away_score,g.finished]);
 const name=(slot:number)=>teams.find(t=>t.slot===slot)?.name??'Time';
 const remaining=Math.max(0,g.remaining_seconds-(g.timer_started_at?Math.max(0,Math.floor((now-Date.parse(g.timer_started_at))/1000)):0));
 const timer=`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`;
 const valid=home!==''&&away!==''&&[Number(home),Number(away)].every(n=>Number.isInteger(n)&&n>=0&&n<=99);
 const penalties=g.stage!=='group'&&g.number!==7&&Number(home)===Number(away);
 const payload={number:g.number,home_score:Number(home),away_score:Number(away),winner:winner?Number(winner):null};
 return <article className={`tournament-game ${g.finished?'finished':''} ${g.timer_started_at?'live':''}`} aria-label={`Jogo ${g.number}`}>
 <div className="game-topline"><span>JOGO {g.number}{g.number===7?' · 1º × 4º':g.number===8?' · 3º × 2º':''}</span><span>{g.finished?'FINALIZADO':g.timer_started_at?(remaining?'EM JOGO':'TEMPO ESGOTADO'):'A JOGAR'}</span></div>
 <div className="game-score"><strong>{name(g.home)}</strong><div><input aria-label={`Gols de ${name(g.home)} no jogo ${g.number}`} type="number" min={0} max={99} value={home} disabled={!canEdit||busy||g.finished} onChange={e=>setHome(e.target.value)}/><span>×</span><input aria-label={`Gols de ${name(g.away)} no jogo ${g.number}`} type="number" min={0} max={99} value={away} disabled={!canEdit||busy||g.finished} onChange={e=>setAway(e.target.value)}/></div><strong>{name(g.away)}</strong></div>
 <div className="game-clock"><Timer size={20}/><time>{timer}</time><span>8 MINUTOS</span></div>
 {g.number===7&&<p className="game-rule">{name(g.home)} tem a vantagem do empate nesta semifinal.</p>}
 {g.finished&&g.winner&&<p className="game-winner"><Trophy size={16}/>{name(g.winner)} {g.stage==='final'?'é campeão':'venceu / avançou'}{g.home_score===g.away_score?(g.number===7?' · vantagem do líder':' · nos pênaltis'):''}</p>}
 {canEdit&&!g.finished&&<><div className="game-timer-buttons"><button className="secondary" disabled={busy||(!g.timer_started_at&&remaining===0)} onClick={()=>void action(g.timer_started_at?'pause':'start',{number:g.number})}>{g.timer_started_at?<Pause size={15}/>:<Play size={15}/>} {g.timer_started_at?'Pausar':'Iniciar'}</button><button className="secondary" disabled={busy} onClick={()=>void action('reset_timer',{number:g.number})}><RotateCcw size={15}/>Voltar a 8:00</button></div>
 {penalties&&<label className="game-penalties">Em caso de empate, quem venceu nos pênaltis?<select value={winner} onChange={e=>setWinner(e.target.value)} disabled={busy}><option value="">Selecione para finalizar</option><option value={g.home}>{name(g.home)}</option><option value={g.away}>{name(g.away)}</option></select></label>}
 <div className="game-result-buttons"><button className="secondary" disabled={busy||!valid} onClick={()=>void action('score',payload)}>Salvar placar</button><button className="primary" disabled={busy||!valid||(penalties&&!winner)} onClick={()=>void action('finish',payload)}>Finalizar jogo</button></div></>}
 {canEdit&&g.finished&&<button className="secondary" disabled={busy} onClick={()=>void action('reopen',{number:g.number})}>Corrigir resultado</button>}
 </article>;
}
