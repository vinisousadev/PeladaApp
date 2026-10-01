import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPlayers,inRankingPeriod,rankingPeriodLabel,monthLabel,type ClubData} from '../lib/model';

test('Opening ranking carries September into October, resets in November and preserves history',()=>{
 const data:ClubData={profiles:[{id:'a',display_name:'Jogador',position:'MEI',role:'player',photo_path:null,photo_y:25}],sessions:[],performances:[],attendances:[],payments:[],slots:[],audit:[]};
 for(const [i,date] of ['2026-08-31','2026-09-01','2026-09-30','2026-10-31','2026-11-01','2026-12-01'].entries()){
  data.sessions.push({id:String(i),name:date,played_on:date,status:'closed',created_by:'a'});
  data.performances.push({id:String(i),session_id:String(i),player_id:'a',goals:1,assists:2,revision:1,updated_at:''});
 }
 const before=JSON.stringify(data);
 const september=rankPlayers(data,'2026-09')[0],october=rankPlayers(data,'2026-10')[0];
 assert.deepEqual(september,october);
 assert.equal(october.goals,3);assert.equal(october.assists,6);assert.equal(october.played,3);assert.equal(october.points,71);
 const november=rankPlayers(data,'2026-11')[0];assert.equal(november.points,57);assert.equal(november.played,1);
 assert.equal(rankPlayers({...data,performances:data.performances.filter(p=>p.session_id!=='4')},'2026-11')[0].points,50);
 assert.equal(rankPlayers(data,'2026-12')[0].points,57);
 assert.equal(JSON.stringify(data),before);
 data.sessions[2].status='cancelled';assert.equal(rankPlayers(data,'2026-10')[0].points,64);
 assert.equal(inRankingPeriod('2026-08-31','2026-10'),false);
 assert.equal(inRankingPeriod('2026-11-01','2026-10'),false);
 assert.equal(inRankingPeriod('2027-09-30','2027-10'),false);
 assert.equal(rankingPeriodLabel('2026-10'),'setembro + outubro de 2026');
 assert.equal(rankingPeriodLabel('2026-11'),monthLabel('2026-11'));
 assert.equal(monthLabel('2026-10'),'outubro de 2026'); // Payment months remain independent.
});
