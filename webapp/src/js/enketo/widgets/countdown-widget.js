'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

const pluginName = 'timerwidget';

const DIM = 320;
const DEFAULT_TIME = 60;

/**
 * Countdown timer.
 *
 * @constructor
 * @param {Element} element [description]
 * @param {(boolean|{touch: boolean, repeat: boolean})} options options
 * @param {*=} e     event
 */
function Timerwidget( element, options ) {
  this.namespace = pluginName;
  Object.assign( this, new Widget( element, options ) );
  this._init();
}

//copy the prototype functions from the Widget super class
Timerwidget.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
Timerwidget.prototype.constructor = Timerwidget;

Timerwidget.prototype._init = function() {
  const $el = $( this.element );
  const $label = $el.parent();

  const canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, DIM));
  $label.append(canvas);
  new TimerAnimation(canvas[0], DIM, DIM, parseInt($el.val()) || DEFAULT_TIME);
};

Timerwidget.prototype.destroy = function( element ) {};  // eslint-disable-line no-unused-vars

$.fn[ pluginName ] = function( options, event ) {
  return this.each( function() {
    const $this = $( this );
    let data = $this.data( pluginName );

    options = options || {};

    if ( !data && typeof options === 'object' ) {
      $this.data( pluginName, ( data = new Timerwidget( this, options, event ) ) );
    } else if ( data && typeof options === 'string' ) {
      data[ options ]( this );
    }
  } );
};

Timerwidget.selector = '.or-appearance-countdown-timer input';
Timerwidget.condition = function() { return true; };

module.exports = Timerwidget;

function TimerAnimation(canvas, canvasW, canvasH, duration) {
  const pi = Math.PI;
  const LIM = duration * 500; // Half of the time the animation should take in milliseconds
  const ctx = canvas.getContext('2d');

  const centre = { x: canvasW/2, y: canvasH/2 };
  const radius = Math.min(canvasW, canvasH) / 2;
  const activeBgColor = '#0000ff';
  const inactiveBgColor = '#cccccc';
  const arcColor = '#cccccc';
  let running;

  //> AUDIO
  const audio = (function() {
    let cached;

    const androidSoundSupport = window.medicmobile_android &&
                typeof window.medicmobile_android.playAlert === 'function';

    if(!androidSoundSupport) {
      cached = loadSound();
    }

    function loadSound() {
      return new Audio('/audio/alert.mp3');
    }

    return {
      play: function() {
        if(androidSoundSupport) {
          window.medicmobile_android.playAlert();
        } else {
          cached.play();
        }
      },
    };
  }());

  //> UTILS
  function drawCircle(ctx, c) {
    drawArc(ctx, c, 360);
  }

  function drawArc(ctx, c, arc) {
    const arcRadians = pi*arc/180;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, -pi/2,
      arcRadians-(pi/2), false);
    ctx.lineTo(c.x, c.y);
    ctx.fillStyle = c.color;
    ctx.fill();
  }

  //> ANIMATION
  function drawAnimation(offset) {
    drawBackgroundCircle(activeBgColor);
    drawTimerArc(offset);
  }
  function drawBackgroundCircle(color) {
    drawCircle(ctx, {
      x: centre.x, y: centre.y, r: radius, color: color });
  }
  function drawTimerArc(offset) {
    drawArc(ctx, {
      x: centre.x, y: centre.y, r: radius, color: arcColor },
    offset * 180 / LIM);
  }

  function startTimer() {
    running = true;
    setTimeout(function() {
      animate(Date.now());
    }, 0);
  }

  function animate(start) {
    const offset = Date.now() - start;

    if(!running) { return; }

    if(offset < LIM*2) {
      drawAnimation(offset);
      requestAnimationFrame(function() {
        animate(start);
      });
    } else {
      drawBackgroundCircle(inactiveBgColor);
      running = false;
      if ($(canvas).closest('body').length > 0) {
        // only beep if the canvas is still attached to the DOM
        audio.play();
      }
    }
  }

  // init
  (function() {
    function resetTimer() {
      running = false;
      drawBackgroundCircle(inactiveBgColor);
    }

    // set up initial state
    resetTimer();

    canvas.addEventListener('click', function() {
      if(running) {
        resetTimer();
      } else {
        startTimer();
      }
    });
  }());
}
