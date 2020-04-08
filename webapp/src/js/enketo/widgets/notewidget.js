if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
  var define = function( factory ) { // eslint-disable-line
    factory( require, exports, module );
  };
}

define( function( require, exports, module ) {

  'use strict';
  const Widget = require( 'enketo-core/src/js/widget' ).default;
  const $ = require( 'jquery' );
  require( 'enketo-core/src/js/plugins' );

  const pluginName = 'notewidget';

  /**
   * Enhances notes
   *
   * @constructor
   * @param {Element} element [description]
   * @param {(boolean|{touch: boolean, repeat: boolean})} options options
   * @param {*=} e     event
   */
  function Notewidget( element ) {
    this.namespace = pluginName;
    this.element = element;
    this._init();
  }

  //copy the prototype functions from the Widget super class
  Notewidget.prototype = Object.create( Widget.prototype );

  //ensure the constructor is the new one
  Notewidget.prototype.constructor = Notewidget;

  Notewidget.prototype._init = function() {
    const $el = $( this.element );
    const markdownToHtml = angular.element(document.body).injector().get('Markdown').element;

    // applyLiveLinkHtml( $el );

    markdownToHtml($el.find( '.question-label' ));

    // applyLiveLinkEventHandlers( $el );

    // $el.find( '[readonly]' ).addClass( 'ignore' );

    // if ( $el.is( '.note' ) && !$el.next().is( '.note' ) ) {
    //   $el.addClass( 'last-of-class' );
    // }
  };

  Notewidget.prototype.destroy = function( element ) {};  // eslint-disable-line no-unused-vars

  // // Replace any markdown-style links containing HTML with hrefs which are
  // // generated when the link is clicked.
  // function applyLiveLinkHtml( $el ) {
  //   // The html may include form inputs with values set via javascript,
  //   // explicitly set value attributes otherwise call html() won't include them
  //   $el.find('input').each(function () {
  //     $(this).attr('value', $(this).val());
  //   });

  //   let html = $el.html();

  //   html = html.replace( /\[([^\]]*)\]\(([^)]*<[^>]*>[^)]*)\)/gm,
  //     '<a class="live-link" href="#" target="_blank" rel="noopener noreferrer">' +
  //       '$1<span class="href" style="display:none">$2</span></a>' );

  //   $el.text( '' ).append( html );
  // }

  // function applyLiveLinkEventHandlers( $el ) {
  //   $el.find( '.live-link' ).each( function() {
  //     const $this = $( this );
  //     $this.on( 'click', function( e ) {
  //       e.originalEvent.currentTarget.href = $( this ).find( '.href' ).text();
  //     } );
  //   } );
  // }

  $.fn[ pluginName ] = function( options, event ) {
    return this.each( function() {
      const $this = $( this );
      let data = $this.data( pluginName );

      options = options || {};
      if ( !data && typeof options === 'object' ) {
        $this.data( pluginName, ( data = new Notewidget( this, options, event ) ) );
      } else if ( data && typeof options === 'string' ) {
        data[ options ]( this );
      }
    } );
  };


  // Notewidget.selector = '.note';
  Notewidget.condition = function() { return false; };

  module.exports = Notewidget;

} );
