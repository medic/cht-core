'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

const pluginName = 'androiddatepicker';

/**
 * Work around a bug in some versions of Android Browser and Android WebView
 * which cause datepickers to fail to re-display after they have been
 * dismissed either by the hardware back-button or by touching the screen
 * outside the datepicker dialog.
 *
 * N.B. this plugin will only work inside an Android application which
 * provides a javascript function to launch an android-java datepicker and
 * handle the selected value.
 *
 * @see https://github.com/enketo/enketo-core/issues/351
 * @see https://github.com/medic/medic-android/blob/30182529f75ce6e37571cdd627cbb3d7c7000845/src/main/java/org/medicmobile/webapp/mobile/MedicAndroidJavascript.java#L91
 * @see https://github.com/medic/medic-android/blob/30182529f75ce6e37571cdd627cbb3d7c7000845/src/main/java/org/medicmobile/webapp/mobile/EmbeddedBrowserActivity.java#L84
 *
 * @constructor
 * @param {Element} element [description]
 * @param {(boolean|{touch: boolean, repeat: boolean})} options options
 * @param {*=} e     event
 */
function Androiddatepicker( element, options ) {
  this.namespace = pluginName;
  Object.assign( this, new Widget( element, options ) );
  this._init();
}

//copy the prototype functions from the Widget super class
Androiddatepicker.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
Androiddatepicker.prototype.constructor = Androiddatepicker;

Androiddatepicker.prototype._init = function() {
  if ( !window.medicmobile_android || typeof window.medicmobile_android.datePicker !== 'function' ) {
    return;
  }

  const el = this.element;
  const angularServices = angular.element( document.body ).injector();
  const Language = angularServices.get( 'Language' );

  Language()
    .then( function( language ) {
      if ( language.indexOf( 'ne' ) === 0 ) {
        return;
      }

      const $el = $( el );
      $el.attr( 'type', 'text' );

      $el.on( 'click', function() {
        // Assign a random ID every time we trigger the click listener.
        // This avoids any potential collisions from e.g. cloned elements.
        // Magic number: 9007199254740991 is Number.MAX_SAFE_INTEGER, but
        // the named constant is not supported everywhere.
        const $el = $(this);
        const randomId = Math.floor( Math.random() * 9007199254740991 );
        const selector = 'input[data-mm-android-dp=' + randomId + ']';
        const val = $el.val();

        $el.attr( 'data-mm-android-dp', randomId );

        if ( val ) {
          window.medicmobile_android.datePicker( selector, val );
        } else {
          window.medicmobile_android.datePicker( selector );
        }
      });
    });
};

Androiddatepicker.prototype.destroy = function( element ) {};  // eslint-disable-line no-unused-vars

$.fn[ pluginName ] = function( options, event ) {
  return this.each( function() {
    const $this = $( this );
    let data = $this.data( pluginName );

    options = options || {};

    if ( !data && typeof options === 'object' ) {
      $this.data( pluginName, ( data = new Androiddatepicker( this, options, event ) ) );
    } else if ( data && typeof options === 'string' ) {
      data[ options ]( this );
    }
  } );
};

Androiddatepicker.selector = 'input[type=date]';
Androiddatepicker.condition = Widget.condition;

module.exports = Androiddatepicker;
