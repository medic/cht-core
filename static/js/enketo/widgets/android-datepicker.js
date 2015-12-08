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

    var pluginName = 'androiddatepicker';

    /**
     * Enhances notes
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Androiddatepicker( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Androiddatepicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Androiddatepicker.prototype.constructor = Androiddatepicker;

    Androiddatepicker.prototype._init = function() {
        var $el, randomId, selecter;

        if ( !window.medicmobile_android || !window.medicmobile_android.datePicker ) {
            return;
        }

        randomId = Math.floor( Math.random() * 9007199254740991 );

        $el = $( this.element );

        $el.attr( 'type', 'text' );
        $el.prop( 'disabled', true );

        $el.attr( 'data-mm-android-dp', randomId );
        selecter = 'input[data-mm-android-dp=' + randomId + ']';

        $el.on( 'click', function() {
            var val = $el.val();
            if ( val ) {
                medicmobile_android.datePicker( selecter, val );
            } else {
                medicmobile_android.datePicker( selecter );
            }
        });
    };

    Androiddatepicker.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Androiddatepicker( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'input[type=date]'
    };
} );
