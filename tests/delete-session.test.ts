import test from 'node:test';
import assert from 'node:assert/strict';
import {removeClosedSession} from '../lib/delete-session';
import {rankPlayers} from '../lib/model';
import {demoData} from '../lib/demo';
test('Deleting a closed session removes its contributions for every card without touching other games or payments',()=>{
 const data=demoData();data.sessions[0].status='closed';
 const month=data.sessions[0].played_on.slice(0,7),id=data.sessions[0].id;
 const before=rankPlayers(data,month),removed=data.performances.filter(p=>p.session_id===id);
 const result=removeClosedSession(data,id),after=rankPlayers(result,month);
 for(const row of removed){const p=after.find(p=>p.id===row.player_id)!,old=before.find(p=>p.id===row.player_id)!;assert.equal(p.played,old.played-1);assert.equal(p.goals,old.goals-row.goals);assert.equal(p.assists,old.assists-row.assists);}
 assert.equal(result.sessions.length,data.sessions.length-1);
 assert.ok(result.attendances.every(a=>a.session_id!==id));
 assert.deepEqual(result.payments,data.payments);assert.deepEqual(result.profiles,data.profiles);
 assert.equal(data.sessions.length,2);
 assert.throws(()=>removeClosedSession(demoData(),id),/encerradas/);
 const cancelled=demoData();cancelled.sessions[0].status='cancelled';assert.throws(()=>removeClosedSession(cancelled,id),/encerradas/);
});
