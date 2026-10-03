import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gestureAxis, pageAfterSwipe } from '../src/pages/agenda/calendarGesture.js';

const swipe = (overrides) => pageAfterSwipe({ axis: 'x', dx: -100, dy: 5, width: 320, startLeft: 320, maxLeft: 960, ...overrides });
test('vertical and diagonal gestures prefer vertical scrolling', () => {
  assert.equal(gestureAxis(6, 10), 'y');
  assert.equal(gestureAxis(30, 20), 'y');
  assert.equal(gestureAxis(5, 4), null);
  assert.equal(gestureAxis(26, 4), 'x');
  assert.equal(swipe({ axis: 'y', dx: -200 }), null);
});
test('short or diagonal swipes do not change professional', () => {
  assert.equal(swipe({ dx: -30 }), null);
  assert.equal(swipe({ dx: -100, dy: 60 }), null);
  assert.equal(swipe({ width: 500, dx: -80 }), null);
});
test('deliberate swipes move exactly one professional and respect edges', () => {
  assert.equal(swipe({}), 640);
  assert.equal(swipe({ dx: 100 }), 0);
  assert.equal(swipe({ dx: -800 }), 640);
  assert.equal(swipe({ startLeft: 960 }), 960);
  assert.equal(swipe({ startLeft: 0, dx: 100 }), 0);
  assert.equal(swipe({ width: 0 }), null);
});
