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
    document.body.appendChild(canvas);
    let completed = false;

    TimerAnimation.animate(canvas, 60, () => completed = true);
    $canvas.trigger('click');

    clock.tick(59 * 1000);
    await Promise.resolve();
    expect(completed).to.be.false;

    clock.tick(1000);
    await Promise.resolve();
    expect(completed).to.be.true;
    canvas.remove();
  });

  it('returns a cleanup function that stops the animation and removes the click listener', async () => {
    const $canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, '320'));
    const canvas = $canvas[0];
    document.body.appendChild(canvas);
    let completed = false;

    const stop = TimerAnimation.animate(canvas, 60, () => completed = true);
    $canvas.trigger('click');

    clock.tick(30 * 1000);
    await Promise.resolve();

    stop();

    clock.tick(30 * 1000);
    await Promise.resolve();
    expect(completed).to.be.false;

    // Click should no longer start a new animation after cleanup
    $canvas.trigger('click');
    clock.tick(60 * 1000);
    await Promise.resolve();
    expect(completed).to.be.false;

    canvas.remove();
  });

  it('stops the animation when the canvas is removed from the DOM', async () => {
    const $canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, '320'));
    const canvas = $canvas[0];
    document.body.appendChild(canvas);
    let completed = false;

    TimerAnimation.animate(canvas, 60, () => completed = true);
    $canvas.trigger('click');

    clock.tick(30 * 1000);
    await Promise.resolve();

    canvas.remove();

    clock.tick(30 * 1000);
    await Promise.resolve();
    expect(completed).to.be.false;
  });
});
