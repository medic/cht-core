/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modilabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

const DIM = 320;
const DEFAULT_TIME = 60;

/**
 * Countdown timer.
 *
 * @extends Widget
// Remove this when we no longer support countdown timer appearance on notes
const deprecated = {
  selector: '.or-appearance-countdown-timer input',
  getDefaultValue: $el => parseInt($el.val()),
};
/**
 * Countdown timer.
 *
 * @extends Widget
 */

const deprecated = {
  selector: '.or-appearance-countdown-timer input',
  getDefaultValue: $el => parseInt($el.val()),
};

class Timerwidget extends Widget {
  static get selector() {
    return `.or-appearance-countdown-timer .option-wrapper input, ${deprecated.selector}`;
  }

  _init() {
    const $el = $( this.element );
    const $wrapper = $el.closest('.or-appearance-countdown-timer');
    const canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, DIM));
    $wrapper.append(canvas);
    const duration = parseInt($wrapper.attr('data-cht-duration')) || deprecated.getDefaultValue($el) || DEFAULT_TIME;
    new TimerAnimation(canvas[0], DIM, DIM, duration, $el);
  }
}

module.exports = Timerwidget;

const TimerAnimation = function(canvas, canvasW, canvasH, duration, $el) {
  const pi = Math.PI;
  const LIM = duration * 500; // Half of the time the animation should take in milliseconds
  const ctx = canvas.getContext('2d');

  const centre = { x: canvasW/2, y: canvasH/2 };
  const radius = Math.min(canvasW, canvasH) / 2;
  const activeBgColor = '#0000ff';
  const inactiveBgColor = '#cccccc';
  const arcColor = '#cccccc';
  let running;

  const audio = (function() {
    const androidSoundSupport = window.medicmobile_android &&
      typeof window.medicmobile_android.playAlert === 'function';
    if (androidSoundSupport) {
      return { play: () => window.medicmobile_android.playAlert() };
    }
    const cached = new Audio('/audio/alert.mp3');
    return { play: () => cached.play() };
  }());
  
  const setTimerCompleted = () => {
    $el.prop('checked', true).trigger('change'); // Mark the hidden OK radio button as checked
  };

  //> UTILS
  const drawCircle = (ctx, c) => {
    drawArc(ctx, c, 360);
  };

  const drawArc = (ctx, c, arc) => {
    const arcRadians = pi*arc/180;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, -pi/2, arcRadians-(pi/2), false);
    ctx.lineTo(c.x, c.y);
    ctx.fillStyle = c.color;
    ctx.fill();
  };

  //> ANIMATION
  const drawAnimation = (offset) => {
    drawBackgroundCircle(activeBgColor);
    drawTimerArc(offset);
  };
  const drawBackgroundCircle = (color) => {
    drawCircle(ctx, {
      x: centre.x, y: centre.y, r: radius, color: color });
  };
  const drawTimerArc = (offset) => {
    drawArc(
      ctx,
      { x: centre.x, y: centre.y, r: radius, color: arcColor },
      offset * 180 / LIM
    );
  };

  const startTimer = () => {
    running = true;
    setTimeout(function() {
      animate(Date.now());
    }, 0);
  };

  const animate = (start) => {
    const offset = Date.now() - start;

    if (!running) {
      return;
    }

    if (offset < LIM*2) {
      drawAnimation(offset);
      requestAnimationFrame(function() {
        animate(start);
      });
    } else {
      drawBackgroundCircle(inactiveBgColor);
      running = false;
      setTimerCompleted();
      if ($(canvas).closest('body').length > 0) {
        // only beep if the canvas is still attached to the DOM
        audio.play();
      }
    }
  };

  // init
  (function() {
    const resetTimer = () => {
      running = false;
      drawBackgroundCircle(inactiveBgColor);
    };

    // set up initial state
    resetTimer();

    canvas.addEventListener('click', function() {
      if (running) {
        resetTimer();
      } else {
        startTimer();
      }
    });
  }());
};
