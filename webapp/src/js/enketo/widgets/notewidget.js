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

    var pluginName = 'notewidget';

    /**
     * Enhances notes
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Notewidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Notewidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Notewidget.prototype.constructor = Notewidget;

    Notewidget.prototype._init = function() {
        var $el = $( this.element );
        var markdownToHtml = angular.element(document.body).injector().get('Markdown').element;

        applyLiveLinkHtml( $el );

        markdownToHtml($el.find( '.question-label' ));

        applyLiveLinkEventHandlers( $el );

        $el.find( '[readonly]' ).addClass( 'ignore' );

        if ( $el.is( '.note' ) && !$el.next().is( '.note' ) ) {
            $el.addClass( 'last-of-class' );
        }
    };

    Notewidget.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

    // Replace any markdown-style links containing HTML with hrefs which are
    // generated when the link is clicked.
    function applyLiveLinkHtml( $el ) {
        var html = $el.html();

        html = html.replace( /\[([^\]]*)\]\(([^)]*<[^>]*\>[^)]*)\)/gm,
                '<a class="live-link" href="#" target="_blank" rel="noopener noreferrer">$1<span class="href" style="display:none">$2</span></a>' );

        $el.text( '' ).append( html );
    }

    function applyLiveLinkEventHandlers( $el ) {
        $el.find( '.live-link' ).each( function() {
            var $this = $( this );
            $this.on( 'click', function( e ) {
                e.originalEvent.currentTarget.href = $( this ).find( '.href' ).text();
            } );
        } );
    }

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Notewidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.note'
    };
} );
