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
  
  // Prepare the DOM
  $realDateInput.addClass('ignore no-validate');
  $parent.children('.widget.date').remove();
  $realDateInput.hide();
  $parent.append(TEMPLATE);
  
  // Initialize bikram_sambat_bs listeners
  bikram_sambat_bs.initListeners($parent, $realDateInput);

  // Set initial date if present
  if (initialVal) {
    bikram_sambat_bs.setDate_greg_text(
      $parent.children('.bikram-sambat-input-group'),
      $realDateInput,
      initialVal
    );
  }

  // Set up the datepicker UI and handlers
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

  // Synchronize any existing values in the fields
  syncInputValues($group);
  
  // Set up the nepali date picker
  setupNepaliDatePicker($group, $calendarButton, $realDateInput);
  
  // Set up manual input handlers
  setupManualInputHandlers($group, $realDateInput);
};

/**
 * Set up the Nepali date picker
 * @param {jQuery} $group - Input group
 * @param {jQuery} $calendarButton - Calendar button
 * @param {jQuery} $realDateInput - Actual date input
 */
const setupNepaliDatePicker = ($group, $calendarButton, $realDateInput) => {
  // Remove any existing datepicker inputs
  $group.find('.nepali-datepicker-input').remove();
  
  // Create hidden input for datepicker
  const $hiddenDateInput = $('<input type="text" class="nepali-datepicker-input">');
  $calendarButton.after($hiddenDateInput);

  // Initialize the datepicker if available
  if (typeof $.fn.nepaliDatePicker === 'function') {
    try {
      // Initialize the date picker with our configuration
      initializeNepaliDatePicker($hiddenDateInput);
      
      // Set up all necessary event handlers
      setupDatePickerHandlers($hiddenDateInput, $calendarButton, $group, $realDateInput);
    } catch (e) {
      console.error('Error initializing date picker:', e);
      handlePickerUnavailable($calendarButton, $group, $realDateInput);
    }
  } else {
    // Handle case when picker library is not available
    handlePickerUnavailable($calendarButton, $group, $realDateInput);
  }
};

/**
 * Initialize the Nepali date picker
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const initializeNepaliDatePicker = ($hiddenDateInput) => {
  // Clean up any existing instances
  try {
    $hiddenDateInput.nepaliDatePicker('hide');
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // Initialize with our configuration
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
 * Set up all datepicker-related event handlers
 * @param {jQuery} $hiddenDateInput - Hidden date input
 * @param {jQuery} $calendarButton - Calendar button
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const setupDatePickerHandlers = ($hiddenDateInput, $calendarButton, $group, $realDateInput) => {
  // Set up calendar button click handler
  setupCalendarButtonHandler($hiddenDateInput, $calendarButton);
  
  // Set up date selection handlers
  setupDateSelectionHandlers($hiddenDateInput, $group, $realDateInput);
  
  // Set up month dropdown click handlers
  setupDropdownHandlers($group, $realDateInput);
};

/**
 * Set up manual input handlers (day, month, year fields)
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const setupManualInputHandlers = ($group, $realDateInput) => {
  // Handle day and year input changes
  $group.find('input[name=day], input[name=year]').on('change keyup', function() {
    updateGregorianDate($group, $realDateInput);
  });
};

/**
 * Handle case when picker is unavailable
 * @param {jQuery} $calendarButton - Calendar button
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const handlePickerUnavailable = ($calendarButton, $group, $realDateInput) => {
  // Disable the calendar button
  $calendarButton.prop('disabled', true).css('opacity', '0.5');
  
  $calendarButton.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.error('Nepali Date Picker library not available. Please enter date manually.');
  });
  
  // Ensure manual entry still works
  setupManualInputHandlers($group, $realDateInput);
};

/**
 * Handle onChange event for date picker
 * @param {Event} event - Change event
 */
const onDatePickerChange = function() {
  const $input = $(this);
  setTimeout(() => {
    $input.trigger('dateChange');
  }, 50);
};

/**
 * Set up calendar button click handler
 * @param {jQuery} $hiddenDateInput - Hidden date input
 * @param {jQuery} $calendarButton - Calendar button
 */
const setupCalendarButtonHandler = ($hiddenDateInput, $calendarButton) => {
  // Remove any existing click handlers
  $calendarButton.off('click');
  
  $calendarButton.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Clean up any existing pickers
    $('.nepali-date-picker').remove();
    $('.nepali-date-picker-overlay').remove();
    
    // Position and prepare the hidden input
    $hiddenDateInput.css({
      'position': 'fixed',
      'left': '-9999px',
      'opacity': '0',
      'z-index': '9999', 
      'pointer-events': 'auto',
      'visibility': 'visible'
    }).focus();
    
    // Clear any existing value
    $hiddenDateInput.val('');
    
    // Show the date picker
    showDatePicker($hiddenDateInput);
  });
};

/**
 * Show the date picker
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const showDatePicker = ($hiddenDateInput) => {
  // Create overlay if not exists
  if (!$('.nepali-date-picker-overlay').length) {
    $('<div class="nepali-date-picker-overlay"></div>').appendTo('body');
  }
  
  // Show the picker
  try {
    $hiddenDateInput.nepaliDatePicker('show');
    
    // Set up the UI after a small delay
    setTimeout(() => setupPickerUI($hiddenDateInput), 100);
  } catch (err) {
    console.error('Error showing date picker:', err);
    $('.nepali-date-picker-overlay').remove();
  }
};

/**
 * Setup the picker UI
 * @param {jQuery} $hiddenDateInput - The hidden date input
 */
const setupPickerUI = ($hiddenDateInput) => {
  // Activate overlay
  $('.nepali-date-picker-overlay').addClass('active');
  
  // Check if picker exists
  if (!$('.nepali-date-picker').length) {
    $('.nepali-date-picker-overlay').removeClass('active');
    $hiddenDateInput.val('');
    return;
  }
  
  // Position and style the picker
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
  
  // Add close button if needed
  addCloseButton($hiddenDateInput);
  
  // Add click handler for overlay
  $('.nepali-date-picker-overlay').off('click').on('click', function() {
    hideDatePicker($hiddenDateInput);
  });
  
  // Add ESC key handler
  $(document).off('keydown.nepaliDatePicker').on('keydown.nepaliDatePicker', function(e) {
    if (e.keyCode === 27) { // Escape key
      hideDatePicker($hiddenDateInput);
    }
  });
};

/**
 * Add a close button to the date picker
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const addCloseButton = ($hiddenDateInput) => {
  if ($('.nepali-date-picker .close-btn').length) {
    return;
  }
  
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
    hideDatePicker($hiddenDateInput);
  });

  // Add button to picker
  $('.nepali-date-picker').css('position', 'relative').append($closeButton);
};

/**
 * Hide the date picker
 * @param {jQuery} $hiddenDateInput - Hidden date input
 */
const hideDatePicker = ($hiddenDateInput) => {
  try {
    $hiddenDateInput.nepaliDatePicker('hide');
  } catch (e) {
    // Non-critical error
  }
  
  // Clean up UI elements
  $('.nepali-date-picker-overlay').removeClass('active').remove();
  $('.nepali-date-picker').remove();
  
  // Remove event handlers
  $(document).off('keydown.nepaliDatePicker');
  
  // Clear hidden input value
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
  // Handle date selection
  $hiddenDateInput.on('dateSelect', function() {
    setTimeout(() => hideDatePicker($hiddenDateInput), 100);
  });

  // Handle date change
  $hiddenDateInput.on('dateChange', function() {
    const selectedDate = $(this).val();
    if (selectedDate) {
      updateFieldsFromDateString(selectedDate, $group, $realDateInput);
    }
  });
};

/**
 * Update fields from date string
 * @param {string} selectedDate - The selected date string
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const updateFieldsFromDateString = (selectedDate, $group, $realDateInput) => {
  try {
    const dateComponents = parseDateString(selectedDate);
    if (!dateComponents) {
      return;
    }
    
    const { year, month, day } = dateComponents;
    
    const monthName = getMonthNameFromNumber(month);
    if (!monthName) {
      return;
    }
    
    // Update UI fields
    updateDateFields($group, day, year, monthName);
    
    // Update the hidden date input
    updateGregorianDate($group, $realDateInput);
  } catch (e) {
    console.warn('Error updating fields from date string:', e);
  }
};

/**
 * Helper function to update the gregorian date input based on the BS inputs
 * @param {jQuery} $group - The input group
 * @param {jQuery} $realDateInput - The actual date input element
 */
const updateGregorianDate = ($group, $realDateInput) => {
  try {
    // Extract and validate inputs
    const dateComponents = extractAndValidateInputs($group);
    if (!dateComponents) {
      return;
    }
    
    // Convert to gregorian date
    const gregDate = convertBsToGregorianDate(dateComponents);
    if (gregDate) {
      // Update the input and trigger events
      updateRealDateInput($realDateInput, gregDate);
    }
  } catch (e) {
    console.error('Error calculating Gregorian date:', e.message);
  }
};

/**
 * Extract and validate input values from the form
 * @param {jQuery} $group - The input group
 * @returns {object|null} Validated date components or null if invalid
 */
const extractAndValidateInputs = ($group) => {
  // Get input values
  const day = $group.find('input[name=day]').val();
  const monthName = $group.find('input[name=month]').val();
  const year = $group.find('input[name=year]').val();
  
  // Check if all values exist
  if (!day || !monthName || !year) {
    return null;
  }
  
  // Convert values if needed
  const dayArabic = convertNepaliDigitsToArabic(day);
  const yearArabic = convertNepaliDigitsToArabic(year);
  const monthNum = getMonthNumberFromName(monthName);
  
  if (!monthNum) {
    return null;
  }
  
  // Parse as numbers
  const dayNum = parseInt(dayArabic, 10);
  const monthNumber = parseInt(monthNum, 10);
  const yearNum = parseInt(yearArabic, 10);
  
  // Validate values
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
  
  // Handle different date formats
  if (dateString.includes('-')) {
    const [year, month, day] = dateString.split('-');
    return { year, month, day };
  } 
  
  if (dateString.includes('/')) {
    const [year, month, day] = dateString.split('/');
    return { year, month, day };
  } 
  
  // Handle Nepali formatted date
  if (dateString.includes(',') || /[\u0900-\u097F]/.test(dateString)) {
    // Extract month name
    const monthName = extractMonthFromFormattedDate(dateString);
    if (!monthName) {
      return null;
    }
    
    // Extract month number
    const month = getMonthNumberFromName(monthName).toString();
    if (!month) {
      return null;
    }
    
    // Extract day and year
    const day = extractDayFromDateString(dateString, monthName);
    const year = extractYearFromDateString(dateString);
    
    // Return null if we couldn't extract all components
    if (!day || !year) {
      return null;
    }
    
    return { year, month, day };
  }
  
  return null;
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
  
  // Standard month names array
  const monthNames = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  
  // Try comma-separated format
  const commaMatch = dateString.match(/,\s*([^\s\d,]+)\s+/);
  if (commaMatch && commaMatch[1]) {
    return commaMatch[1].trim();
  }
  
  // Try start-of-string format
  const startMatch = dateString.match(/^([^\s\d,]+)\s+/);
  if (startMatch && startMatch[1]) {
    return startMatch[1].trim();
  }
  
  // Try direct match against known month names
  for (const monthName of monthNames) {
    if (dateString.includes(monthName)) {
      return monthName;
    }
  }
  
  // Special case for फाल्गुन (Falgun)
  if (dateString.includes('फाल्गु') || dateString.includes('फाल्गुन')) {
    return 'फाल्गुन';
  }
  
  return null;
};

/**
 * Extract day from date string
 * @param {string} dateString - Date string
 * @param {string} monthName - Month name
 * @returns {string|null} Day value or null
 */
const extractDayFromDateString = (dateString, monthName) => {
  if (!monthName || !dateString) {
    return null;
  }
  
  const monthIndex = dateString.indexOf(monthName);
  if (monthIndex === -1) {
    return null;
  }
  
  // Limit the search area
  const startIndex = monthIndex + monthName.length;
  const searchArea = dateString.substr(startIndex, 100);
  
  // Use safer regex pattern
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

/**
 * Set up dropdown handlers
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const setupDropdownHandlers = ($group, $realDateInput) => {
  $group.find('.month-dropdown .dropdown-menu a').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Update month display and value
    const monthName = $(this).text();
    updateMonthSelection($group, monthName);
    
    // Close dropdown
    $group.find('.month-dropdown').removeClass('open');
    
    // Handle the selection
    handleMonthSelection($group, $realDateInput);
  });
};

/**
 * Update month selection in UI
 * @param {jQuery} $group - Input group
 * @param {string} monthName - Month name
 */
const updateMonthSelection = ($group, monthName) => {
  const $monthInput = $group.find('input[name=month]');
  const $monthButton = $group.find('.month-dropdown button');
  $monthInput.val(monthName);
  $monthButton.text(monthName);
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
  
  // Reset focus
  $('body').focus();
  
  // Stop if we don't have all required values
  if (!day || !year) {
    return;
  }
  
  // Validate and adjust day value if needed
  validateAndAdjustDay($group, day, year, monthName);
  
  // Update the gregorian date
  setTimeout(() => {
    updateGregorianDate($group, $realDateInput);
  }, 50);
  
  // Clear any validation errors
  setTimeout(() => {
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
  // Parse values
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
  
  // Check if day exceeds maximum for the month
  const monthNumber = parseInt(monthNum, 10);
  const maxDaysInMonth = getMaxDaysInMonth(yearNum, monthNumber);
  
  if (dayNum > maxDaysInMonth) {
    // Adjust the day value
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
  // Check if original value used Nepali digits
  if (!/[०-९]/.test(originalValue)) {
    return value;
  }
  
  // Convert to Nepali digits
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
  if (!name) {
    return '';
  }
  
  // Standard month names array
  const months = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  
  // Normalize the input
  const normalizedName = name.trim();
  
  // First try exact match
  const index = months.indexOf(normalizedName);
  if (index !== -1) {
    return index + 1;
  }
  
  // Special case for फाल्गुन (Falgun) - month #11
  if (normalizedName.includes('फाल्गु') || 
      normalizedName.includes('फाल्गुन') || 
      normalizedName.startsWith('फा') && normalizedName.length > 2) {
    return 11;
  }
  
  // If exact match fails, try character-by-character comparison
  for (let i = 0; i < months.length; i++) {
    const monthName = months[i];
    
    // Skip if lengths are very different
    if (Math.abs(monthName.length - normalizedName.length) > 2) {
      continue;
    }
    
    // Compare character by character for first few characters
    let match = true;
    const minLength = Math.min(monthName.length, normalizedName.length, 3);
    
    for (let j = 0; j < minLength; j++) {
      if (monthName[j] !== normalizedName[j]) {
        match = false;
        break;
      }
    }
    
    if (match) {
      return i + 1;
    }
  }
  
  return '';
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
      const monthName = getMonthNameFromNumber(monthNum.toString());
      if (monthName) {
        $group.find('input[name=month]').val(monthName);
        $group.find('.month-dropdown button').text(monthName);
      }
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
