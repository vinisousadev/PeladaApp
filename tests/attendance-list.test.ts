import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedListText,changeDemoMembership} from '../lib/attendance-list';
import {type Profile,type Match,type ClubData} from '../lib/model';
const profiles:Profile[]=[{id:'a',display_name:'Vini',position:'MEI',role:'admin',membership:'monthly',photo_path:null,photo_y:50},{id:'b',display_name:'Convidado',position:'MEI',role:'player',membership:'guest',photo_path:null,photo_y:50}];
const match:Match={id:'game',name:'Pelada Arena',played_on:'2026-10-01',starts_at:'2026-10-01T22:30:00Z',status:'open',created_by:'a'};
test('Copy list identifies each confirmed player, totals and local schedule',()=>{
 const text=confirmedListText(match,profiles);
 assert.ok(text.includes('01/10, 19:30'));
 assert.ok(text.includes('1. Vini — Mensalista\n2. Convidado — Convidado'));
 assert.ok(text.includes('CONFIRMADOS (2/24)'));
 assert.ok(text.endsWith('1 mensalistas · 1 convidados'));
 assert.ok(confirmedListText({...match,status:'cancelled'},profiles).includes('PELADA CANCELADA'));
});
test('Changing demo membership never enrolls players or undoes cancellations',()=>{
 const data:ClubData={profiles,sessions:[match,{...match,id:'closed',status:'closed'},{...match,id:'past',starts_at:'2020-01-01T12:00:00Z'},{...match,id:'cancelled',status:'cancelled'}],attendances:[],performances:[],payments:[],slots:[],audit:[]};
 const result=changeDemoMembership(data,'b','monthly',Date.parse('2026-09-30'));
 assert.deepEqual(result.attendances,[]);
 assert.equal(data.attendances.length,0);
 assert.equal(changeDemoMembership(result,'b','monthly',Date.parse('2026-09-30')).attendances.length,0);
 assert.equal(changeDemoMembership({...result,attendances:[]},'b','monthly',Date.parse('2026-09-30')).attendances.length,0);
 assert.equal(changeDemoMembership(result,'b','guest',Date.parse('2026-09-30')).attendances.length,0);
});
