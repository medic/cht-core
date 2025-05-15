'use strict';

const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');
const bikram_sambat_bs = require('bikram-sambat-bootstrap');

bikram_sambat_bs.bs = require('bikram-sambat');

require('nepali-date-picker/dist/nepaliDatePicker.min.js');

// Shared constants
const NEPALI_MONTH_NAMES = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
  'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
];

const NEPALI_TO_ARABIC_DIGITS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

const ARABIC_TO_NEPALI_DIGITS = {
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
};

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
      initializeNepaliDatePicker($hiddenDateInput);
      setupDatePickerHandlers($hiddenDateInput, $group, $realDateInput);
    } catch (e) {
      console.error('Error initializing date picker:', e);
      handlePickerUnavailable($calendarButton, $group, $realDateInput);
    }
  } else {
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
 * @param {jQuery} $group - Input group
 * @param {jQuery} $realDateInput - Actual date input
 */
const setupDatePickerHandlers = ($hiddenDateInput, $group, $realDateInput) => {
  // Set up calendar button click handler
  const $calendarButton = $group.find('.calendar-btn');
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
  $input.trigger('dateChange');
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
    
    // Set up the UI immediately
    setupPickerUI($hiddenDateInput);
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
  $hiddenDateInput.val('');
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
    hideDatePicker($hiddenDateInput);
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
    const gregDate = convertToGregorianDate(dateComponents);
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
  
  return NEPALI_MONTH_NAMES[monthNum - 1];
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
    // Extract components 
    const monthName = extractMonthFromFormattedDate(dateString);
    const month = monthName ? getMonthNumberFromName(monthName).toString() : null;
    const day = monthName ? extractDayFromDateString(dateString, monthName) : null;
    const year = extractYearFromDateString(dateString);
    
    // Return null if we couldn't extract all components
    if (!day || !month || !year) {
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
  
  // Try comma-separated format
  const commaMatch = dateString.match(/,\s*([^\s\d,]+)\s+/);
  if (commaMatch && commaMatch[1]) {
    return commaMatch[1].trim();
  }
  
  // Try direct match against known month names
  for (const monthName of NEPALI_MONTH_NAMES) {
    if (dateString.includes(monthName)) {
      return monthName;
    }
  }
  
  // Special case for फाल्गुन (Falgun)
  if (dateString.includes('फाल्गु') || dateString.includes('फाल्गुन')) {
    return 'फाल्गुन';
  }
  
  // Try start-of-string format
  const startMatch = dateString.match(/^([^\s\d,]+)\s+/);
  if (startMatch && startMatch[1]) {
    return startMatch[1].trim();
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
  
  const startIndex = monthIndex + monthName.length;
  const searchArea = dateString.substr(startIndex, 100);
  
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
  
  // Update the gregorian date and clear validation errors
  updateGregorianDate($group, $realDateInput);
  clearValidationErrors($group);
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
  return value.split('').map(d => ARABIC_TO_NEPALI_DIGITS[d] || d).join('');
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
  
  const event = new Event('oninput', {bubbles: true});
  $realDateInput[0].dispatchEvent(event);
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
  
  // Normalize the input
  const normalizedName = name.trim();
  
  // First try exact match
  const index = NEPALI_MONTH_NAMES.indexOf(normalizedName);
  if (index !== -1) {
    return index + 1;
  }
  
  // Special case for फाल्गुन (Falgun) - month #11
  if (normalizedName.includes('फाल्गु') || 
      normalizedName.includes('फाल्गुन') || 
      (normalizedName.startsWith('फा') && normalizedName.length > 2)) {
    return 11;
  }
  
  // Character-by-character comparison for first few characters
  for (let i = 0; i < NEPALI_MONTH_NAMES.length; i++) {
    const monthName = NEPALI_MONTH_NAMES[i];
    
    // Skip if lengths are very different
    if (Math.abs(monthName.length - normalizedName.length) > 2) {
      continue;
    }
    
    // Compare first few characters
    if (monthName.substring(0, 3) === normalizedName.substring(0, 3)) {
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
  
  const digits = nepaliDigits.toString().split('');
  return digits.map(char => NEPALI_TO_ARABIC_DIGITS[char] || char).join('');
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
 * Convert Bikram Sambat date to Gregorian using available methods
 * @param {object} components - Object with date components
 * @returns {string|null} Gregorian date or null if conversion failed
 */
const convertToGregorianDate = ({ dayNum, monthNumber, yearNum }) => {
  // Try method 1: getDate_greg_text
  if (typeof bikram_sambat_bs.getDate_greg_text === 'function') {
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
      if (result) {
        return result;
      }
    } catch (e) {
      console.error('Error in Bikram Sambat to Gregorian conversion (method 1):', e.message);
    }
  }
  
  // Try method 2: convertBsToAd if available
  if (typeof bikram_sambat_bs.convertBsToAd === 'function') {
    try {
      const formattedDay = dayNum.toString().padStart(2, '0');
      const formattedMonth = monthNumber.toString().padStart(2, '0');
      const bsDate = `${yearNum}-${formattedMonth}-${formattedDay}`;
      
      const result = bikram_sambat_bs.convertBsToAd(bsDate);
      if (result && /^\d{4}-\d{2}-\d{2}$/.test(result)) {
        return result;
      }
    } catch (e) {
      console.error('Error in Bikram Sambat to Gregorian conversion (method 2):', e.message);
    }
  }
  
  // Fallback method for simple conversions - approximate only
  try {
    const bsDate = new Date(yearNum - 57, monthNumber - 1, dayNum);
    const year = bsDate.getFullYear();
    const month = (bsDate.getMonth() + 1).toString().padStart(2, '0');
    const day = bsDate.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('Error in fallback conversion method:', e.message);
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
  
