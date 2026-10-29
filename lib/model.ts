export type Profile={id:string;access_status?:'approved'|'pending'|'rejected';invited_by?:string|null; requires_registration_photo?:boolean;display_name:string;position:'GOL'|'DEF'|'MEI'|'ATA';role:'player'|'admin';membership?:'monthly'|'guest';favorite_club_id?:string|null;photo_path:string|null;photo_y:number;photo_x?:number;photo_zoom?:number;photo_url?:string};
export type Match={star_player_id?:string|null;id:string;name:string;played_on:string;starts_at?:string|null;status:'open'|'closed'|'cancelled';created_by:string};
export type Performance={id:string;session_id:string;player_id:string;goals:number;assists:number;revision:number;updated_at:string};
export type Attendance={session_id:string;player_id:string;confirmed_at:string;status?:'confirmed'|'waiting';queue_order?:number};
export type Slot={email:string;display_name:string;role:'player'|'admin'};
export type Audit={id:number;actor_id:string;performance_id:string;action:string;created_at:string;old_values:Performance|null;new_values:Performance};
export type PaymentStatus='pending'|'confirmed'|'rejected';
export type Payment={id:string;player_id:string;payment_month:string;amount:number;proof_path:string;proof_url?:string;status:PaymentStatus;pix_analysis:'detected'|'unverified'|'unavailable';submitted_by:string;submitted_at:string;reviewed_by:string|null;reviewed_at:string|null};
export type SessionScore={session_id:string;player_id:string;position:Profile['position'];goal_points:number;assist_points:number;defense_points:number;placement_points:number;clean_sheets:number};
export type ClubData={profiles:Profile[];sessions:Match[];performances:Performance[];attendances:Attendance[];payments:Payment[];slots:Slot[];audit:Audit[];scores?:SessionScore[]};
export type Ranked=Profile&{goals:number;assists:number;points:number;played:number;rank:number};
export const MONTHLY_BASE=50; // Historical rule through October 2026.
export const SCORING_START='2026-11-01';
export function newScoring(date:string){return date.slice(0,7)>='2026-11';}
export function monthlyBase(month:string){return newScoring(month)?40:50;}
export function scoringDescription(month:string){return newScoring(month)?'Base 40. Gol +3 para todos. Assistência: MEI +3; ATA/DEF +2. DEF: +3 por jogo sem sofrer gol em que participou. Tabela da primeira fase: +4 / +3 / +2 / +1 após os seis jogos. Carta limitada a 100. Empates por nome.':'Base 50. Gol +3 e assistência +2. Carta limitada a 100. Empates por nome.';}
export const MONTHLY_MAX=100;
export function monthlyScore(goals:number,assists:number){return Math.min(MONTHLY_MAX,MONTHLY_BASE+goals*3+assists*2);}
export function currentDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
// The club's inaugural ranking spans September and October 2026.
// Only the ranking filter changes; original match dates and records stay intact.
export function isOpeningRanking(month:string){return month==='2026-09'||month==='2026-10';}
export function inRankingPeriod(date:string,month:string){return isOpeningRanking(month)?date>='2026-09-01'&&date<'2026-11-01':date.slice(0,7)===month;}
export function rankingPeriodLabel(month:string){return isOpeningRanking(month)?'setembro + outubro de 2026':monthLabel(month);}
export function rankPlayers(data:ClubData,month:string,criterion:'points'|'goals'|'assists'='points'):Ranked[]{
 const ids=new Set(data.sessions.filter(s=>s.status!=='cancelled'&&inRankingPeriod(s.played_on,month)).map(s=>s.id));
 const ranked=data.profiles.filter(p=>!p.access_status||p.access_status==='approved').map(p=>{
  const rows=data.performances.filter(r=>r.player_id===p.id&&ids.has(r.session_id));
  const goals=rows.reduce((n,r)=>n+r.goals,0),assists=rows.reduce((n,r)=>n+r.assists,0);
  const scores=(data.scores??[]).filter(r=>r.player_id===p.id&&ids.has(r.session_id));
  const earned=data.scores===undefined?goals*3+assists*(p.position==='MEI'?3:2):scores.reduce((n,r)=>n+r.goal_points+r.assist_points+r.defense_points+r.placement_points,0);
  const played=new Set([...rows.map(r=>r.session_id),...scores.map(r=>r.session_id)]).size;
  return {...p,goals,assists,points:newScoring(month)?Math.min(100,40+earned):monthlyScore(goals,assists),played,rank:0};
 }).sort((a,b)=>b[criterion]-a[criterion]||a.display_name.localeCompare(b.display_name,'pt-BR',{sensitivity:'base'})||a.id.localeCompare(b.id));
 return ranked.map((p,i)=>({...p,rank:i+1}));
}
export function validTotals(goals:number,assists:number){return [goals,assists].every(n=>Number.isInteger(n)&&n>=0&&n<=99);}
export function dateLabel(date:string){return new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});}
export function monthLabel(month:string){return new Date(month+'-15T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});}

export function startTimestamp(date:string,time:string){return new Date(date+'T'+time+':00-03:00').toISOString();}
export function scheduleLabel(value:string){return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
export function attendanceWindow(match:Match,now=Date.now()){
 const start=match.starts_at?Date.parse(match.starts_at):NaN;
 return {canConfirm:match.status==='open'&&now<start,canCancel:match.status==='open'&&now<=start-3600000,started:now>=start};
}

export function photoStyle(player:Pick<Profile,'photo_x'|'photo_y'|'photo_zoom'>){const x=player.photo_x??50,y=player.photo_y,z=player.photo_zoom??1;return {objectPosition:x+'% '+y+'%',transform:'scale('+z+')',transformOrigin:x+'% '+y+'%'};}
