'use strict';
/* global globalThis */
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );
const bikram_sambat_bs = require( 'bikram-sambat-bootstrap' );

// Load the nepali-date-picker jQuery plugin into webpack's local $
// by temporarily making it the global, then restoring the original.
const _prevJQuery = globalThis.jQuery;
const _prev$ = globalThis.$;
globalThis.jQuery = globalThis.$ = $;
require( 'nepali-date-picker/dist/nepaliDatePicker.min.js' );
globalThis.jQuery = _prevJQuery;
globalThis.$ = _prev$;

const NEPALI_MONTH_NAMES = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
];

class Bikramsambatdatepicker extends Widget {
  static get selector() {
    return 'input[type=date]';
  }

  _init() {
    const el = this.element;

    globalThis.CHTCore.Language
      .get()
      .then( function( language ) {
        const $el = $( el );

        if ( language.indexOf( 'ne' ) !== 0 &&
          $el.parent('.or-appearance-bikram-sambat').length === 0) {
          return;
        }

        const $parent = $el.parent();
        const $realDateInput = $parent.children( 'input[type=date]' );
        const initialVal = $realDateInput.val();

        // Remove datepicker-extended widget:
        $parent.children( '.widget.date' ).remove();
        // Hide standard date input
        $realDateInput.hide();

        $parent.append( TEMPLATE );

        bikram_sambat_bs.initListeners( $parent, $realDateInput );

        // The bikram-sambat-bootstrap library converts the date on both
        // "change" and "blur" of the day/year inputs, but the month input
        // is type="hidden" and only gets a value when the user clicks the
        // dropdown. If day/year are entered without selecting a month, the
        // library converts with an empty month, defaulting to Baisakh
        // (month 1), and writes that incorrect date to the real date input.
        //
        // A guard on "change" alone is not enough: the library's own "blur"
        // handler fires after a delegated "blur"/"focusout" guard, so it
        // would overwrite a cleared value with the incorrect date again.
        // To win that race, the guard re-checks on the next tick (via
        // setTimeout) after both "change" and "blur", once the library's
        // own handlers have finished running.
        const clearIfIncomplete = () => {
          const day   = $parent.find( 'input[name="day"]' ).val();
          const month = $parent.find( 'input[name="month"]' ).val();
          const year  = $parent.find( 'input[name="year"]' ).val();

          if ( !day || !month || !year ) {
            $realDateInput.val( '' );
            $realDateInput.trigger( 'change' );
          }
        };

        $parent.on( 'change blur', 'input', function( event ) {
          if ( $( event.target ).is( $realDateInput ) ) {
            return;
          }
          clearIfIncomplete();
          // Re-check after the library's own change/blur handlers have run,
          // in case they wrote a value back after our guard cleared it.
          setTimeout( clearIfIncomplete, 0 );
        });

        if ( initialVal ) {
          bikram_sambat_bs.setDate_greg_text(
            $parent.children( '.bikram-sambat-input-group' ),
            $realDateInput,
            initialVal 
          );
        }

        // Initialize Nepali Calendar Popup picker
        setupCalendarPicker($parent);
      });
  }
}

const setupCalendarPicker = ($parent) => {
  const $group = $parent.find('.bikram-sambat-input-group');
  const $calendarBtn = $group.find('.calendar-btn');

  // Create hidden input to attach the nepaliDatePicker instance
  const $hiddenDateInput = $('<input type="text" class="nepali-datepicker-input">');
  $calendarBtn.after($hiddenDateInput);

  if (typeof $.fn.nepaliDatePicker !== 'function') {
    $calendarBtn.prop('disabled', true).css('opacity', '0.5');
    return;
  }

  // Initialize nepaliDatePicker
  $hiddenDateInput.nepaliDatePicker({
    ndpYear: true,
    ndpMonth: true,
    ndpYearCount: 200,
    disableAfter: null,
    dateFormat: '%y-%m-%d',
    closeOnDateSelect: true
  });

  // Handle date selection event from picker
  $hiddenDateInput.on('dateSelect', function(event) {
    const data = event.datePickerData;
    if (!data) {
      return;
    }
    const year = data.bsYear;
    const monthNum = data.bsMonth;
    const day = data.bsDate;

    const monthName = NEPALI_MONTH_NAMES[monthNum - 1];
    if (monthName) {
      // Update the input fields and trigger change
      $parent.find('input[name="day"]').val(day).trigger('change');
      $parent.find('input[name="month"]').val(monthName).trigger('change');
      $parent.find('input[name="year"]').val(year).trigger('change').trigger('blur');
      $group.find('.month-dropdown button').text(monthName);
    }
    hideDatePicker();
  });

  const hideDatePicker = () => {
    try {
      $hiddenDateInput.nepaliDatePicker('hide');
    } catch (e) {
      console.debug('Error hiding date picker:', e);
    }
    $('.nepali-date-picker-overlay').remove();
    $('.nepali-date-picker').remove();
    $(document).off('keydown.nepaliDatePicker');
  };

  const showDatePicker = () => {
    // Clean up any existing overlays
    $('.nepali-date-picker').remove();
    $('.nepali-date-picker-overlay').remove();

    // Set initial date in picker if inputs are populated
    const day = $parent.find('input[name="day"]').val();
    const monthName = $parent.find('input[name="month"]').val();
    const year = $parent.find('input[name="year"]').val();
    const monthIndex = NEPALI_MONTH_NAMES.indexOf(monthName);
    
    if (day && year && monthIndex !== -1) {
      const monthNum = (monthIndex + 1).toString().padStart(2, '0');
      const dayNum = Number.parseInt(day, 10).toString().padStart(2, '0');
      $hiddenDateInput.val(`${year}-${monthNum}-${dayNum}`);
    } else {
      $hiddenDateInput.val('');
    }

    // Create backdrop overlay
    $('<div class="nepali-date-picker-overlay"></div>').appendTo('body');

    try {
      $hiddenDateInput.nepaliDatePicker('show');

      // Style and center the calendar container
      $('.nepali-date-picker').css({
        'position': 'fixed',
        'top': '50%',
        'left': '50%',
        'transform': 'translate(-50%, -50%)',
        'z-index': '9999',
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1'
      });

      // Add close button
      if (!$('.nepali-date-picker .close-btn').length) {
        const $closeButton = $('<button type="button" class="close-btn" title="Close">&times;</button>');
        $closeButton.css({
          'position': 'absolute',
          'top': '-8px',
          'right': '-7px',
          'background': 'transparent',
          'border': 'none',
          'font-size': '20px',
          'cursor': 'pointer',
          'z-index': '10000'
        });
        $closeButton.on('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          hideDatePicker();
        });
        $('.nepali-date-picker').css('position', 'relative').append($closeButton);
      }

      // Add overlay click to dismiss
      $('.nepali-date-picker-overlay').off('click').on('click', hideDatePicker);

      // Add ESC key dismiss
      $(document).off('keydown.nepaliDatePicker').on('keydown.nepaliDatePicker', function(e) {
        if (e.keyCode === 27) {
          hideDatePicker();
        }
      });

    } catch (e) {
      console.error('Error opening date picker:', e);
      $('.nepali-date-picker-overlay').remove();
    }
  };

  $calendarBtn.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showDatePicker();
  });

  // Event listener for dateSelect is handled above
};

module.exports = Bikramsambatdatepicker;

const TEMPLATE = `
  <div class="input-group bikram-sambat-input-group bikram-sambat-widget">
    <input name="day" type="tel" class="form-control devanagari-number-input day-field" 
      placeholder="गते" aria-label="गते" maxlength="2">
    <input name="month" type="hidden">
    <div class="input-group-btn month-dropdown">
      <button type="button" class="btn btn-default dropdown-toggle" 
        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        महिना <span class="caret"></span>
      </button>
      <ul class="dropdown-menu">
        <li><a>बैशाख</a></li>
        <li><a>जेठ</a></li>
        <li><a>असार</a></li>
        <li><a>साउन</a></li>
        <li><a>भदौ</a></li>
        <li><a>असोज</a></li>
        <li><a>कार्तिक</a></li>
        <li><a>मंसिर</a></li>
        <li><a>पौष</a></li>
        <li><a>माघ</a></li>
        <li><a>फाल्गुन</a></li>
        <li><a>चैत</a></li>
      </ul>
    </div>
    <input name="year" type="tel" class="form-control devanagari-number-input year-field" 
      placeholder="साल" aria-label="साल" maxlength="4">
    <button type="button" class="calendar-btn" title="Choose date">
      <span class="calendar-icon"></span>
    </button>
  </div>
`;
