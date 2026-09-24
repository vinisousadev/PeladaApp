export type Profile={id:string;display_name:string;position:'GOL'|'DEF'|'MEI'|'ATA';role:'player'|'admin';photo_path:string|null;photo_y:number;photo_url?:string};
export type Match={id:string;name:string;played_on:string;starts_at?:string|null;status:'open'|'closed';created_by:string};
export type Performance={id:string;session_id:string;player_id:string;goals:number;assists:number;revision:number;updated_at:string};
export type Attendance={session_id:string;player_id:string;confirmed_at:string};
export type Slot={email:string;display_name:string;role:'player'|'admin'};
export type Audit={id:number;actor_id:string;performance_id:string;action:string;created_at:string;old_values:Performance|null;new_values:Performance};
export type ClubData={profiles:Profile[];sessions:Match[];performances:Performance[];attendances:Attendance[];slots:Slot[];audit:Audit[]};
export type Ranked=Profile&{goals:number;assists:number;points:number;played:number;rank:number};
export const MONTHLY_BASE=50;
export const MONTHLY_MAX=100;
export function monthlyScore(goals:number,assists:number){return Math.min(MONTHLY_MAX,MONTHLY_BASE+goals*3+assists*2);}
export function currentDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function rankPlayers(data:ClubData,month:string,criterion:'points'|'goals'|'assists'='points'):Ranked[]{
 const ids=new Set(data.sessions.filter(s=>s.played_on.slice(0,7)===month).map(s=>s.id));
 const ranked=data.profiles.map(p=>{const rows=data.performances.filter(r=>r.player_id===p.id&&ids.has(r.session_id));const goals=rows.reduce((n,r)=>n+r.goals,0),assists=rows.reduce((n,r)=>n+r.assists,0);return {...p,goals,assists,points:monthlyScore(goals,assists),played:rows.length,rank:0};}).sort((a,b)=>b[criterion]-a[criterion]||b.goals-a.goals||b.assists-a.assists||a.display_name.localeCompare(b.display_name,'pt-BR'));
 return ranked.map((p,i)=>({...p,rank:i&&p[criterion]===ranked[i-1][criterion]&&p.goals===ranked[i-1].goals&&p.assists===ranked[i-1].assists?(ranked[i].rank=ranked[i-1].rank):(ranked[i].rank=i+1)}));
}
export function validTotals(goals:number,assists:number){return [goals,assists].every(n=>Number.isInteger(n)&&n>=0&&n<=99);}
export function dateLabel(date:string){return new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});}
export function monthLabel(month:string){return new Date(month+'-15T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});}

export function startTimestamp(date:string,time:string){return new Date(date+'T'+time+':00-03:00').toISOString();}
export function scheduleLabel(value:string){return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
export function attendanceWindow(match:Match,now=Date.now()){
 const start=match.starts_at?Date.parse(match.starts_at):NaN;
 return {canConfirm:match.status==='open'&&now<start,canCancel:match.status==='open'&&now<=start-3600000,started:now>=start};
}
