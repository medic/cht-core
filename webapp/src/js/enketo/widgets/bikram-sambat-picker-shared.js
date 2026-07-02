'use strict';
/* global globalThis */
const $ = require('jquery');

// Load the nepali-date-picker jQuery plugin into webpack's local $
// by temporarily making it the global, then restoring the original.
const _prevJQuery = globalThis.jQuery;
const _prev$ = globalThis.$;
try {
  globalThis.jQuery = globalThis.$ = $;
  require('nepali-date-picker/dist/nepaliDatePicker.min.js');
} finally {
  globalThis.jQuery = _prevJQuery;
  globalThis.$ = _prev$;
}

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

const hideDatePicker = ($hiddenInput) => {
  const observer = $hiddenInput.data('observer');
  if (observer) {
    observer.disconnect();
    $hiddenInput.removeData('observer');
  }
  $('.nepali-date-picker').hide();
  $('.nepali-date-picker-overlay').hide();
  $(document).off('keydown.nepaliDatePicker');
};

const ensureClearButton = (container, onClear) => {
  const $today = $(container).find('.today-btn');
  if (!$today.length || $(container).find('.clear-btn').length) {
    return;
  }
  const $clear = $('<a href="#" class="clear-btn" title="मिति हटाउनुहोस्"></a>');
  $clear.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onClear === 'function') {
      onClear();
    }
  });
  $today.after($clear);
};

const setupNepaliDatePicker = ($hiddenInput, { onDateSelect, onClose, onClear }) => {
  if (typeof $.fn.nepaliDatePicker !== 'function') {
    return;
  }

  $hiddenInput.nepaliDatePicker({
    dateFormat: '%y-%m-%d',
    closeOnDateSelect: false
  });

  $hiddenInput.on('dateSelect', function(event) {
    const data = event.datePickerData;
    if (data && typeof onDateSelect === 'function') {
      onDateSelect(data);
    }
  });

  $hiddenInput.on('close', function() {
    hideDatePicker($hiddenInput);
    if (typeof onClose === 'function') {
      onClose();
    }
  });

  $hiddenInput.on('show', function() {
    if ($('.nepali-date-picker-overlay').length) {
      $('.nepali-date-picker-overlay').show();
    } else {
      $('<div class="nepali-date-picker-overlay"></div>').appendTo('body').show();
    }

    const container = document.querySelector('.nepali-date-picker');
    if (container) {
      sanitizeHrefs(container);
      ensureClearButton(container, onClear);
      const observer = new MutationObserver(() => {
        sanitizeHrefs(container);
        ensureClearButton(container, onClear);
      });
      observer.observe(container, { childList: true, subtree: true });
      $hiddenInput.data('observer', observer);
    }

    if (!$('.nepali-date-picker .close-btn').length) {
      const $closeButton = $('<button type="button" class="close-btn" title="बन्द गर्नुहोस्">&times;</button>');
      $closeButton.on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        hideDatePicker($hiddenInput);
      });
      $('.nepali-date-picker').append($closeButton);
    }

    $('.nepali-date-picker-overlay').off('click').on('click', () => hideDatePicker($hiddenInput));

    $(document).off('keydown.nepaliDatePicker').on('keydown.nepaliDatePicker', function(e) {
      if (e.keyCode === 27) {
        hideDatePicker($hiddenInput);
      }
    });
  });
};

module.exports = {
  setupNepaliDatePicker,
  hideDatePicker,
};
