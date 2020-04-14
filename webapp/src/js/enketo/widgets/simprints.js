'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require('enketo-core/src/js/plugins');

const pluginName = 'simprintswidget';

/**
 * @constructor
 * @param {Element} element [description]
 * @param {(boolean|{touch: boolean, repeat: boolean})} options options
 * @param {*=} e     event
 */
function Simprintswidget( element, options ) {
  this.namespace = pluginName;
  Object.assign( this, new Widget( element, options ) );
  this._init();
}

//copy the prototype functions from the Widget super class
Simprintswidget.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
Simprintswidget.prototype.constructor = Simprintswidget;

Simprintswidget.prototype._init = function() {
  const $el = $( this.element );
  const $input = $el.find( 'input' );
  $input.attr( 'disabled', true );
  const angularServices = angular.element( document.body ).injector();
  const $translate = angularServices.get( '$translate' );
  const service = angularServices.get( 'Simprints' );

  if ( !service.enabled() ) {
    $translate( 'simprints.disabled' ).then(function( label ) {
      $el.append( '<p>' + label + '</p>' );
    });
    return;
  }

  $el.on( 'click', '.btn.simprints-register', function() {
    service.register().then( function(simprintsId) {
      $input.val( simprintsId ).trigger( 'change' );
    } );
  } );

  $translate( 'simprints.register' ).then( function( label ) {
    $el.append( '<div><a class="btn btn-default simprints-register">' +
      '<img src="/img/simprints.png" width="20" height="20"/> ' + label + '</a>' +
    '</div>' );
  } );
};

Simprintswidget.prototype.destroy = function( element ) {};  // eslint-disable-line no-unused-vars

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

Simprintswidget.selector = '.or-appearance-simprints-reg';
Simprintswidget.condition = function() { return true; };

module.exports = Simprintswidget;
