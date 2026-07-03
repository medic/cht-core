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

const restoreFocus = (triggerEl) => {
  if (triggerEl && typeof triggerEl.focus === 'function') {
    triggerEl.focus();
  }
};

const hideDatePicker = ($hiddenInput) => {
  const observer = $hiddenInput.data('observer');
  if (observer) {
    observer.disconnect();
    $hiddenInput.removeData('observer');
  }
  const $picker = $hiddenInput.data('picker');
  if ($picker) {
    if ($picker.length) {
      $picker.off('keydown.focusTrap');
      $picker.hide();
    }
  }
  $('.nepali-date-picker-overlay').hide();
  $(document).off('keydown.nepaliDatePicker');

  const triggerEl = $hiddenInput.data('activeElementBeforeShow');
  restoreFocus(triggerEl);
  $hiddenInput.removeData('activeElementBeforeShow');
};

const ensureClearButton = (container, onClear) => {
  const $today = $(container).find('.today-btn');
  if (!$today.length || $(container).find('.clear-btn').length) {
    return;
  }
  const $clear = $(
    '<button type="button" class="clear-btn" title="मिति हटाउनुहोस्" aria-label="मिति हटाउनुहोस्"></button>'
  );
  $clear.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onClear === 'function') {
      onClear();
    }
  });
  $today.after($clear);
};

const performFocusTrap = (e, container, first, last) => {
  const active = document.activeElement;
  const isFirst = active === first || active === container;
  if (e.shiftKey && isFirst) {
    last.focus();
    e.preventDefault();
    return;
  }

  const isLast = active === last || active === container;
  if (!e.shiftKey && isLast) {
    first.focus();
    e.preventDefault();
  }
};

const handleFocusTrap = (e, container) => {
  if (e.key !== 'Tab') {
    return;
  }
  const selector = 'button, select, input, a, [tabindex]:not([tabindex="-1"])';
  const $focusable = $(container).find(selector).filter(':visible');
  if ($focusable.length === 0) {
    return;
  }
  const first = $focusable.first()[0];
  const last = $focusable.last()[0];

  performFocusTrap(e, container, first, last);
};

const initializePickerContainer = (container, $hiddenInput, onClear) => {
  $(container).attr({
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1'
  });
  container.focus();

  if (!$hiddenInput.val()) {
    $(container).find('td.active').removeClass('active');
  }
  sanitizeHrefs(container);
  ensureClearButton(container, onClear);
  
  if (!$(container).find('.close-btn').length) {
    const $closeButton = $('<button type="button" class="close-btn" title="बन्द गर्नुहोस्">&times;</button>');
    $closeButton.on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      hideDatePicker($hiddenInput);
    });
    $(container).append($closeButton);
  }

  const observer = new MutationObserver(() => {
    sanitizeHrefs(container);
    ensureClearButton(container, onClear);
  });
  observer.observe(container, { childList: true, subtree: true });
  $hiddenInput.data('observer', observer);

  $(container).off('keydown.focusTrap').on('keydown.focusTrap', (e) => handleFocusTrap(e, container));
};

const handleDateSelect = (event, onDateSelect) => {
  const data = event.datePickerData;
  if (data && typeof onDateSelect === 'function') {
    onDateSelect(data);
  }
};

const handleClose = ($hiddenInput, onClose) => {
  hideDatePicker($hiddenInput);
  if (typeof onClose === 'function') {
    onClose();
  }
};

const handleShow = ($hiddenInput, onClear) => {
  $hiddenInput.data('activeElementBeforeShow', document.activeElement);

  if ($('.nepali-date-picker-overlay').length) {
    $('.nepali-date-picker-overlay').show();
  } else {
    $('<div class="nepali-date-picker-overlay"></div>').appendTo('body').show();
  }

  const $picker = $hiddenInput.data('picker');
  if ($picker) {
    if ($picker.length) {
      initializePickerContainer($picker[0], $hiddenInput, onClear);
    }
  }

  $('.nepali-date-picker-overlay').off('click').on('click', () => hideDatePicker($hiddenInput));

  $(document).off('keydown.nepaliDatePicker').on('keydown.nepaliDatePicker', function(e) {
    if (e.keyCode === 27) {
      hideDatePicker($hiddenInput);
    }
  });
};

const setupNepaliDatePicker = ($hiddenInput, { onDateSelect, onClose, onClear, closeOnDateSelect = true }) => {
  if (typeof $.fn.nepaliDatePicker !== 'function') {
    return;
  }

  const beforeCount = $('.nepali-date-picker').length;

  $hiddenInput.nepaliDatePicker({
    dateFormat: '%y-%m-%d',
    closeOnDateSelect: closeOnDateSelect
  });

  const afterPickers = $('.nepali-date-picker');
  const container = afterPickers.eq(beforeCount)[0];
  if (container) {
    $hiddenInput.data('picker', $(container));
  }

  $hiddenInput.on('dateSelect', (event) => handleDateSelect(event, onDateSelect));
  $hiddenInput.on('close', () => handleClose($hiddenInput, onClose));
  $hiddenInput.on('show', () => handleShow($hiddenInput, onClear));
};

module.exports = {
  setupNepaliDatePicker,
  hideDatePicker,
};
