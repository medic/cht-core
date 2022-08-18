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
   * Prevent required radio buttons from being unchecked.
   *
   * @extends Widget
   */
class Unselectableradios extends Widget {
  static get selector() {
    // Enketo currently uses `data-required` instead of `required` to denote
    // a required field.
    //
    // This code assumes that we never have dynamically calculated required
    // flags.  See https://github.com/enketo/enketo-core/issues/362 for more
    // discussion.
    return 'input[type=radio][data-required="true()"]';
  }

  _init() {
    $( this.element ).addClass( 'no-unselect' );
  }
}

module.exports = Unselectableradios;
