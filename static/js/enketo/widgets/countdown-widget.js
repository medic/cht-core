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

        // replace the element with a canvas
        var canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, DIM));
        $el.replaceWith(canvas);
        new TimerAnimation(canvas[0], DIM, DIM, parseInt($el.val()) || DEFAULT_TIME);
    };

    Timerwidget.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

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
        bigR = Math.min(canvasW, canvasH) / 2,
        littleR = bigR / 8,
        littleOffsetMax = bigR - 3*littleR,
        startColor = rgb(0, 0, 255),
        midColor = rgb(176, 176, 176),
        endColor = rgb(255, 165, 0),
        running;

//> AUDIO
    var audio = (function() {
        var cached;

        if(!isAndroid()) {
            cached = loadSound();
        }

        function isAndroid() {
            return typeof medicmobile_android !== 'undefined';
        }

        function loadSound() {
            return new Audio('./static/audio/alert.mp3');
        }

        return {
            play: function() {
                if(isAndroid()) {
                    medicmobile_android.playAlert();
                } else {
                    cached.play();
                }
            },
        };
    }());

//> UTILS
    function toHex() {
        var hex;
        if(arguments.length === 1) {
            hex = Math.round(arguments[0]).toString(16);
            if(hex.length === 1) { hex = '0' + hex; }
            return hex;
        }
        return toHex(arguments[0]) +
                toHex(arguments[1]) +
                toHex(arguments[2]);
    }

    function drawCircle(ctx, c) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, 2*pi, false);
        ctx.fillStyle = c.color;
        ctx.fill();
    }

    function rgb(r, g, b) { return { r:r, g:g, b:b }; }

    function fade(offset, limit, start, end) {
        return toHex(
            start.r + ((end.r - start.r) * offset / limit),
            start.g + ((end.g - start.g) * offset / limit),
            start.b + ((end.b - start.b) * offset / limit));
    }

//> ANIMATION
    function drawAnimation(offset) {
        drawBigCircle(offset);
        drawLittleCircle(offset);
    }
    function drawBigCircle(offset) {
        var bigColor = '#' + (offset < LIM ?
            // big color between blue & grey
                fade(offset, LIM, startColor, midColor):
            // big color between gray & orange
                fade(offset - LIM, LIM, midColor, endColor));
        drawCircle(ctx, {
            x: centre.x, y: centre.y, r: bigR, color: bigColor });
    }
    function drawLittleCircle(offset) {
        // draw little white circle
        var littleOffset = {
            x: littleOffsetMax * Math.sin(pi*offset/LIM),
            y: littleOffsetMax * Math.cos(pi*offset/LIM),
        };
        drawCircle(ctx, {
            x: centre.x + littleOffset.x,
            y: centre.y - littleOffset.y,
            r: littleR,
            color: 'white'
        });
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
            drawBigCircle(LIM*2);
            running = false;

            audio.play();
        }
    }

    // init
    (function() {
        function resetTimer() {
            running = false;
            drawBigCircle(0);
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
