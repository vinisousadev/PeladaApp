import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPlayers,validTotals,type ClubData} from '../lib/model';
test('Monthly rank handles assists, ties, zero stats and repeated saves',()=>{
 const data:ClubData={profiles:['A','B','C','D'].map((name,i)=>({id:String(i),display_name:name,position:'MEI',role:'player',photo_path:null,photo_y:25})),sessions:[{id:'sept',name:'Setembro',played_on:'2026-09-30',status:'open',created_by:'0'},{id:'oct',name:'Outubro',played_on:'2026-10-01',status:'open',created_by:'0'}],performances:[{id:'p0',session_id:'sept',player_id:'0',goals:2,assists:3,revision:1,updated_at:''},{id:'p1',session_id:'sept',player_id:'1',goals:2,assists:3,revision:1,updated_at:''},{id:'p2',session_id:'sept',player_id:'2',goals:0,assists:5,revision:1,updated_at:''},{id:'p3',session_id:'oct',player_id:'3',goals:99,assists:0,revision:1,updated_at:''}],slots:[],audit:[]};
 let ranks=rankPlayers(data,'2026-09');assert.deepEqual(ranks.map(p=>p.rank),[1,1,3,4]);assert.equal(ranks[0].points,12);assert.equal(ranks[3].points,0);
 assert.equal(rankPlayers(data,'2026-09','assists')[0].id,'2');
 data.performances[0]={...data.performances[0],goals:1,revision:2};ranks=rankPlayers(data,'2026-09');assert.equal(ranks.find(p=>p.id==='0')?.points,9);
 assert.equal(rankPlayers(data,'2026-10')[0].id,'3');
 assert.equal(validTotals(0,99),true);assert.equal(validTotals(-1,0),false);assert.equal(validTotals(1.5,0),false);assert.equal(validTotals(NaN,1),false);
});
