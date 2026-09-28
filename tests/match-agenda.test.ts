import test from 'node:test';
import assert from 'node:assert/strict';
import {matchAgenda} from '../lib/match-agenda';
import {type Match} from '../lib/model';
test('Agenda hides cancellations, puts next dates first and keeps played games newest first',()=>{
 const s=(id:string,starts_at:string,status:Match['status']='open'):Match=>({id,name:id,starts_at,status,played_on:starts_at.slice(0,10),created_by:'admin'});
 const sessions=[s('later','2026-10-02T22:00:00Z'),s('old-open','2026-09-27T22:00:00Z'),s('next','2026-09-30T22:00:00Z'),s('cancelled','2026-09-29T22:00:00Z','cancelled'),s('closed','2026-09-28T20:00:00Z','closed'),s('today','2026-09-28T21:00:00Z')];
 const result=matchAgenda(sessions,Date.parse('2026-09-28T23:00:00Z'));
 assert.deepEqual(result.upcoming.map(s=>s.id),['next','later']);
 assert.deepEqual(result.ongoing.map(s=>s.id),['today']);
 assert.deepEqual(result.previous.map(s=>s.id),['closed','old-open']);
 assert.equal(sessions[0].id,'later');
 // UTC midnight is still the same local evening, not a previous game.
 assert.deepEqual(matchAgenda(sessions,Date.parse('2026-09-29T01:00:00Z')).ongoing.map(s=>s.id),['today']);
 assert.ok(matchAgenda(sessions,Date.parse('2026-09-29T04:00:00Z')).previous.some(s=>s.id==='today'));
 assert.deepEqual(matchAgenda([s('cancelled','2026-09-29T22:00:00Z','cancelled')]),{upcoming:[],ongoing:[],previous:[]});
});
