import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceWindow,startTimestamp,type Match} from '../lib/model';
test('Brasília scheduling and the inclusive cancellation cutoff survive midnight',()=>{
 const starts_at=startTimestamp('2026-10-01','00:30');
 assert.equal(starts_at,'2026-10-01T03:30:00.000Z');
 const match:Match={id:'game',name:'Pelada',played_on:'2026-10-01',starts_at,status:'open',created_by:'admin'};
 const cutoff=Date.parse('2026-10-01T02:30:00Z');
 assert.equal(attendanceWindow(match,cutoff).canCancel,true);
 assert.equal(attendanceWindow(match,cutoff+1).canCancel,false);
 assert.equal(attendanceWindow(match,cutoff+1).canConfirm,true);
 assert.equal(attendanceWindow(match,Date.parse(starts_at)).canConfirm,false);
 assert.equal(attendanceWindow(match,Date.parse(starts_at)).started,true);
 assert.equal(attendanceWindow({...match,status:'closed'},cutoff-1).canConfirm,false);
 assert.equal(attendanceWindow({...match,status:'closed'},cutoff-1).canCancel,false);
 assert.equal(attendanceWindow({...match,starts_at:null},cutoff-1).canConfirm,false);
});
