import test from 'node:test';
import assert from 'node:assert/strict';
import type {Profile} from '../lib/model';
import {unconfirmedMonthlyMembers} from '../lib/unconfirmed-members';

const player = (id: string, name: string, membership?: Profile['membership']): Profile => ({id, display_name: name, membership, position: 'MEI', role: 'player', photo_path: null, photo_y: 25});
test('Lists only current monthly members absent from this match confirmed roster', () => {
  const ana = player('a', 'Ana', 'monthly'), ze = player('z', 'Zé', 'monthly');
  const waiting = player('w', 'Bruno', 'monthly');
  const profiles = [ze, waiting, player('guest', 'Convidado', 'guest'), ana, player('old', 'Sem categoria')];
  assert.deepEqual(unconfirmedMonthlyMembers(profiles, [ana]).map(p => p.id), ['w', 'z']);
  assert.deepEqual(unconfirmedMonthlyMembers(profiles, [ana, ze, waiting]), []);
  // Cancelling removes the player from confirmed; confirming removes them from the pending list.
  assert.deepEqual(unconfirmedMonthlyMembers(profiles, [ze, waiting]).map(p => p.id), ['a']);
  assert.deepEqual(unconfirmedMonthlyMembers([], []), []);
  assert.equal(profiles[0], ze);
});
