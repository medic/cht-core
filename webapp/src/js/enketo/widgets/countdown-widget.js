if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}
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

define( function( require, exports, module ) {
    'use strict';
    var Widget = require( 'enketo-core/src/js/Widget' );
    var $ = require( 'jquery' );
    require( 'enketo-core/src/js/plugins' );

    var pluginName = 'timerwidget';

    var DIM = 320;
    var DEFAULT_TIME = 60;

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
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Timerwidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Timerwidget.prototype.constructor = Timerwidget;

    Timerwidget.prototype._init = function() {
        var $el = $( this.element );
        var $label = $el.parent();

        var canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, DIM));
        $label.append(canvas);
        new TimerAnimation(canvas[0], DIM, DIM, parseInt($el.val()) || DEFAULT_TIME);
    };

    Timerwidget.prototype.destroy = function( element ) {};  // eslint-disable-line no-unused-vars

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Timerwidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-countdown-timer input',
    };
} );

function TimerAnimation(canvas, canvasW, canvasH, duration) {
    var pi = Math.PI,
        LIM = duration * 500, // Half of the time the animation should take in milliseconds
        ctx = canvas.getContext('2d'),

        centre = { x: canvasW/2, y: canvasH/2 },
        radius = Math.min(canvasW, canvasH) / 2,
        activeBgColor = '#0000ff',
        inactiveBgColor = '#cccccc',
        arcColor = '#cccccc',
        running;

//> AUDIO
    var audio = (function() {
        var cached;

        var androidSoundSupport = window.medicmobile_android &&
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
        var arcRadians = pi*arc/180;
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
        var offset = Date.now() - start;

        if(!running) { return; }

        if(offset < LIM*2) {
            drawAnimation(offset);
            requestAnimationFrame(function() {
                animate(start);
            });
        } else {
            drawBackgroundCircle(inactiveBgColor);
            running = false;

            audio.play();
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
