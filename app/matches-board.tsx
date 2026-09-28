'use client';
import {useEffect,useId,useState,type ReactNode} from 'react';
import {ChevronDown,CalendarDays,History} from 'lucide-react';
import {type Match} from '@/lib/model';
import {matchAgenda} from '@/lib/match-agenda';

export function MatchesBoard({sessions,renderMatch,featuredOnly=false}:{sessions:Match[];renderMatch:(match:Match)=>ReactNode;featuredOnly?:boolean}){
 const [now,setNow]=useState(Date.now()),[showPrevious,setShowPrevious]=useState(false);
 const historyId=useId();
 useEffect(()=>{const tick=()=>setNow(Date.now());const timer=setInterval(tick,30000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[]);
 const {upcoming,ongoing,previous}=matchAgenda(sessions,now);
 return <div className="matches-board">
  {upcoming.length>0?<>
   <section className="next-match" aria-label="Próxima pelada"><div className="next-match-heading"><CalendarDays size={22}/><div><span className="eyebrow">O PRÓXIMO ENCONTRO</span><h2>Tá chegando a hora.</h2></div><span className="badge">Próxima pelada</span></div>{renderMatch(upcoming[0])}</section>
   {upcoming.length>1&&!featuredOnly&&<section className="upcoming-matches"><div className="section-heading"><h2>Na sequência</h2><span className="muted">{upcoming.length-1} agendadas</span></div>{upcoming.slice(1).map(s=><div key={s.id}>{renderMatch(s)}</div>)}</section>}
  </>:<div className="agenda-empty"><CalendarDays size={26}/><h2>Nenhuma próxima pelada marcada.</h2><p>A próxima data aparece aqui assim que o organizador criar a pelada.</p></div>}
  {ongoing.length>0&&(!featuredOnly||!upcoming.length)&&<section className="ongoing-matches"><div className="section-heading"><h2>Em campo hoje</h2><span className="badge">Registre seus números</span></div>{ongoing.slice(0,featuredOnly?1:ongoing.length).map(s=><div key={s.id}>{renderMatch(s)}</div>)}</section>}
  {previous.length>0&&!featuredOnly&&<section className="previous-matches"><button type="button" className="history-toggle" aria-expanded={showPrevious} aria-controls={historyId} onClick={()=>setShowPrevious(v=>!v)}><History size={21}/><span>{showPrevious?'Ocultar peladas anteriores':'Ver peladas anteriores'}<small>{previous.length} {previous.length===1?'pelada realizada':'peladas realizadas'}</small></span><ChevronDown size={20} className={showPrevious?'is-open':''}/></button><div id={historyId} hidden={!showPrevious}>{showPrevious&&previous.map(s=><div key={s.id}>{renderMatch(s)}</div>)}</div></section>}
 </div>;
}
