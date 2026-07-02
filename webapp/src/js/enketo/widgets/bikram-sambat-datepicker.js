'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );
const bikram_sambat_bs = require( 'bikram-sambat-bootstrap' );
const eurodigit = require( 'eurodigit' );
const toDevanagari = eurodigit.to_non_euro.devanagari;
const fromDevanagari = eurodigit.to_euro;

const { setupNepaliDatePicker, hideDatePicker } = require('./bikram-sambat-picker-shared');

const NEPALI_MONTH_NAMES = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
];

class Bikramsambatdatepicker extends Widget {
  static get selector() {
    return 'input[type=date]';
  }

  _init() {
    const el = this.element;

    window.CHTCore.Language
      .get()
      .then( ( language ) => {
        const $el = $( el );

        // Here we support the appearance="bikram-sambat" attribute as
        // well to maintain compatibility with collect.
        if ( language.indexOf( 'ne' ) !== 0 &&
          $el.parent('.or-appearance-bikram-sambat').length === 0) {
          return;
        }

        const $parent = $el.parent();
        const $realDateInput = $parent.children( 'input[type=date]' );
        const initialVal = $realDateInput.val();

        // Remove datepicker-extended widget:
        $parent.children( '.widget.date' ).remove();
        // Hide standard date input (datepicker-extended may not have removed it
        // previously due to badSamsung bug).
        $realDateInput.hide();

        $parent.append( TEMPLATE );

        bikram_sambat_bs.initListeners( $parent, $realDateInput );

        // The bikram-sambat-library converts the date on both
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
        setupCalendarPicker($parent, this);
      });
  }

  destroy( element ) {
    if ( this.$hiddenDateInput ) {
      hideDatePicker(this.$hiddenDateInput);
    }
    $('.nepali-date-picker-overlay').remove();
    $('.nepali-date-picker').remove();
    super.destroy( element );
  }
}

const setupCalendarPicker = ($parent, widget) => {
  const $group = $parent.find('.bikram-sambat-input-group');
  const $calendarBtn = $group.find('.calendar-btn');

  // Create hidden input to attach the nepaliDatePicker instance
  const $hiddenDateInput = $('<input type="text" class="nepali-datepicker-input">');
  $calendarBtn.after($hiddenDateInput);
  widget.$hiddenDateInput = $hiddenDateInput;

  setupNepaliDatePicker($hiddenDateInput, {
    onDateSelect: (data) => {
      const year = data.bsYear;
      const monthNum = data.bsMonth;
      const day = data.bsDate;
      const monthName = NEPALI_MONTH_NAMES[monthNum - 1];
      if (monthName) {
        // Update the input fields with Devanagari digits and trigger change
        $parent.find('input[name="day"]').val(toDevanagari(day.toString())).trigger('change');
        $parent.find('input[name="month"]').val(toDevanagari(monthNum.toString())).trigger('change');
        $parent.find('input[name="year"]').val(toDevanagari(year.toString())).trigger('change').trigger('blur');
        $group.find('.month-dropdown button').html(monthName + ' <span class="caret"></span>');
      }
    },
    onClear: () => {
      $parent.find('input[name="day"]').val('').trigger('change');
      $parent.find('input[name="month"]').val('').trigger('change');
      $parent.find('input[name="year"]').val('').trigger('change').trigger('blur');
      $group.find('.month-dropdown button').html('महिना <span class="caret"></span>');
      $hiddenDateInput.val('');
      const $realDateInput = $parent.children('input[type="date"]');
      $realDateInput.val('').trigger('change');
      hideDatePicker($hiddenDateInput);
    }
  });

  $calendarBtn.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    // Set initial date in picker if inputs are populated
    const dayDev = $parent.find('input[name="day"]').val();
    const monthDev = $parent.find('input[name="month"]').val();
    const yearDev = $parent.find('input[name="year"]').val();

    // Convert Devanagari digits to Latin for parser compatibility
    const day = fromDevanagari(dayDev);
    const monthNumStr = fromDevanagari(monthDev);
    const year = fromDevanagari(yearDev);
    const monthNum = Number.parseInt(monthNumStr, 10);
    
    if (day && year && !Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      $hiddenDateInput.val(toDevanagari(`${year}-${monthNum}-${Number.parseInt(day, 10)}`));
    } else {
      $hiddenDateInput.val('');
    }

    $hiddenDateInput.click();
  });
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
    <button type="button" class="calendar-btn" title="मिति रोज्नुहोस्">
      <span class="calendar-icon"></span>
    </button>
  </div>
`;
