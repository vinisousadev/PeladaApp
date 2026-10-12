export type ReviewAverage={player_id:string;attack:number|null;attack_count:number;defense:number|null;defense_count:number;overall:number|null};
export const reviewScore=(value:number|null)=>value===null?'—':Number(value).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
export function reviewList(name:string,date:string,closed:boolean,rows:ReviewAverage[],names:Map<string,string>){
 const sorted=[...rows].sort((a,b)=>(names.get(a.player_id)??'').localeCompare(names.get(b.player_id)??'','pt-BR'));
 return ['⚽ PELADA CLUB — MÉDIAS DA PELADA',`${name} · ${date.split('-').reverse().join('/')}`,closed?'Resultado final':'Resultado parcial — votação em andamento','',...sorted.map((r,i)=>`${i+1}. ${names.get(r.player_id)??'Jogador'}\nAtaque: ${reviewScore(r.attack)} (${r.attack_count} notas) | Defesa: ${reviewScore(r.defense)} (${r.defense_count} notas) | Geral: ${reviewScore(r.overall)}`),'','Escala: 1 a 5 estrelas. — = sem notas.','Média geral: soma de todas as notas válidas ÷ quantidade de notas.','Respostas “Não consegui avaliar” não entram na média.'].join('\n');
}
