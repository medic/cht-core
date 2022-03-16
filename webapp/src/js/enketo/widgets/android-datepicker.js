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
'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

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
   * @extends Widget
   */
class Androiddatepicker extends Widget {
  static get selector() {
    return 'input[type=date]';
  }

  _init() {
    if ( !window.medicmobile_android || typeof window.medicmobile_android.datePicker !== 'function' ) {
      return;
    }

    const el = this.element;

    window.CHTCore.Language
      .get()
      .then( function( language ) {
        if ( language.indexOf( 'ne' ) === 0 ) {
          return;
        }

        const $el = $( el );
        $el.attr( 'type', 'text' );

        // Prevent accidentally triggering the keyboard when the input element gets focus.
        // (When a page is opened, Enketo focuses on the first element on the page.)
        $el.prop('readonly', true);

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
  }
}

module.exports = Androiddatepicker;
