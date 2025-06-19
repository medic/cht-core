import { expect } from 'chai';
import sinon from 'sinon';
import $ from 'jquery';

const TimerAnimation = require('../../../../../src/js/enketo/lib/timer-animation.js');

describe('Timer Animation', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  it('executes callback when timer completes', async () => {
    const $canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, '320'));
    const canvas = $canvas[0];
    let completed = false;

    TimerAnimation.animate(canvas, 60, () => completed = true);
    $canvas.trigger('click');

    clock.tick(59 * 1000);
    await Promise.resolve();
    expect(completed).to.be.false;

    clock.tick(1000);
    await Promise.resolve();
    expect(completed).to.be.true;
  });
});
