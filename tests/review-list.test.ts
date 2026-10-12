import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewList} from '../lib/review-list';
test('shareable list labels partial results, preserves missing scores and excludes voters',()=>{
 const text=reviewList('Quinta','2026-10-08',false,[{player_id:'b',attack:4.5,attack_count:2,defense:null,defense_count:0,overall:4.5},{player_id:'a',attack:null,attack_count:0,defense:null,defense_count:0,overall:null}],new Map([['a','Ana'],['b','Bruno']]));
 assert.match(text,/08\/10\/2026/);assert.match(text,/Resultado parcial/);assert.match(text,/1\. Ana/);assert.match(text,/Ataque: 4,50 \(2 notas\) \| Defesa: — \(0 notas\)/);assert.match(text,/Geral: —/);
 assert.match(reviewList('Quinta','2026-10-08',true,[],new Map()),/Resultado final/);
});
