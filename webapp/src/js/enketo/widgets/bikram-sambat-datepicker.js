'use strict';

const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');
const bikram_sambat_bs = require('bikram-sambat-bootstrap');

bikram_sambat_bs.bs = require('bikram-sambat');

require('nepali-date-picker/dist/nepaliDatePicker.min.js');

class Bikramsambatdatepicker extends Widget {
  static get selector() {
    return 'input[type=date]';
  }

  _init() {
    window.CHTCore.Language.get().then(language => {
      initBikramSambatWidget(this.element, language);
    });
  }
}

/**
 * Initialize the Bikram Sambat Date Widget
 * @param {HTMLElement} el - The date input element
 * @param {string} language - The user's language
 */
const initBikramSambatWidget = (el, language) => {
  const $el = $(el);
  
  // Only initialize for Nepali language or when explicitly requested
  if (language.indexOf('ne') !== 0 && 
      $el.parent('.or-appearance-bikram-sambat').length === 0) {
    return;
  }

  const $parent = $el.parent();
  setupDateInputs($parent);
};

/**
 * Set up date inputs and widgets
 * @param {jQuery} $parent - The parent element
 */
const setupDateInputs = ($parent) => {
  const $realDateInput = $parent.children('input[type=date]');
  const initialVal = $realDateInput.val();
  
  $realDateInput.addClass('ignore no-validate');
  $parent.children('.widget.date').remove();
  $realDateInput.hide();
  $parent.append(TEMPLATE);
  bikram_sambat_bs.initListeners($parent, $realDateInput);

  if (initialVal) {
    bikram_sambat_bs.setDate_greg_text(
      $parent.children('.bikram-sambat-input-group'),
      $realDateInput,
      initialVal
    );
  }

  setupDatePicker($parent, $realDateInput);
};

/**
 * Set up date picker functionality
 * @param {jQuery} $parent - The parent element
 * @param {jQuery} $realDateInput - The actual date input element
 */
const setupDatePicker = ($parent, $realDateInput) => {
  const $group = $parent.find('.bikram-sambat-input-group');
  const $calendarButton = $group.find('.calendar-btn');

  syncInputValues($group);
  const $hiddenDateInput = $('<input type="text" class="nepali-datepicker-input">');
  $calendarButton.after($hiddenDateInput);

  try {
    if (typeof $.fn.nepaliDatePicker === 'function') {
      initializeDatePicker($group, $hiddenDateInput, $calendarButton, $realDateInput);
    } else {
      handlePickerUnavailable($calendarButton, 'Nepali Date Picker library not available. Please enter date manually.');
    }
  } catch (e) {
    console.error('Error initializing date picker:', e);
    handlePickerUnavailable($calendarButton, 'Error initializing date picker. Please enter date manually.');
    // Disable the calendar functionality but keep manual entry working
    disableCalendarFunctionality($group, $realDateInput);
  }
};

/**
 * Initialize date picker functionality
 * @param {jQuery} $group - Input group
 * @param {jQuery} $hiddenDateInput - Hidden date input
 * @param {jQuery} $calendarButton - Calendar button
 * @param {jQuery} $realDateInput - Actual date input
 */
const initializeDatePicker = ($group, $hiddenDateInput, $calendarButton, $realDateInput) => {
  setTimeout(() => {
    try {
      // Initialize picker
      initializeNepaliDatePicker($hiddenDateInput);
      
      // Set up button click handler
      setupCalendarButtonHandler($hiddenDateInput, $calendarButton);
      
      // Set up date selection handlers
      setupDateSelectionHandlers($hiddenDateInput, $group, $realDateInput);
      
      // Set up dropdown click handlers
      setupDropdownHandlers($group, $realDateInput);
      
      // Set up input change handlers
      $group.find('input[name=day], input[name=year]').on('change keyup', function() {
        updateGregorianDate($group, $realDateInput);
      });
    } catch (e) {
      console.error('Error initializing date picker:', e);
      handlePickerUnavailable($calendarButton, 'Error initializing date picker. Please enter date manually.');
      // Disable the calendar functionality but keep manual entry working
      disableCalendarFunctionality($group, $realDateInput);
    }
  }, 100);
};

/**
 * Disable calendar functionality but keep manual entry working
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const disableCalendarFunctionality = ($group, $realDateInput) => {
  $group.find('.calendar-btn').prop('disabled', true).css('opacity', '0.5');
  
  // Ensure manual entry still updates the date
  $group.find('input[name=day], input[name=year]').on('change keyup', function() {
    updateGregorianDate($group, $realDateInput);
  });
};

/**
 * Initialize the Nepali date picker
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const initializeNepaliDatePicker = ($hiddenDateInput) => {
  $hiddenDateInput.nepaliDatePicker({
    ndpYear: true,
    ndpMonth: true,
    ndpYearCount: 10,
    disableAfter: null,
    dateFormat: '%y-%m-%d',
    closeOnDateSelect: true,
    onChange: onDatePickerChange
  });
};

/**
 * Handle onChange event for date picker
 * Extracted to avoid deep nesting
 */
const onDatePickerChange = function() {
  const $input = $(this);
  setTimeout(() => {
    $input.trigger('dateChange');
  }, 50);
};

/**
 * Handle case when picker is unavailable
 * @param {jQuery} $calendarButton - Calendar button
 * @param {string} errorMessage - Error message
 */
const handlePickerUnavailable = ($calendarButton, errorMessage) => {
  $calendarButton.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.error(errorMessage);
  });
};

/**
 * Set up calendar button click handler
 * @param {jQuery} $hiddenDateInput - Hidden date input
 * @param {jQuery} $calendarButton - Calendar button
 */
const setupCalendarButtonHandler = ($hiddenDateInput, $calendarButton) => {
  $calendarButton.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    $hiddenDateInput.css({
      'position': 'fixed',
      'left': '-9999px',
      'opacity': '0',
      'z-index': '9999', 
      'pointer-events': 'auto',
      'visibility': 'visible'
    }).focus();
    
    $hiddenDateInput.val('');
    
    showDatePicker($hiddenDateInput);
  });
};

/**
 * Show the date picker
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const showDatePicker = ($hiddenDateInput) => {
  if (!$('.nepali-date-picker-overlay').length) {
    $('<div class="nepali-date-picker-overlay"></div>').appendTo('body');
  }
  
  try {
    $hiddenDateInput.nepaliDatePicker('show');
    
    // Schedule UI updates without deep nesting
    setTimeout(setupPickerUI, 100, $hiddenDateInput);
  } catch (err) {
    console.error('Error showing date picker:', err);
    handleDatePickerError($hiddenDateInput);
  }
};

/**
 * Setup the picker UI
 * Extracted to avoid deep nesting
 * @param {jQuery} $hiddenDateInput - The hidden date input
 */
const setupPickerUI = ($hiddenDateInput) => {
  $('.nepali-date-picker-overlay').addClass('active');
  
  if (!$('.nepali-date-picker').length) {
    $('.nepali-date-picker-overlay').removeClass('active');
    $hiddenDateInput.val('');
    return;
  }
  
  $('.nepali-date-picker').css({
    'position': 'fixed',
    'top': '50%',
    'left': '50%',
    'transform': 'translate(-50%, -50%)',
    'z-index': '9999',
    'display': 'block',
    'visibility': 'visible',
    'opacity': '1',
    'pointer-events': 'auto'
  });
  
  // Add click handler for overlay
  $('.nepali-date-picker-overlay').on('click', function() {
    hideDatePicker($hiddenDateInput);
    $(this).off('click');
  });
  
  // Add ESC key handler
  $(document).on('keydown.nepaliDatePicker', function(e) {
    if (e.keyCode === 27) { // Escape key
      hideDatePicker($hiddenDateInput);
      $(document).off('keydown.nepaliDatePicker');
    }
  });
};

/**
 * Hide the date picker
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const hideDatePicker = ($hiddenDateInput) => {
  $hiddenDateInput.nepaliDatePicker('hide');
  $('.nepali-date-picker-overlay').removeClass('active');
  
  setTimeout(() => {
    $hiddenDateInput.val('');
  }, 50);
};

/**
 * Handle date picker error
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const handleDatePickerError = ($hiddenDateInput) => {
  $('.nepali-date-picker-overlay').removeClass('active');
  $hiddenDateInput.val('');
  $('.nepali-date-picker').remove();
  
  try {
    setTimeout(() => {
      $hiddenDateInput.nepaliDatePicker({
        ndpYear: true,
        ndpMonth: true,
        ndpYearCount: 10,
        disableAfter: null,
        dateFormat: '%y-%m-%d'
      });
    }, 200);
  } catch (reinitErr) {
    console.warn('Could not reinitialize date picker:', reinitErr);
    // Non-critical error, we can continue without reinitializing
  }
};

/**
 * Set up date selection handlers
 * @param {jQuery} $hiddenDateInput - Hidden date input
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const setupDateSelectionHandlers = ($hiddenDateInput, $group, $realDateInput) => {
  $hiddenDateInput.on('dateSelect', function() {
    // Create a separate function to avoid deep nesting
    handleDateSelect($hiddenDateInput);
  });

  $hiddenDateInput.on('dateChange', function() {
    handleDateChange($(this), $group, $realDateInput);
  });
};

/**
 * Handle date selection
 * Extracted to avoid deep nesting
 * @param {jQuery} $hiddenDateInput - The hidden date input 
 */
const handleDateSelect = ($hiddenDateInput) => {
  setTimeout(cleanupAfterDateSelect, 100, $hiddenDateInput);
};

/**
 * Clean up after date select
 * @param {jQuery} $hiddenDateInput - The hidden date input
 */
const cleanupAfterDateSelect = ($hiddenDateInput) => {
  $('.nepali-date-picker-overlay').removeClass('active');
  $(document).off('keydown.nepaliDatePicker');
  
  try {
    $hiddenDateInput.nepaliDatePicker('hide');
  } catch (e) {
    console.warn('Error hiding date picker:', e);
    // Non-critical error, we can continue without hiding
  }
};

/**
 * Handle date change
 * @param {jQuery} $input - Changed input
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const handleDateChange = ($input, $group, $realDateInput) => {
  const selectedDate = $input.val();
  if (!selectedDate) {
    return;
  }

  try {
    updateFieldsFromDateString(selectedDate, $group, $realDateInput);
  } catch (e) {
    console.warn('Error updating fields from date string:', e);
    // We continue without updating since this is non-critical
  }
};

/**
 * Update fields from date string
 * Extracted to reduce cognitive complexity
 * @param {string} selectedDate - The selected date string
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const updateFieldsFromDateString = (selectedDate, $group, $realDateInput) => {
  const dateComponents = parseDateString(selectedDate);
  if (!dateComponents) {
    return;
  }
  
  const { year, month, day } = dateComponents;
  
  const monthName = getMonthNameFromNumber(month);
  if (!monthName) {
    return;
  }
  
  updateDateFields($group, day, year, monthName);
  updateGregorianDate($group, $realDateInput);
};

/**
 * Get month name from month number
 * @param {string} month - Month number as string
 * @returns {string|null} Month name or null
 */
const getMonthNameFromNumber = (month) => {
  const monthNum = parseInt(convertNepaliDigitsToArabic(month), 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return null;
  }
  
  const monthNames = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  return monthNames[monthNum - 1];
};

/**
 * Update date fields with parsed values
 * @param {jQuery} $group - Input group
 * @param {string} day - Day value
 * @param {string} year - Year value
 * @param {string} monthName - Month name
 */
const updateDateFields = ($group, day, year, monthName) => {
  $group.find('input[name=day]').val(day);
  $group.find('input[name=year]').val(year);
  $group.find('input[name=month]').val(monthName);
  $group.find('.month-dropdown button').text(monthName);
};

/**
 * Parse date string into components
 * @param {string} dateString - Date string to parse
 * @returns {object|null} Date components or null
 */
const parseDateString = (dateString) => {
  if (!dateString) {
    return null;
  }
  
  let year;
  let month;
  let day;
  
  // Handle different date formats
  if (dateString.includes('-')) {
    [year, month, day] = dateString.split('-');
    return { year, month, day };
  } 
  
  if (dateString.includes('/')) {
    [year, month, day] = dateString.split('/');
    return { year, month, day };
  } 
  
  // Handle Nepali formatted date
  if (dateString.includes(',') || /[\u0900-\u097F]/.test(dateString)) {
    return parseFormattedNepaliDate(dateString);
  }
  
  return null;
};

/**
 * Set up dropdown handlers
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const setupDropdownHandlers = ($group, $realDateInput) => {
  $group.find('.month-dropdown .dropdown-menu a').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const monthName = $(this).text();
    const $monthInput = $group.find('input[name=month]');
    const $monthButton = $group.find('.month-dropdown button');
    $monthInput.val(monthName);
    $monthButton.text(monthName);
    $group.find('.month-dropdown').removeClass('open');
    
    handleMonthSelection($group, $realDateInput);
  });
};

/**
 * Handle month selection from dropdown
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const handleMonthSelection = ($group, $realDateInput) => {
  const day = $group.find('input[name=day]').val();
  const year = $group.find('input[name=year]').val();
  const monthName = $group.find('input[name=month]').val();
  
  $('body').focus();
  
  if (!day || !year) {
    return;
  }
  
  validateAndAdjustDay($group, day, year, monthName);
  
  setTimeout(function() {
    const gregDate = calculateGregorianDate($group);
    if (gregDate) {
      $realDateInput[0].value = gregDate;
    }
  }, 50);
  
  setTimeout(function() {
    clearValidationErrors($group);
  }, 100);
};

/**
 * Validate and adjust day value if needed
 * @param {jQuery} $group - Input group
 * @param {string} day - Day value
 * @param {string} year - Year value
 * @param {string} monthName - Month name
 */
const validateAndAdjustDay = ($group, day, year, monthName) => {
  const dayNum = parseInt(convertNepaliDigitsToArabic(day), 10);
  if (isNaN(dayNum)) {
    return;
  }
  
  const monthNum = getMonthNumberFromName(monthName);
  if (!monthNum) {
    return;
  }
  
  const yearNum = parseInt(convertNepaliDigitsToArabic(year), 10);
  if (isNaN(yearNum)) {
    return;
  }
  
  const monthNumber = parseInt(monthNum, 10);
  const maxDaysInMonth = getMaxDaysInMonth(yearNum, monthNumber);
  
  if (dayNum > maxDaysInMonth) {
    let newDayValue = maxDaysInMonth.toString();
    newDayValue = convertToNepaliDigitsIfNeeded(newDayValue, day);
    $group.find('input[name=day]').val(newDayValue);
  }
};

/**
 * Get maximum days in a month
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @returns {number} Maximum days in month
 */
const getMaxDaysInMonth = (yearNum, monthNumber) => {
  if (typeof bikram_sambat_bs.getDaysInMonth === 'function') {
    return bikram_sambat_bs.getDaysInMonth(yearNum, monthNumber);
  }
  
  // Fallback for month days
  const daysInMonthFallback = {
    1: 31, 2: 31, 3: 32, 4: 32, 5: 31, 6: 30, 
    7: 30, 8: 29, 9: 30, 10: 29, 11: 30, 12: 30
  };
  return daysInMonthFallback[monthNumber] || 30;
};

/**
 * Convert to Nepali digits if needed
 * @param {string} value - Value to convert
 * @param {string} originalValue - Original value to check if Nepali digits used
 * @returns {string} Converted value
 */
const convertToNepaliDigitsIfNeeded = (value, originalValue) => {
  if (!/[०-९]/.test(originalValue)) {
    return value;
  }
  
  const arabicToNepaliMap = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  return value.split('').map(d => arabicToNepaliMap[d] || d).join('');
};

/**
 * Clear validation errors
 * @param {jQuery} $group - Input group
 */
const clearValidationErrors = ($group) => {
  const $parent = $group.closest('.bikram-sambat-input-group').parent();
  $group.find('input').css('border-color', '#ccc');
  $group.find('button').css('border-color', '#ccc');
  $parent.removeClass('has-error');
  $parent.closest('.question').removeClass('has-error');
};

/**
 * Helper function to update the gregorian date input based on the BS inputs
 * @param {jQuery} $group - The input group
 * @param {jQuery} $realDateInput - The actual date input element
 */
const updateGregorianDate = ($group, $realDateInput) => {
  try {
    const dateComponents = extractAndValidateInputs($group);
    if (!dateComponents) {
      return;
    }
    
    const gregDate = convertBsToGregorianDate(dateComponents);
    if (gregDate) {
      updateRealDateInput($realDateInput, gregDate);
    }
  } catch (e) {
    console.error('Error calculating Gregorian date:', e.message);
    return null;
  }
};

/**
 * Extract and validate input values from the form
 * @param {jQuery} $group - The input group
 * @returns {object|null} Validated date components or null if invalid
 */
const extractAndValidateInputs = ($group) => {
  const day = $group.find('input[name=day]').val();
  const monthName = $group.find('input[name=month]').val();
  const year = $group.find('input[name=year]').val();
  
  if (!day || !monthName || !year) {
    return null;
  }
  
  const dayArabic = convertNepaliDigitsToArabic(day);
  const yearArabic = convertNepaliDigitsToArabic(year);
  
  const monthNum = getMonthNumberFromName(monthName);
  if (!monthNum) {
    return null;
  }
  
  const dayNum = parseInt(dayArabic, 10);
  const monthNumber = parseInt(monthNum, 10);
  const yearNum = parseInt(yearArabic, 10);
  
  if (isNaN(dayNum) || isNaN(monthNumber) || isNaN(yearNum)) {
    return null;
  }
  
  // Validate day value based on month
  const maxDaysInMonth = getMaxDaysInMonth(yearNum, monthNumber);
  if (dayNum < 1 || dayNum > maxDaysInMonth) {
    return null;
  }
  
  return { dayNum, monthNumber, yearNum };
};

/**
 * Convert BS date to Gregorian date using available methods
 * @param {object} components - Date components
 * @returns {string|null} Gregorian date string or null
 */
const convertBsToGregorianDate = ({ dayNum, monthNumber, yearNum }) => {
  // Try different conversion methods based on what's available
  return tryMethod1(dayNum, monthNumber, yearNum) ||
         tryMethod2(yearNum, monthNumber, dayNum) ||
         tryMethod3(yearNum, monthNumber, dayNum) ||
         tryMethod4(yearNum, monthNumber, dayNum);
};

/**
 * Method 1: Use bikram_sambat_bs's getDate_greg_text function
 * @param {number} dayNum - Day number
 * @param {number} monthNumber - Month number
 * @param {number} yearNum - Year number
 * @returns {string|null} Gregorian date or null
 */
const tryMethod1 = (dayNum, monthNumber, yearNum) => {
  // Check if required function exists
  if (typeof bikram_sambat_bs.getDate_greg_text !== 'function') {
    console.warn('bikram_sambat_bs.getDate_greg_text method is not available');
    return null;
  }
  
  // Validate input parameters
  if (!validateDateParams(dayNum, monthNumber, yearNum)) {
    console.warn('Invalid BS date parameters:', { day: dayNum, month: monthNumber, year: yearNum });
    return null;
  }
  
  try {
    // Create a mock jQuery-like object to use with the conversion function
    const mockJQueryObject = createMockJQueryObject(dayNum, monthNumber, yearNum);
    
    // Perform the conversion
    const result = bikram_sambat_bs.getDate_greg_text(mockJQueryObject);
    
    // Validate the result
    if (!result || typeof result !== 'string' || result.trim().length === 0) {
      console.warn('Empty or invalid result from getDate_greg_text');
      return null;
    }
    
    return result;
  } catch (e) {
    console.error('Error in getDate_greg_text conversion:', e.message);
    return null;
  }
};

/**
 * Validate date parameters for BS date conversion
 * @param {number|string} day - Day value
 * @param {number|string} month - Month value
 * @param {number|string} year - Year value
 * @returns {boolean} True if parameters are valid
 */
const validateDateParams = (day, month, year) => {
  // Check if all parameters exist
  if (day === undefined || month === undefined || year === undefined) {
    return false;
  }
  
  // Convert to numbers if they're strings
  const d = typeof day === 'string' ? parseInt(day, 10) : day;
  const m = typeof month === 'string' ? parseInt(month, 10) : month;
  const y = typeof year === 'string' ? parseInt(year, 10) : year;
  
  // Validate numeric values and range in one condition
  return !(isNaN(d) || isNaN(m) || isNaN(y) || 
         m < 1 || m > 12 || d < 1 || d > 32 || y < 1000 || y > 9999);
};

/**
 * Create a mock jQuery-like object for use with bikram_sambat_bs functions
 * @param {number} day - Day value
 * @param {number} month - Month value
 * @param {number} year - Year value
 * @returns {Object} Mock jQuery object
 */
const createMockJQueryObject = (day, month, year) => {
  return {
    find: (selector) => {
      // Return an object with val() that returns appropriate values based on selector
      return {
        val: () => {
          switch (selector) {
          case '[name=day]': return day;
          case '[name=month]': return month;
          case '[name=year]': return year;
          default: return '';
          }
        }
      };
    }
  };
};

/**
 * Method 2: Try the underlaying bs.toGreg_text function
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {string|null} Gregorian date or null
 */
const tryMethod2 = (yearNum, monthNumber, dayNum) => {
  // Check if the bikram_sambat_bs library and necessary method exist
  if (!bikram_sambat_bs.bs || typeof bikram_sambat_bs.bs.toGreg_text !== 'function') {
    console.warn('bikram_sambat_bs.bs.toGreg_text method is not available');
    return null;
  }
  
  // Validate parameters before performing conversion
  if (!yearNum || !monthNumber || !dayNum || 
      yearNum < 1000 || yearNum > 9999 || 
      monthNumber < 1 || monthNumber > 12 || 
      dayNum < 1 || dayNum > 32) {
    console.warn('Invalid or out of bounds parameters for BS to Gregorian conversion');
    return null;
  }
  
  try {
    // Call the conversion method and handle empty results
    const result = bikram_sambat_bs.bs.toGreg_text(yearNum, monthNumber, dayNum);
    return result && result.trim() !== '' ? result : null;
  } catch (e) {
    console.error('Error converting BS to Gregorian date:', e.message);
    return null;
  }
};

/**
 * Try to convert using bs.toGreg_text method
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {string|null} Gregorian date or null
 */
const tryBsToGregText = (yearNum, monthNumber, dayNum) => {
  // Reuse the existing tryMethod2 implementation to avoid duplication
  return tryMethod2(yearNum, monthNumber, dayNum);
};

/**
 * Method 3: Try custom converter function
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {string|null} Gregorian date or null
 */
const tryMethod3 = (yearNum, monthNumber, dayNum) => {
  // Check if the method is available
  if (typeof bikram_sambat_bs.convertBsToAd !== 'function') {
    console.warn('bikram_sambat_bs.convertBsToAd method is not available');
    return null;
  }
  
  // Ensure we have valid numbers
  if (!yearNum || !monthNumber || !dayNum || 
      isNaN(parseInt(yearNum)) || 
      isNaN(parseInt(monthNumber)) || 
      isNaN(parseInt(dayNum))) {
    console.warn('Invalid parameters for BS to AD conversion');
    return null;
  }
  
  try {
    // Format the date components
    const formattedDay = dayNum.toString().padStart(2, '0');
    const formattedMonth = monthNumber.toString().padStart(2, '0');
    const bsDate = `${yearNum}-${formattedMonth}-${formattedDay}`;
    
    // Perform conversion
    const result = bikram_sambat_bs.convertBsToAd(bsDate);
    
    // Validate result
    if (result && typeof result === 'string' && result.length > 0) {
      return result;
    }
    return null;
  } catch (e) {
    console.error('Error in convertBsToAd:', e.message);
    return null;
  }
};

/**
 * Method 4: Final fallback to bs2ad
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {string|null} Gregorian date or null
 */
const tryMethod4 = (yearNum, monthNumber, dayNum) => {
  // Check method availability
  if (typeof bikram_sambat_bs.bs2ad !== 'function') {
    console.warn('bikram_sambat_bs.bs2ad method is not available');
    return null;
  }
  
  // Validate parameters
  if (!yearNum || !monthNumber || !dayNum) {
    console.warn('Missing parameters for BS to AD conversion');
    return null;
  }
  
  // Verify numeric values
  const yNum = parseInt(yearNum, 10);
  const mNum = parseInt(monthNumber, 10);
  const dNum = parseInt(dayNum, 10);
  
  if (isNaN(yNum) || isNaN(mNum) || isNaN(dNum) || 
      mNum < 1 || mNum > 12 || dNum < 1 || dNum > 32) {
    console.warn('Invalid date values for BS to AD conversion');
    return null;
  }
  
  try {
    // Format date string
    const formattedDay = dNum.toString().padStart(2, '0');
    const formattedMonth = mNum.toString().padStart(2, '0');
    const bsDate = `${yNum}-${formattedMonth}-${formattedDay}`;
    
    // Perform conversion
    const result = bikram_sambat_bs.bs2ad(bsDate);
    return result || null;
  } catch (e) {
    console.error('Error in bs2ad conversion:', e.message);
    // Attempt a simpler fallback conversion if available
    return trySimpleFallbackConversion(yNum, mNum, dNum);
  }
};

/**
 * Try a simple fallback conversion when other methods fail
 * @param {number} year - Year number
 * @param {number} month - Month number
 * @param {number} day - Day number
 * @returns {string|null} Gregorian date or null
 */
const trySimpleFallbackConversion = (year, month, day) => {
  // Simple fallback using a fixed offset approximation for recent years
  // This is not accurate for all dates but provides a reasonable fallback
  try {
    if (year >= 2000 && year <= 2090) {
      // Approximation: BS year is roughly 56/57 years ahead of AD
      const approxAdYear = year - 57;
      const approxDate = new Date(approxAdYear, month - 1, day);
      
      // Format as YYYY-MM-DD
      const adYear = approxDate.getFullYear();
      const adMonth = (approxDate.getMonth() + 1).toString().padStart(2, '0');
      const adDay = approxDate.getDate().toString().padStart(2, '0');
      
      return `${adYear}-${adMonth}-${adDay}`;
    }
    return null;
  } catch (fallbackError) {
    console.error('Fallback conversion also failed:', fallbackError.message);
    return null;
  }
};

/**
 * Update the real date input with the gregorian date
 * @param {jQuery} $realDateInput - The actual date input element
 * @param {string} gregDate - Gregorian date string
 */
const updateRealDateInput = ($realDateInput, gregDate) => {
  $realDateInput[0].value = gregDate;
  
  setTimeout(() => {
    const event = new Event('oninput', {bubbles: true});
    $realDateInput[0].dispatchEvent(event);
  }, 10);
};

module.exports = Bikramsambatdatepicker;

/**
 * Convert Nepali month name to 1-based index
 * @param {string} name - Month name in Nepali
 * @returns {number|string} Month number (1-12) or empty string if not found
 */
const getMonthNumberFromName = (name) => {
  const months = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  const index = months.indexOf(name);
  return index !== -1 ? index + 1 : '';
};

/**
 * Convert Nepali digits to Arabic (Western) digits
 * @param {string} nepaliDigits - String containing Nepali digits
 * @returns {string} Converted string with Arabic digits
 */
const convertNepaliDigitsToArabic = (nepaliDigits) => {
  if (!nepaliDigits) {
    return '';
  }
  
  const nepaliToArabicMap = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  
  const digits = nepaliDigits.toString().split('');
  return digits.map(char => nepaliToArabicMap[char] !== undefined ? nepaliToArabicMap[char] : char).join('');
};

/**
 * Extract month name from a formatted Nepali date string
 * @param {string} dateString - The date string to extract from
 * @returns {string|null} Month name or null if not found
 */
const extractMonthFromFormattedDate = (dateString) => {
  if (!dateString) {
    return null;
  }
 
  // Try comma-separated format
  const commaFormat = extractMonthFromCommaFormat(dateString);
  if (commaFormat) {
    return commaFormat;
  }
  
  // Try start-of-string format
  const startFormat = extractMonthFromStartFormat(dateString);
  if (startFormat) {
    return startFormat;
  }

  // Try direct match against known month names
  return findMonthNameInString(dateString);
};

/**
 * Extract month from comma-separated format
 * @param {string} dateString - Date string
 * @returns {string|null} Month name or null
 */
const extractMonthFromCommaFormat = (dateString) => {
  const monthMatch = dateString.match(/,\s*([^\s\d,]+)\s+/);
  return monthMatch && monthMatch[1] ? monthMatch[1].trim() : null;
};

/**
 * Extract month from start-of-string format
 * @param {string} dateString - Date string
 * @returns {string|null} Month name or null
 */
const extractMonthFromStartFormat = (dateString) => {
  const monthMatch = dateString.match(/^([^\s\d,]+)\s+/);
  return monthMatch && monthMatch[1] ? monthMatch[1].trim() : null;
};

/**
 * Find month name directly in string
 * @param {string} dateString - Date string
 * @returns {string|null} Month name or null
 */
const findMonthNameInString = (dateString) => {
  const monthNames = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  
  for (const monthName of monthNames) {
    if (dateString.includes(monthName)) {
      return monthName;
    }
  }
  
  return null;
};

/**
 * Sync input values to ensure consistent display
 * @param {jQuery} $group - The input group
 */
const syncInputValues = ($group) => {
  try {
    const day = $group.find('input[name=day]').val();
    const monthValue = $group.find('input[name=month]').val();
    const year = $group.find('input[name=year]').val();
    
    // If we don't have all values, nothing to sync
    if (!day || !monthValue || !year) {
      return;
    }
    
    // Update month dropdown display based on the month value
    updateMonthDisplay($group, monthValue);
  } catch (e) {
    console.error('Error syncing input values:', e.message);
  }
};

/**
 * Update month dropdown display based on the month value
 * @param {jQuery} $group - The input group 
 * @param {string} monthValue - The month value
 */
const updateMonthDisplay = ($group, monthValue) => {
  // If monthValue is a name, just update display
  if (isNaN(parseInt(convertNepaliDigitsToArabic(monthValue), 10))) {
    $group.find('.month-dropdown button').text(monthValue);
  } else {
    // If monthValue is a number, convert to name
    const monthNum = parseInt(convertNepaliDigitsToArabic(monthValue), 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const monthNames = [
        'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
        'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
      ];
      const monthName = monthNames[monthNum - 1];
      $group.find('input[name=month]').val(monthName);
      $group.find('.month-dropdown button').text(monthName);
    }
  }
};

/**
 * Calculate Gregorian date from Bikram Sambat date components
 * @param {jQuery} $group - The input group containing date fields
 * @returns {string|null} Gregorian date or null if conversion failed
 */
const calculateGregorianDate = ($group) => {
  try {
    const dateComponents = getDateComponents($group);
    if (!dateComponents) {
      return null;
    }
    
    return convertToGregorianDate(dateComponents);
  } catch (e) {
    console.error('Error calculating Gregorian date:', e.message);
    return null;
  }
};

/**
 * Extract and validate date components from input group
 * @param {jQuery} $group - The input group
 * @returns {object|null} Object with validated date components or null if invalid
 */
const getDateComponents = ($group) => {
  const day = $group.find('input[name=day]').val();
  const monthName = $group.find('input[name=month]').val();
  const year = $group.find('input[name=year]').val();
  
  if (!day || !monthName || !year) {
    return null;
  }
  
  // Convert Nepali digits to Arabic numerals if needed
  const dayArabic = convertNepaliDigitsToArabic(day);
  const yearArabic = convertNepaliDigitsToArabic(year);
  
  // Get month number from name
  const monthNum = getMonthNumberFromName(monthName);
  if (!monthNum) {
    return null;
  }
  
  // Make sure values are valid
  const dayNum = parseInt(dayArabic, 10);
  const monthNumber = parseInt(monthNum, 10);
  const yearNum = parseInt(yearArabic, 10);
  
  if (isNaN(dayNum) || isNaN(monthNumber) || isNaN(yearNum)) {
    return null;
  }
  
  return { dayNum, monthNumber, yearNum };
};

/**
 * Convert Bikram Sambat date to Gregorian using available methods
 * @param {object} components - Object with date components
 * @returns {string|null} Gregorian date or null if conversion failed
 */
const convertToGregorianDate = ({ dayNum, monthNumber, yearNum }) => {
  // Try method 1: getDate_greg_text
  const gregDate1 = tryGetDateGregText(dayNum, monthNumber, yearNum);
  if (gregDate1) {
    return gregDate1;
  }
  
  // Try method 2: bs.toGreg_text
  const gregDate2 = tryBsToGregText(yearNum, monthNumber, dayNum);
  if (gregDate2) {
    return gregDate2;
  }
  
  // Try method 3: convertBsToAd
  const gregDate3 = tryConvertBsToAd(yearNum, monthNumber, dayNum);
  if (gregDate3) {
    return gregDate3;
  }
  
  return null;
};

/**
 * Try to convert using getDate_greg_text method
 * @param {number} dayNum - Day number
 * @param {number} monthNumber - Month number
 * @param {number} yearNum - Year number
 * @returns {string|null} Gregorian date or null
 */
const tryGetDateGregText = (dayNum, monthNumber, yearNum) => {
  // Check availability of the conversion function
  if (typeof bikram_sambat_bs.getDate_greg_text !== 'function') {
    console.warn('bikram_sambat_bs.getDate_greg_text method is not available');
    return null;
  }

  // Validate input parameters before proceeding
  if (!dayNum || !monthNumber || !yearNum || 
      isNaN(parseInt(dayNum)) || 
      isNaN(parseInt(monthNumber)) || 
      isNaN(parseInt(yearNum))) {
    console.warn('Invalid date components for conversion:', dayNum, monthNumber, yearNum);
    return null;
  }
  
  try {
    // Create a mock object with find method that simulates DOM element behavior
    const mockElement = {
      find: function(selector) {
        const inputValueMap = {
          '[name=year]': yearNum,
          '[name=month]': monthNumber,
          '[name=day]': dayNum
        };
        
        return {
          val: function() {
            return inputValueMap[selector] || '';
          }
        };
      }
    };
    
    // Perform the conversion using the mock element
    const result = bikram_sambat_bs.getDate_greg_text(mockElement);
    return result || null;
  } catch (e) {
    console.error('Error in Bikram Sambat to Gregorian conversion:', e.message);
    return null;
  }
};

/**
 * Try to convert using convertBsToAd method
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {string|null} Gregorian date or null
 */
const tryConvertBsToAd = (yearNum, monthNumber, dayNum) => {
  if (!isConversionMethodAvailable()) {
    return null;
  }
  
  if (!isValidDateComponents(yearNum, monthNumber, dayNum)) {
    console.warn('Invalid date components for BS to AD conversion:', {yearNum, monthNumber, dayNum});
    return null;
  }
  
  try {
    return performBsToAdConversion(yearNum, monthNumber, dayNum);
  } catch (e) {
    console.error('Error in Bikram Sambat to AD conversion:', e.message);
    // Try fallback conversion as a recovery strategy
    return trySimpleFallbackConversion(yearNum, monthNumber, dayNum);
  }
};

/**
 * Check if the convertBsToAd method is available
 * @returns {boolean} True if available
 */
const isConversionMethodAvailable = () => {
  if (typeof bikram_sambat_bs.convertBsToAd !== 'function') {
    console.warn('bikram_sambat_bs.convertBsToAd method is not available');
    return false;
  }
  return true;
};

/**
 * Perform the actual BS to AD conversion
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {string|null} Converted date or null
 */
const performBsToAdConversion = (yearNum, monthNumber, dayNum) => {
  const bsDate = formatBsDateString(yearNum, monthNumber, dayNum);
  if (!bsDate) {
    console.warn('Failed to format BS date string for conversion');
    return null;
  }
  
  // Use the conversion function with proper error handling in the caller
  const result = bikram_sambat_bs.convertBsToAd(bsDate);
  
  // Validate the result using a regex check for valid date format YYYY-MM-DD
  if (!result || !/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    console.warn('Conversion result is not in expected format:', result);
    return null;
  }
  
  return result;
};

/**
 * Check if date components are valid
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {boolean} True if valid
 */
const isValidDateComponents = (yearNum, monthNumber, dayNum) => {
  return yearNum && monthNumber && dayNum && 
         !isNaN(yearNum) && !isNaN(monthNumber) && !isNaN(dayNum) &&
         monthNumber >= 1 && monthNumber <= 12 && 
         dayNum >= 1 && dayNum <= 32;
};

/**
 * Format BS date string
 * @param {number} yearNum - Year number
 * @param {number} monthNumber - Month number
 * @param {number} dayNum - Day number
 * @returns {string|null} Formatted date string or null
 */
const formatBsDateString = (yearNum, monthNumber, dayNum) => {
  // Validate inputs first
  if (!yearNum || !monthNumber || !dayNum || 
      isNaN(yearNum) || isNaN(monthNumber) || isNaN(dayNum)) {
    console.warn('Invalid input for BS date string formatting:', {yearNum, monthNumber, dayNum});
    return null;
  }
  
  try {
    const formattedDay = dayNum.toString().padStart(2, '0');
    const formattedMonth = monthNumber.toString().padStart(2, '0');
    return `${yearNum}-${formattedMonth}-${formattedDay}`;
  } catch (e) {
    console.error('Error formatting BS date string:', e.message);
    return null;
  }
};

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

/**
 * Parse a complete Nepali date string
 * @param {string} dateString - The date string to parse
 * @returns {object|null} Parsed date object or null if invalid
 */
const parseFormattedNepaliDate = (dateString) => {
  if (!dateString) {
    return null;
  }
  
  const result = { day: null, month: null, year: null };
  
  // Extract month, then get number
  const monthName = extractMonthFromFormattedDate(dateString);
  if (monthName) {
    result.month = getMonthNumberFromName(monthName).toString();
  }
  
  // Extract day
  result.day = extractDayFromDateString(dateString, monthName);
  
  // Extract year
  result.year = extractYearFromDateString(dateString);
  
  // Return null if we couldn't extract the necessary components
  if (!result.day || !result.month || !result.year) {
    return null;
  }
  
  return result;
};

/**
 * Extract day from date string
 * @param {string} dateString - Date string
 * @param {string} monthName - Month name (optional)
 * @returns {string|null} Day value or null
 */
const extractDayFromDateString = (dateString, monthName) => {
  if (!monthName || !dateString) {
    return null;
  }
  
  // Prevent potential ReDoS by setting a maximum length to search
  const maxSearchLength = 100;
  const monthIndex = dateString.indexOf(monthName);
  
  if (monthIndex === -1) {
    return null;
  }
  
  // Limit the search area to avoid excessive backtracking
  const startIndex = monthIndex + monthName.length;
  const searchArea = dateString.substr(startIndex, maxSearchLength);
  
  // Use a safer regex pattern that avoids catastrophic backtracking
  // Using a non-greedy quantifier and limiting the whitespace pattern
  const dayMatch = searchArea.match(/\s{1,5}([०-९0-9]{1,2})(?!\d)/);
  
  return dayMatch && dayMatch[1] ? dayMatch[1] : null;
};

/**
 * Extract year from date string
 * @param {string} dateString - Date string
 * @returns {string|null} Year value or null
 */
const extractYearFromDateString = (dateString) => {
  const yearMatch = dateString.match(/[०-९\d]{4}/);
  return yearMatch ? yearMatch[0] : null;
};
