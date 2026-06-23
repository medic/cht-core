'use strict';
/* global globalThis */
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );
const bikram_sambat_bs = require( 'bikram-sambat-bootstrap' );
const eurodigit = require( 'eurodigit' );
const toDevanagari = eurodigit.to_non_euro.devanagari;
const fromDevanagari = eurodigit.to_euro;

// Load the nepali-date-picker jQuery plugin into webpack's local $
// by temporarily making it the global, then restoring the original.
const _prevJQuery = globalThis.jQuery;
const _prev$ = globalThis.$;
try {
  globalThis.jQuery = globalThis.$ = $;
  require( 'nepali-date-picker/dist/nepaliDatePicker.min.js' );
} finally {
  globalThis.jQuery = _prevJQuery;
  globalThis.$ = _prev$;
}

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
      .then( ( language ) => {
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
        setupCalendarPicker($parent, this);
      });
  }

  destroy( element ) {
    if ( this.$hiddenDateInput ) {
      const observer = this.$hiddenDateInput.data('observer');
      if ( observer ) {
        observer.disconnect();
      }
    }
    $('.nepali-date-picker-overlay').remove();
    $('.nepali-date-picker').remove();
    $(document).off('keydown.nepaliDatePicker');
    super.destroy( element );
  }
}

const setupCalendarPicker = ($parent, widget) => {
  const $group = $parent.find('.bikram-sambat-input-group');
  const $calendarBtn = $group.find('.calendar-btn');

  const preventDefaultClick = (ev) => {
    ev.preventDefault();
  };

  const sanitizeHrefs = (container) => {
    $(container).find('a').each(function() {
      const $a = $(this);
      const href = $a.attr('href') || '';
      if (href.startsWith('javascript:')) {
        $a.attr('href', '#');
        $a.off('click.csp').on('click.csp', preventDefaultClick);
      }
    });
  };

  // Create hidden input to attach the nepaliDatePicker instance
  const $hiddenDateInput = $('<input type="text" class="nepali-datepicker-input">');
  $calendarBtn.after($hiddenDateInput);
  widget.$hiddenDateInput = $hiddenDateInput;

  if (typeof $.fn.nepaliDatePicker !== 'function') {
    $calendarBtn.prop('disabled', true).css('opacity', '0.5');
    return;
  }

  // Initialize nepaliDatePicker once
  $hiddenDateInput.nepaliDatePicker({
    dateFormat: '%y-%m-%d',
    closeOnDateSelect: true
  });

  // Handle date selection event from picker
  $hiddenDateInput.on('dateSelect', function(event) {
    const data = event.datePickerData;
    if (data) {
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
      hideDatePicker();
    }
  });

  const hideDatePicker = () => {
    const observer = $hiddenDateInput.data('observer');
    if (observer) {
      observer.disconnect();
      $hiddenDateInput.removeData('observer');
    }
    $('.nepali-date-picker').hide();
    $('.nepali-date-picker-overlay').hide();
    $(document).off('keydown.nepaliDatePicker');
  };

  $hiddenDateInput.on('close', function() {
    hideDatePicker();
  });

  $hiddenDateInput.on('show', function() {
    // Show backdrop overlay if it doesn't exist
    if ($('.nepali-date-picker-overlay').length) {
      $('.nepali-date-picker-overlay').show();
    } else {
      $('<div class="nepali-date-picker-overlay"></div>').appendTo('body').show();
    }

    // Observe the calendar container to dynamically remove javascript: hrefs on redraws (CSP fix)
    const container = document.querySelector('.nepali-date-picker');
    if (container) {
      sanitizeHrefs(container);
      const observer = new MutationObserver(() => sanitizeHrefs(container));
      observer.observe(container, { childList: true, subtree: true });
      $hiddenDateInput.data('observer', observer);
    }

    // Add close button
    if (!$('.nepali-date-picker .close-btn').length) {
      const $closeButton = $('<button type="button" class="close-btn" title="बन्द गर्नुहोस्">&times;</button>');
      $closeButton.on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        hideDatePicker();
      });
      $('.nepali-date-picker').append($closeButton);
    }

    // Add overlay click to dismiss
    $('.nepali-date-picker-overlay').off('click').on('click', hideDatePicker);

    // Add ESC key dismiss
    $(document).off('keydown.nepaliDatePicker').on('keydown.nepaliDatePicker', function(e) {
      if (e.keyCode === 27) {
        hideDatePicker();
      }
    });
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
