import {type Match} from './model';

export function matchAgenda(sessions:Match[],now=Date.now()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const upcoming:Match[]=[],ongoing:Match[]=[],previous:Match[]=[];
 const date=(s:Match)=>s.starts_at?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s.starts_at)):s.played_on;
 const time=(s:Match)=>Date.parse(s.starts_at??s.played_on+'T23:59:59-03:00');
 for(const s of sessions){
  if(s.status==='cancelled')continue;
  if(s.status==='closed'||date(s)<today)previous.push(s);
  else if(s.starts_at&&time(s)<=now)ongoing.push(s);
  else upcoming.push(s);
 }
 const ascending=(a:Match,b:Match)=>time(a)-time(b)||a.id.localeCompare(b.id);
 return {upcoming:upcoming.sort(ascending),ongoing:ongoing.sort(ascending),previous:previous.sort((a,b)=>ascending(b,a))};
}
