import {scheduleLabel,type Match,type Profile,type ClubData,attendanceWindow} from './model';

export function confirmedListText(match:Match,players:Profile[]){
 const monthly=players.filter(p=>p.membership==='monthly').length;
 return [match.name,match.starts_at?scheduleLabel(match.starts_at)+' · João Pessoa (PB)':'Horário a definir',
  ...(match.status==='cancelled'?['PELADA CANCELADA — lista histórica']:[]),
  '',`CONFIRMADOS (${players.length}/24)`,
  ...players.map((p,i)=>`${i+1}. ${p.display_name} — ${p.membership==='monthly'?'Mensalista':'Convidado'}`),
  '',`${monthly} mensalistas · ${players.length-monthly} convidados`].join('\n');
}

export function changeDemoMembership(data:ClubData,playerId:string,membership:'monthly'|'guest',now=Date.now()):ClubData{
 const player=data.profiles.find(p=>p.id===playerId);
 if(!player)throw Error('Jogador não encontrado.');
 const promoting=membership==='monthly'&&player.membership!=='monthly';
 if(promoting&&data.profiles.filter(p=>p.membership==='monthly').length>=24)throw Error('24 mensalistas');
 return {...data,profiles:data.profiles.map(p=>p.id===playerId?{...p,membership}:p)};
}
