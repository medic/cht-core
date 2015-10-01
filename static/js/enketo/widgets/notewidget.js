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
        markdownToHtml($el.find( '.question-label' ));
        $el.find( '[readonly]' ).addClass( 'ignore' );

        if ( $el.is( '.note' ) && !$el.next().is( '.note' ) ) {
            $el.addClass( 'last-of-class' );
        }
    };

    Notewidget.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

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

/**
 * Supports a small subset of MarkDown and converts this to HTML: _, __, *, **, []()
 * Also converts newline characters
 *
 * Not supported: escaping and other MarkDown syntax
 */
function markdownToHtml( e ) {
    return e.each( function() {
        var html,
            $childStore = $( '<div/>' );
        $( this ).children( ':not(input, select, textarea)' ).each( function( index ) {
            var name = '$$$' + index;
            markdownToHtml( $( this ).clone() ).appendTo( $childStore );
            $( this ).replaceWith( name );
        } );
        html = $( this ).html();
        html = html.replace( /__([^\s][^_]*[^\s])__/gm, '<strong>$1</strong>' );
        html = html.replace( /\*\*([^\s][^\*]*[^\s])\*\*/gm, '<strong>$1</strong>' );
        html = html.replace( /_([^\s][^_]*[^\s])_/gm, '<em>$1</em>' );
        html = html.replace( /\*([^\s][^\*]*[^\s])\*/gm, '<em>$1</em>' );
        //only replaces if url is valid (worthwhile feature?)
        //html = html.replace( /\[(.*)\]\(((https?:\/\/)(([\da-z\.\-]+)\.([a-z\.]{2,6})|(([0-9]{1,3}\.){3}[0-9]{1,3}))([\/\w \.\-]*)*\/?[\/\w \.\-\=\&\?]*)\)/gm, '<a href="$2">$1</a>' );
        html = html.replace( /\[([^\]]*)\]\(([^\)]+)\)/gm, '<a href="$2" target="_blank">$1</a>' );
        html = html.replace( /\n/gm, '<br />' );
        $childStore.children().each( function( i ) {
            var regex = new RegExp( '\\$\\$\\$' + i );
            html = html.replace( regex, $( this )[ 0 ].outerHTML );
        } );
        $( this ).text( '' ).append( html );
    } );
}
