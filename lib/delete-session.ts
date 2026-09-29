import {type ClubData} from './model';

export function removeClosedSession(data:ClubData,id:string):ClubData{
 const match=data.sessions.find(s=>s.id===id);
 if(!match)throw Error('Pelada não encontrada. Atualize a lista.');
 if(match.status!=='closed')throw Error('Somente peladas encerradas podem ser excluídas.');
 const ids=new Set(data.performances.filter(p=>p.session_id===id).map(p=>p.id));
 return {...data,sessions:data.sessions.filter(s=>s.id!==id),performances:data.performances.filter(p=>p.session_id!==id),attendances:data.attendances.filter(a=>a.session_id!==id),audit:data.audit.filter(a=>!ids.has(a.performance_id))};
}
