{
  'use strict';
  const Widget = require( 'enketo-core/src/js/widget' ).default;
  const $ = require( 'jquery' );
  require('enketo-core/src/js/plugins');

  const pluginName = 'simprintswidget';

  /**
     * @extends Widget
     */
  class Simprintswidget extends Widget {
    static get selector() {
      return '.or-appearance-simprints-reg';
    }

    _init() {
      const $el = $( this.element );
      const $input = $el.find( 'input' );
      $input.attr( 'disabled', true );
      const $translate = window.CHTCore.Translate;
      // todo migrate when simprints are migrated
      //const service = angularServices.get( 'Simprints' );
      const service = {
        enabled: () => {},
        register: () => Promise.resolve(),
      };

      if ( !service.enabled() ) {
        $translate.get( 'simprints.disabled' ).then(function( label ) {
          $el.append( '<p>' + label + '</p>' );
        });
        return;
      }

      $el.on( 'click', '.btn.simprints-register', function() {
        service.register().then( function(simprintsId) {
          $input.val( simprintsId ).trigger( 'change' );
        } );
      } );

      $translate.get( 'simprints.register' ).then( function( label ) {
        $el.append( '<div><a class="btn btn-default simprints-register">' +
          '<img src="/img/simprints.png" width="20" height="20"/> ' + label + '</a>' +
          '</div>' );
      } );
    }
  }

  $.fn[ pluginName ] = function( options, event ) {
    return this.each( function() {
      const $this = $( this );
      let data = $this.data( pluginName );

      options = options || {};

      if ( !data && typeof options === 'object' ) {
        $this.data( pluginName, ( data = new Simprintswidget( this, options, event ) ) );
      } else if ( data && typeof options === 'string' ) {
        data[ options ]( this );
      }
    } );
  };

  module.exports = Simprintswidget;
}
