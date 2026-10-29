import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPlayers,validTotals,monthlyScore,type ClubData} from '../lib/model';
test('Monthly rank handles assists, ties, zero stats and repeated saves',()=>{
 const data:ClubData={profiles:['A','B','C','D'].map((name,i)=>({id:String(i),display_name:name,position:'MEI',role:'player',photo_path:null,photo_y:25})),sessions:[{id:'sept',name:'Setembro',played_on:'2025-09-30',status:'open',created_by:'0'},{id:'oct',name:'Outubro',played_on:'2025-10-01',status:'open',created_by:'0'}],performances:[{id:'p0',session_id:'sept',player_id:'0',goals:2,assists:3,revision:1,updated_at:''},{id:'p1',session_id:'sept',player_id:'1',goals:2,assists:3,revision:1,updated_at:''},{id:'p2',session_id:'sept',player_id:'2',goals:0,assists:5,revision:1,updated_at:''},{id:'p3',session_id:'oct',player_id:'3',goals:99,assists:0,revision:1,updated_at:''}],attendances:[],payments:[],slots:[],audit:[]};
 let ranks=rankPlayers(data,'2025-09');assert.deepEqual(ranks.map(p=>p.rank),[1,2,3,4]);assert.equal(ranks[0].points,62);assert.equal(ranks[3].points,50);
 assert.equal(rankPlayers(data,'2025-09','assists')[0].id,'2');
 data.performances[0]={...data.performances[0],goals:1,revision:2};ranks=rankPlayers(data,'2025-09');assert.equal(ranks.find(p=>p.id==='0')?.points,59);
 assert.equal(rankPlayers(data,'2025-10')[0].id,'3');
 assert.equal(rankPlayers(data,'2025-10')[0].points,100);
 assert.ok(rankPlayers(data,'2025-11').every((p,i)=>p.points===50&&p.rank===i+1));
 data.performances[0]={...data.performances[0],goals:20,assists:10};
 data.performances[1]={...data.performances[1],goals:18,assists:20};
 ranks=rankPlayers(data,'2025-09');assert.equal(ranks[0].points,100);assert.equal(ranks[1].points,100);assert.equal(ranks[0].id,'0');
 data.performances[0]={...data.performances[0],goals:0,assists:0};assert.equal(rankPlayers(data,'2025-09').find(p=>p.id==='0')?.points,50);
 assert.equal(validTotals(0,99),true);assert.equal(validTotals(-1,0),false);assert.equal(validTotals(1.5,0),false);assert.equal(validTotals(NaN,1),false);
 data.sessions[0].status='cancelled';
 assert.ok(rankPlayers(data,'2025-09').every(p=>p.points===50&&p.goals===0&&p.assists===0&&p.played===0));
});
test('Ties use alphabetical order only and positions never repeat or skip',()=>{
 const data:ClubData={profiles:['Zeca','Álvaro','Bruno','Davi','Bruno'].map((display_name,i)=>({id:String(i),display_name,position:'MEI',role:'player',photo_path:null,photo_y:25})),sessions:[{id:'game',name:'Pelada',played_on:'2026-09-30',status:'closed',created_by:'0'}],performances:[[2,0],[0,3],[2,0],[3,0],[0,3]].map(([goals,assists],i)=>({id:String(i),player_id:String(i),session_id:'game',goals,assists,revision:1,updated_at:''})),attendances:[],payments:[],slots:[],audit:[]};
 const before=JSON.stringify(data);
 const ranked=rankPlayers(data,'2026-10');
 assert.deepEqual(ranked.map(p=>p.id),['3','1','2','4','0']);
 assert.deepEqual(ranked.map(p=>p.rank),[1,2,3,4,5]);
 assert.deepEqual(rankPlayers({...data,profiles:[...data.profiles].reverse()},'2026-10'),ranked);
 assert.deepEqual(rankPlayers(data,'2026-10','goals').map(p=>p.id),['3','2','0','1','4']);
 assert.deepEqual(rankPlayers(data,'2026-10','assists').map(p=>p.id),['1','4','2','3','0']);
 assert.equal(JSON.stringify(data),before);
});
test('A score of 100 is attainable in four or five games and never exceeded',()=>{
 assert.equal(monthlyScore(0,0),50);
 assert.equal(monthlyScore(1,0),53);
 assert.equal(monthlyScore(0,1),52);
 assert.equal(monthlyScore(2*5,2*5),100);
 assert.equal(monthlyScore(3*4,2*4),100);
 assert.equal(monthlyScore(10,9),98);
 assert.equal(monthlyScore(99,99),100);
});

test('November starts at 40, uses frozen server breakdowns, counts bonus-only participants and resets monthly',()=>{
 const data:ClubData={profiles:[{id:'mei',display_name:'Meia',position:'ATA',role:'player',photo_path:null,photo_y:25},{id:'def',display_name:'Defensor',position:'DEF',role:'player',photo_path:null,photo_y:25}],sessions:[{id:'nov',name:'Pelada',played_on:'2026-11-04',status:'closed',created_by:'mei'},{id:'oct',name:'Histórica',played_on:'2026-10-28',status:'closed',created_by:'mei'}],performances:[{id:'m',session_id:'nov',player_id:'mei',goals:12,assists:3,revision:1,updated_at:''},{id:'old',session_id:'oct',player_id:'mei',goals:12,assists:3,revision:1,updated_at:''}],scores:[{session_id:'nov',player_id:'mei',position:'MEI',goal_points:36,assist_points:9,defense_points:0,placement_points:3,clean_sheets:0},{session_id:'nov',player_id:'def',position:'DEF',goal_points:0,assist_points:0,defense_points:9,placement_points:4,clean_sheets:3}],attendances:[],payments:[],slots:[],audit:[]};
 assert.equal(rankPlayers(data,'2026-10')[0].points,92);
 assert.equal(rankPlayers(data,'2026-11')[0].points,88);
 assert.equal(rankPlayers(data,'2026-11')[1].points,53);
 assert.equal(rankPlayers(data,'2026-11')[1].played,1);
 assert.ok(rankPlayers(data,'2026-12').every(p=>p.points===40&&p.played===0));
 data.scores![0].placement_points=40;assert.equal(rankPlayers(data,'2026-11')[0].points,100);
 data.sessions[0].status='cancelled';assert.ok(rankPlayers(data,'2026-11').every(p=>p.points===40&&p.played===0));
});
