import test from 'node:test';
import assert from 'node:assert/strict';
import {cardTier} from '../lib/card-tier';

test('Monthly card evolution switches at each threshold and returns to Original on reset', () => {
  for (const [points, expected] of [[50,50],[59,50],[60,60],[69,60],[70,70],[79,70],[80,80],[89,80],[90,90],[99,90],[100,100]]) {
    assert.equal(cardTier(points).level, expected);
  }
  assert.equal(cardTier(100).name, 'Lenda');
  assert.equal(cardTier(50).name, 'Original');
});
