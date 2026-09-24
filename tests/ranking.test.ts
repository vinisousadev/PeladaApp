import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPlayers,validTotals,monthlyScore,type ClubData} from '../lib/model';
test('Monthly rank handles assists, ties, zero stats and repeated saves',()=>{
 const data:ClubData={profiles:['A','B','C','D'].map((name,i)=>({id:String(i),display_name:name,position:'MEI',role:'player',photo_path:null,photo_y:25})),sessions:[{id:'sept',name:'Setembro',played_on:'2026-09-30',status:'open',created_by:'0'},{id:'oct',name:'Outubro',played_on:'2026-10-01',status:'open',created_by:'0'}],performances:[{id:'p0',session_id:'sept',player_id:'0',goals:2,assists:3,revision:1,updated_at:''},{id:'p1',session_id:'sept',player_id:'1',goals:2,assists:3,revision:1,updated_at:''},{id:'p2',session_id:'sept',player_id:'2',goals:0,assists:5,revision:1,updated_at:''},{id:'p3',session_id:'oct',player_id:'3',goals:99,assists:0,revision:1,updated_at:''}],attendances:[],slots:[],audit:[]};
 let ranks=rankPlayers(data,'2026-09');assert.deepEqual(ranks.map(p=>p.rank),[1,1,3,4]);assert.equal(ranks[0].points,62);assert.equal(ranks[3].points,50);
 assert.equal(rankPlayers(data,'2026-09','assists')[0].id,'2');
 data.performances[0]={...data.performances[0],goals:1,revision:2};ranks=rankPlayers(data,'2026-09');assert.equal(ranks.find(p=>p.id==='0')?.points,59);
 assert.equal(rankPlayers(data,'2026-10')[0].id,'3');
 assert.equal(rankPlayers(data,'2026-10')[0].points,100);
 assert.ok(rankPlayers(data,'2026-11').every(p=>p.points===50&&p.rank===1));
 data.performances[0]={...data.performances[0],goals:20,assists:10};
 data.performances[1]={...data.performances[1],goals:18,assists:20};
 ranks=rankPlayers(data,'2026-09');assert.equal(ranks[0].points,100);assert.equal(ranks[1].points,100);assert.equal(ranks[0].id,'0');
 data.performances[0]={...data.performances[0],goals:0,assists:0};assert.equal(rankPlayers(data,'2026-09').find(p=>p.id==='0')?.points,50);
 assert.equal(validTotals(0,99),true);assert.equal(validTotals(-1,0),false);assert.equal(validTotals(1.5,0),false);assert.equal(validTotals(NaN,1),false);
 data.sessions[0].status='cancelled';
 assert.ok(rankPlayers(data,'2026-09').every(p=>p.points===50&&p.goals===0&&p.assists===0&&p.played===0));
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
