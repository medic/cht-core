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

    var pluginName = 'simprintswidget';

    /**
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Simprintswidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Simprintswidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Simprintswidget.prototype.constructor = Simprintswidget;

    Simprintswidget.prototype._init = function() {
        var $el = $( this.element );

        $el.find( 'input' ).attr( 'disabled', true );

        if ( !window.medicmobile_android ) {
            $el.append( '<p>Simprints is only supported for android app users.</p>' );
            return;
        }
        if ( !window.medicmobile_android.simprints_reg ) {
            $el.append( '<p>Simprints is not supported on this version of the wrapper app.</p>' );
            return;
        }

        var simprintsInputId = Math.floor(Math.random() * 2147483647); // Java's Integer.MAX_VALUE
        $el.find( 'input' ).attr( 'data-simprints-input-id', simprintsInputId );
        $el.append( '<button class="btn btn-primary" onclick="medicmobile_android.simprints_reg(' + simprintsInputId + ')">Scan Some Digits!</button>' );
    };

    Simprintswidget.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Simprintswidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-simprints',
    };
} );

