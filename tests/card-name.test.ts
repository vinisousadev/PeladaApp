import test from 'node:test';
import assert from 'node:assert/strict';
import {cardDisplayName} from '../lib/card-name';
test('Card name keeps first name and only the second initial without changing source',()=>{
 const full='Matheus Henrique';assert.equal(cardDisplayName(full),'Matheus H.');assert.equal(full,'Matheus Henrique');
 assert.equal(cardDisplayName('Vini'),'Vini');assert.equal(cardDisplayName('  João   Álvaro  Silva '),'João Á.');assert.equal(cardDisplayName(''),'');
});
