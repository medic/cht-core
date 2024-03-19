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
const TimerAnimation = require( '../lib/timer-animation' );
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

const DIM = 320;
const DEFAULT_TIME = 60;

/**
 * Countdown timer.
 *
 * @extends Widget
 */

// Remove this when we no longer support countdown timer appearance on notes
const deprecated = {
  selector: '.or-appearance-countdown-timer input',
  getDefaultValue: $el => parseInt($el.val()),
};

class Timerwidget extends Widget {
  static get selector() {
    return `.or-appearance-countdown-timer .option-wrapper input, ${deprecated.selector}`;
  }

  _init() {
    const $el = $( this.element );
    const $wrapper = $el.closest('.or-appearance-countdown-timer');
    const canvas = $('<canvas width="%s" height="%s">'.replace(/%s/g, DIM));
    $wrapper.append(canvas);
    const duration = parseInt($wrapper.attr('data-cht-duration')) || deprecated.getDefaultValue($el) || DEFAULT_TIME;

    // Marks the hidden OK radio button as checked
    const setTimerCompleted = () => $el.prop('checked', true).trigger('change');
    TimerAnimation.animate(canvas[0], duration, setTimerCompleted);
  }
}

module.exports = Timerwidget;
