'use strict';

const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');
const bikram_sambat_bs = require('bikram-sambat-bootstrap');

// Add access to the underlying bikram-sambat module if available
try {
  // Try to get direct access to the underling bikram-sambat library if available
  bikram_sambat_bs.bs = require('bikram-sambat');
} catch (e) {
  console.warn('Failed to directly load bikram-sambat module:', e);
}

// Try to load nepali-date-picker in different ways to ensure it's available
try {
  require('nepali-date-picker/dist/nepaliDatePicker.min.js');
} catch(e) {
  console.warn('Failed to load nepali-date-picker module:', e);
  // Try to load it from the global context if it's added via script tag
  if (typeof window !== 'undefined' && !window.nepaliDatePicker) {
    console.warn('nepaliDatePicker not found in window context either');
  }
}

class Bikramsambatdatepicker extends Widget {
  static get selector() {
    return 'input[type=date]';
  }

  _init() {
    const el = this.element;

    window.CHTCore.Language.get().then(function (language) {
      const $el = $(el);

      if (
        language.indexOf('ne') !== 0 &&
        $el.parent('.or-appearance-bikram-sambat').length === 0
      ) {
        return;
      }

      const $parent = $el.parent();
      const $realDateInput = $parent.children('input[type=date]');
      const initialVal = $realDateInput.val();

      // Remove existing widgets if any
      $parent.children('.widget.date').remove();
      $realDateInput.hide();

      // Inject the widget template
      $parent.append(TEMPLATE);

      // Inject required styles
      addNepalDatePickerCSS();

      // Init listeners for syncing BS ↔ Gregorian
      bikram_sambat_bs.initListeners($parent, $realDateInput);

      if (initialVal) {
        bikram_sambat_bs.setDate_greg_text(
          $parent.children('.bikram-sambat-input-group'),
          $realDateInput,
          initialVal
        );
      }

      const $group = $parent.find('.bikram-sambat-input-group');
      const $calendarButton = $group.find('.calendar-btn');

      // Also sync the values when the form is initialized
      syncInputValues($group);

      // Add hidden input and initialize it
      const $hiddenDateInput = $('<input type="text" class="nepali-datepicker-input">');
      $calendarButton.after($hiddenDateInput);

      try {
        // Check if nepaliDatePicker exists and initialize it
        if (typeof $.fn.nepaliDatePicker === 'function') {
          // Delay init until input is added to DOM
          setTimeout(() => {
            // Configure nepali date picker
            $hiddenDateInput.nepaliDatePicker({
              ndpYear: true,
              ndpMonth: true,
              ndpYearCount: 10,
              disableAfter: null,
              dateFormat: '%y-%m-%d',
              closeOnDateSelect: true,
              onChange: function() {
                // Trigger dateChange event which our code will handle
                setTimeout(() => {
                  $(this).trigger('dateChange');
                }, 50);
              }
            });

            // Show calendar on button click
            $calendarButton.on('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // Make sure the nepaliDatePicker input is visible when clicked
              // This ensures the library can properly attach the calendar
              $hiddenDateInput.css({
                'position': 'fixed',
                'left': '-9999px',
                'opacity': '0',
                'z-index': '9999', 
                'pointer-events': 'auto',
                'visibility': 'visible'
              }).focus();
              
              // Add overlay to handle clicks outside
              if (!$('.nepali-date-picker-overlay').length) {
                $('<div class="nepali-date-picker-overlay"></div>').appendTo('body');
              }
              
              // Force the date picker to show
              try {
                $hiddenDateInput.nepaliDatePicker('show');
                
                // Position the calendar in the center of the screen
                setTimeout(() => {
                  $('.nepali-date-picker-overlay').addClass('active');
                  
                  if ($('.nepali-date-picker').length) {
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
                    
                    // Handle clicks outside to close
                    $('.nepali-date-picker-overlay').on('click', function(e) {
                      $hiddenDateInput.nepaliDatePicker('hide');
                      $('.nepali-date-picker-overlay').removeClass('active');
                      $(this).off('click');
                    });
                    
                    // Handle Escape key to close the date picker
                    $(document).on('keydown.nepaliDatePicker', function(e) {
                      if (e.keyCode === 27) { // Escape key
                        $hiddenDateInput.nepaliDatePicker('hide');
                        $('.nepali-date-picker-overlay').removeClass('active');
                        $(document).off('keydown.nepaliDatePicker');
                      }
                    });
                  }
                }, 100);
              } catch(err) {
                console.error('Error showing date picker:', err);
              }
            });

            // When date is selected, close the picker
            $hiddenDateInput.on('dateSelect', function() {
              setTimeout(() => {
                $('.nepali-date-picker-overlay').removeClass('active');
                $(document).off('keydown.nepaliDatePicker');
              }, 100);
            });

            // Sync selected date to inputs
            $hiddenDateInput.on('dateChange', function () {
              const selectedDate = $(this).val();
              if (!selectedDate) return;

              try {
                console.log('Received date from picker:', selectedDate);
                
                // Extract date components from selected date
                let year, month, day;
                
                if (selectedDate.includes('-')) {
                  // Handle format like "2080-05-15"
                  [year, month, day] = selectedDate.split('-');
                } else if (selectedDate.includes('/')) {
                  // Handle format like "2080/05/15"
                  [year, month, day] = selectedDate.split('/');
                } else if (selectedDate.includes(',') || /[^\x00-\x7F]/.test(selectedDate)) {
                  // Handle Nepali formatted date (contains commas or non-ASCII characters)
                  console.log('Parsing formatted date:', selectedDate);
                  const parsedDate = parseFormattedNepaliDate(selectedDate);
                  
                  if (parsedDate) {
                    console.log('Parsed date components:', parsedDate);
                    year = parsedDate.year;
                    month = parsedDate.month;
                    day = parsedDate.day;
                  } else {
                    console.error('Failed to parse formatted date:', selectedDate);
                    return;
                  }
                } else {
                  console.error('Unexpected date format:', selectedDate);
                  return;
                }

                // Keep original Nepali digits when possible, but ensure valid values
                console.log('Extracted date components:', { day, month, year });
                
                // Make sure we have month as a number before converting to name
                const monthNum = parseInt(convertNepaliDigitsToArabic(month), 10);
                if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                  console.error('Invalid month number:', month);
                  return;
                }
                
                // Get month name for display and storage
                const monthNames = [
                  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
                  'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
                ];
                const monthName = monthNames[monthNum - 1];
                
                // Set values in the input fields (preserve Nepali digits if present)
                $group.find('input[name=day]').val(day);
                $group.find('input[name=year]').val(year);
                
                // Update month dropdown display and set hidden input to month name
                $group.find('input[name=month]').val(monthName);
                $group.find('.month-dropdown button').text(monthName);
                
                console.log('Setting form values:', { 
                  day: day, 
                  month: monthName, 
                  year: year 
                });
                
                // Update the gregorian date using bikram_sambat_bs methods
                updateGregorianDate($group, $realDateInput);
              } catch (error) {
                console.error('Error processing selected date:', error);
              }
            });

            // Also handle when users directly select from the month dropdown
            $group.find('.month-dropdown .dropdown-menu a').on('click', function(e) {
              e.preventDefault();
              const monthName = $(this).text();
              $group.find('input[name=month]').val(monthName);
              $group.find('.month-dropdown button').text(monthName);
              $group.find('.month-dropdown').removeClass('open');
              
              // Update the gregorian date input
              updateGregorianDate($group, $realDateInput);
            });

            // Handle changes in day and year inputs
            $group.find('input[name=day], input[name=year]').on('change keyup', function() {
              updateGregorianDate($group, $realDateInput);
            });
            
          }, 100); // Increased delay for better reliability
        } else {
          // Fallback if nepaliDatePicker is not available
          console.warn('nepaliDatePicker not found. Using fallback approach.');
          
          // Handle the calendar button click with a simple toggle of dropdown
          $calendarButton.on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            alert('Nepali Date Picker library not available. Please enter date manually.');
          });
        }
      } catch (err) {
        console.error('Error initializing nepaliDatePicker:', err);
        $calendarButton.on('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          alert('Error initializing date picker. Please enter date manually.');
        });
      }
    });
  }
}

// Helper function to update the gregorian date input based on the BS inputs
function updateGregorianDate($group, $realDateInput) {
  try {
    const day = $group.find('input[name=day]').val();
    const monthName = $group.find('input[name=month]').val();
    const year = $group.find('input[name=year]').val();
    
    if (day && monthName && year) {
      // Convert Nepali digits to Arabic numerals if needed for calculation
      const dayArabic = convertNepaliDigitsToArabic(day);
      const yearArabic = convertNepaliDigitsToArabic(year);
      
      // Get month number from name
      const monthNum = getMonthNumberFromName(monthName);
      if (!monthNum) {
        console.warn('Invalid month name:', monthName);
        return;
      }
      
      // Make sure values are valid
      const dayNum = parseInt(dayArabic, 10);
      const monthNumber = parseInt(monthNum, 10);
      const yearNum = parseInt(yearArabic, 10);
      
      if (isNaN(dayNum) || isNaN(monthNumber) || isNaN(yearNum)) {
        console.warn('Invalid date values:', {day, monthName, year});
        return;
      }
      
      // Validate day value based on month
      let maxDaysInMonth;
      // Check if getDaysInMonth function exists, otherwise use fallback
      if (typeof bikram_sambat_bs.getDaysInMonth === 'function') {
        maxDaysInMonth = bikram_sambat_bs.getDaysInMonth(yearNum, monthNumber);
      } else {
        // Fallback: Define maximum days for each month of Nepali calendar
        // Values for common years, adjust if needed
        const daysInMonthFallback = {
          1: 31, 2: 31, 3: 32, 4: 32, 5: 31, 6: 30, 7: 30, 8: 29, 9: 30, 10: 29, 11: 30, 12: 30
        };
        maxDaysInMonth = daysInMonthFallback[monthNumber] || 30;
      }
      
      if (dayNum < 1 || dayNum > maxDaysInMonth) {
        console.warn(`Invalid day value: ${dayNum}. Month ${monthName} in year ${yearNum} has ${maxDaysInMonth} days.`);
        return;
      }
      
      console.log('Converting BS date:', { year: yearNum, month: monthNumber, day: dayNum });
      
      // Try different conversion methods based on what's available
      let gregDate = null;
      
      // Method 1: Use bikram_sambat_bs's getDate_greg_text function which is the most reliable
      if (typeof bikram_sambat_bs.getDate_greg_text === 'function') {
        try {
          // This is the primary method that should work
          gregDate = bikram_sambat_bs.getDate_greg_text({
            find: function(selector) {
              return {
                val: function() { 
                  if (selector === '[name=year]') return yearNum;
                  if (selector === '[name=month]') return monthNumber;
                  if (selector === '[name=day]') return dayNum;
                  return '';
                }
              };
            }
          });
          console.log('Converted using getDate_greg_text:', gregDate);
        } catch (error) {
          console.error('Error using getDate_greg_text:', error);
        }
      }
      
      // Method 2: Try the underlaying bs.toGreg_text function if available
      if (!gregDate && bikram_sambat_bs.bs && typeof bikram_sambat_bs.bs.toGreg_text === 'function') {
        try {
          gregDate = bikram_sambat_bs.bs.toGreg_text(yearNum, monthNumber, dayNum);
          console.log('Converted using bs.toGreg_text:', gregDate);
        } catch (error) {
          console.error('Error using bs.toGreg_text:', error);
        }
      }
      
      // Method 3: Try our custom converter functions if provided
      if (!gregDate && typeof bikram_sambat_bs.convertBsToAd === 'function') {
        try {
          // Format with leading zeros if needed
          const formattedDay = dayNum.toString().padStart(2, '0');
          const formattedMonth = monthNumber.toString().padStart(2, '0');
          
          // Create BS date string
          const bsDate = `${yearNum}-${formattedMonth}-${formattedDay}`;
          gregDate = bikram_sambat_bs.convertBsToAd(bsDate);
          console.log('Converted using convertBsToAd:', gregDate);
        } catch (error) {
          console.error('Error using convertBsToAd:', error);
        }
      }
      
      // Method 4: Final fallback to bs2ad
      if (!gregDate && typeof bikram_sambat_bs.bs2ad === 'function') {
        try {
          // Format with leading zeros if needed
          const formattedDay = dayNum.toString().padStart(2, '0');
          const formattedMonth = monthNumber.toString().padStart(2, '0');
          
          // Create BS date string
          const bsDate = `${yearNum}-${formattedMonth}-${formattedDay}`;
          gregDate = bikram_sambat_bs.bs2ad(bsDate);
          console.log('Converted using bs2ad:', gregDate);
        } catch (error) {
          console.error('Error using bs2ad:', error);
        }
      }
      
      // If we have a Gregorian date, update the input
      if (gregDate) {
        $realDateInput.val(gregDate).trigger('change');
      } else {
        console.error('Failed to convert BS date to AD. No conversion method succeeded.');
      }
    }
  } catch (error) {
    console.error('Error updating Gregorian date:', error);
  }
}

// Parse a complete Nepali date string
function parseFormattedNepaliDate(dateString) {
  if (!dateString) return null;
  
  try {
    const result = { day: null, month: null, year: null };
    
    // Extract month name
    const monthName = extractMonthFromFormattedDate(dateString);
    if (monthName) {
      result.month = getMonthNumberFromName(monthName).toString();
    }
    
    // Extract day using regex (look for numbers after month name)
    const dayMatch = monthName ? 
      dateString.indexOf(monthName) !== -1 ? 
        dateString.substr(dateString.indexOf(monthName) + monthName.length).match(/\s+([०-९\d]+)/) :
        null :
      null;
        
    if (dayMatch && dayMatch[1]) {
      result.day =  dayMatch[1];
    }
    
    // Extract year (usually the last number in the string)
    const yearMatch = dateString.match(/[०-९\d]{4}/);
    if (yearMatch) {
      result.year =  yearMatch[0];
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing Nepali date string:', error);
    return null;
  }
}

// Helper function to update the month dropdown selection
function updateMonthDropdown($group, monthNumber) {
  if (!monthNumber) return;
  
  const monthNum = parseInt(convertNepaliDigitsToArabic(monthNumber), 10);
  if (isNaN(monthNum)) return;
  
  const monthNames = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  
  const monthIndex = monthNum - 1;
  if (monthIndex >= 0 && monthIndex < monthNames.length) {
    const monthName = monthNames[monthIndex];
    $group.find('input[name=month]').val(monthName);
    $group.find('.month-dropdown button').text(monthName);
    $group.find('.month-dropdown .dropdown-menu li').removeClass('active');
    $group.find('.month-dropdown .dropdown-menu li').eq(monthIndex).addClass('active');
    return true;
  }
  
  return false;
}

module.exports = Bikramsambatdatepicker;

// Convert Nepali month name to 1-based index
function getMonthNumberFromName(name) {
  const months = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत',
  ];
  const index = months.indexOf(name);
  return index !== -1 ? index + 1 : '';
}

// Convert Nepali digits to Arabic (Western) digits
function convertNepaliDigitsToArabic(nepaliDigits) {
  if (!nepaliDigits) return '';
  
  const nepaliToArabicMap = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  
  return nepaliDigits.toString().split('').map(char => 
    nepaliToArabicMap[char] !== undefined ? nepaliToArabicMap[char] : char
  ).join('');
}

// Extract and parse month name from formatted date string
function extractMonthFromFormattedDate(dateString) {
  if (!dateString) return null;
  
  // Try to extract month name based on different possible formats
  
  // Format like "बुध, बैशाख २४, २०८२"
  let monthMatch = dateString.match(/,\s*([^\s\d,]+)\s+/);
  if (monthMatch && monthMatch[1]) {
    return monthMatch[1].trim();
  }
  
  // Format without day of week like "बैशाख २४, २०८२"
  monthMatch = dateString.match(/^([^\s\d,]+)\s+/);
  if (monthMatch && monthMatch[1]) {
    return monthMatch[1].trim();
  }
  
  // Try one more generic pattern
  const monthNames = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ',
    'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत',
  ];
  
  // Check if any month name is in the string
  for (const monthName of monthNames) {
    if (dateString.includes(monthName)) {
      return monthName;
    }
  }
  
  console.warn('Could not extract month name from:', dateString);
  return null;
}

// Inject date picker CSS
function addNepalDatePickerCSS() {
  if (!document.getElementById('nepali-datepicker-css')) {
    const style = document.createElement('style');
    style.id = 'nepali-datepicker-css';
    style.textContent = `
      /* Base widget styles */
      .bikram-sambat-widget {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        margin-top: 8px;
        position: relative;
      }
      .bikram-sambat-input-group input,
      .bikram-sambat-widget .calendar-btn {
        margin: 4px;
      }
      .bikram-sambat-widget .calendar-btn {
        background: none;
        border: 1px solid #ccc;
        border-radius: 3px;
        cursor: pointer;
        height: 34px;
        width: 40px;
      }
      .bikram-sambat-widget .calendar-btn:hover {
        background-color: #f5f5f5;
      }
      .bikram-sambat-widget .calendar-icon {
        width: 20px;
        height: 20px;
        display: inline-block;
        vertical-align: middle;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M17 3h-1V2a1 1 0 0 0-2 0v1H6V2a1 1 0 0 0-2 0v1H3a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 15H3V8h14v10zm0-12H3V5h14v1z'/%3E%3C/svg%3E");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
      .nepali-datepicker-input {
        position: absolute;
        left: -9999px;
        opacity: 0;
        height: 1px;
        width: 1px;
        border: none;
        z-index: 9999;
        visibility: hidden;
      }
      
      /* Nepali date picker styles */
      .nepali-date-picker {
        background: #fff;
        border: 1px solid #ccc;
        box-shadow: 0 5px 15px -5px rgba(0,0,0,.506);
        box-sizing: border-box;
        color: #333;
        display: block;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        padding: 8px;
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 9999 !important;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        min-width: 250px !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* Table styles */
      .nepali-date-picker table {
        background-color: transparent;
        border-collapse: collapse;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        border: 2px solid rgba(129,120,120,.17);
      }
      .nepali-date-picker table thead {
        background: #dedede;
      }
      .nepali-date-picker table th {
        color: #999;
        font-weight: 700;
        text-align: center;
        cursor: default;
        background: #f1f1f1;
      }
      .nepali-date-picker table thead td {
        color: #8b8686;
        font-weight: 700;
      }
      .nepali-date-picker table td {
        border: 1px solid rgba(154,150,150,.46);
        color: #666;
        padding: 0;
        width: 35px;
        text-align: center;
        font-size: 14px;
      }
      .nepali-date-picker table tbody td {
        cursor: pointer;
      }
      .nepali-date-picker table tbody td.current-month-date:hover {
        background-color: #718fcd;
        color: #fff;
        font-weight: 700;
      }
      .nepali-date-picker table td.current-month-date.disable,
      .nepali-date-picker table td.other-month-date {
        color: #ccc;
        cursor: default;
      }
      .nepali-date-picker table tbody td.current-month-date.disable:hover {
        background-color: inherit;
        color: #ccc;
        font-weight: 400;
      }
      
      /* Icons and controls */
      .nepali-date-picker .icon {
        opacity: .5;
        background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAeCAYAAADaW7vzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Q0NBRjI1NjM0M0UwMTFFNDk4NkFGMzJFQkQzQjEwRUIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Q0NBRjI1NjQ0M0UwMTFFNDk4NkFGMzJFQkQzQjEwRUIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDQ0FGMjU2MTQzRTAxMUU0OTg2QUYzMkVCRDNCMTBFQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDQ0FGMjU2MjQzRTAxMUU0OTg2QUYzMkVCRDNCMTBFQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PoNEP54AAAIOSURBVHja7Jq9TsMwEMcxrZD4WpBYeKUCe+kTMCACHZh4BFfHO/AAIHZGFhYkBBsSEqxsLCAgXKhbXYOTxh9pfJVP+qutnZ5s/5Lz2Y5I03QhWji2GIcgAokWgfCxNvcOCCGKqiSqhUp0laHOne05vdEyGMfkdxJDVjgwDlEQgYQBgx+ULJaWSXXS6r/ER5FBVR8VfGftTKcITNs+a1XpcFoExREIDF14AVIFxgQUS+h520cdud6wNkC0UBw6BCO/HoCYwBhD8QCkQ/x1mwDyD4plh4D6DDV0TAGyo4HcawLIBBSLDkHeH0Mg2yVP3l4TQMZQDDsEOl/MgHQqhMNuE0D+oBh0CIr8MAKyazBH9WyBuKxDWgbXfjNf32TZ1KWm/Ap1oSk/R53UtQ5xTh3LUlMmT8gt6g51Q9p+SobxgJQ/qmsfZhWywGFSl0yBjCLJCMgXail3b7+rumdVJ2YRss4cN+r6qAHDkPWjPjdJCF4n9RmAD/V9A/Wp4NQassDjwlB6XBiCxcJQWmZZb8THFilfy/lfrTvLghq2TqTHrRMTKNJ0sIhdo15RT+RpyWwFdY96UZ/LdQKBGjcXpcc1AlSFEfLmouD+1knuxBDUVrvOBmoOC/rEcN7OQxKVeJTCiAdUzUJhA2Oez9QTkp72OTVcxDcXY8iKNkxGAJXmJCOQwOa6dhyXsOa6XwEGAKdeb5ET3rQdAAAAAElFTkSuQmCC);
      }
      .nepali-date-picker .icon:hover {
        opacity: 1;
      }
      .nepali-date-picker .prev-btn.icon {
        background-position: 80px center;
        float: left;
        height: 30px;
        width: 20px;
      }
      .current-month-date.active,
      .drop-down-content li.active {
        background-color: #7bde77;
        color: #fff;
        font-weight: 700;
      }
      .nepali-date-picker .next-btn.icon {
        background-position: 0 center;
        float: right;
        height: 30px;
        width: 20px;
      }
      .nepali-date-picker .today-btn.icon {
        background-position: 130px center;
        display: block;
        float: left;
        height: 30px;
        margin: 0 15px;
        width: 20px;
      }
      
      /* Month and year selection */
      .nepali-date-picker .current-month-txt,
      .nepali-date-picker .current-year-txt {
        color: #545b54;
        font-weight: 700;
        padding-right: 20px;
        cursor: pointer;
        position: relative;
        display: inline-block;
        line-height: 30px;
      }
      .nepali-date-picker .current-month-txt {
        text-align: right;
        width: 80px;
      }
      .nepali-date-picker .current-month-txt:hover,
      .nepali-date-picker .current-year-txt:hover {
        text-decoration: underline;
      }
      .nepali-date-picker .calendar-controller i.icon-drop-down {
        background-position: 12px -15px;
        height: 30px;
        position: absolute;
        width: 20px;
      }
      
      /* Dropdown styles */
      .nepali-date-picker .drop-down-content {
        background-color: #fff;
        border: 1px solid #ccc;
        box-shadow: 0 3px 3px 0 rgba(0,0,0,.32);
        display: none;
        height: 99px;
        padding: 5px;
        position: absolute;
        width: 100%;
        z-index: 10000;
      }
      .nepali-date-picker .scrollbar-wrapper {
        border-left: 1px solid rgba(204,204,204,.2);
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        width: 15px;
      }
      .scrollbar {
        background-color: #000;
        border-radius: 2.5px;
        display: block;
        height: 100%;
        opacity: .5;
        position: absolute;
        right: 6.5px;
        width: 5px;
      }
      .nepali-date-picker .drop-down-content .option-wrapper {
        height: 100%;
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 0;
        position: relative;
      }
      .nepali-date-picker .drop-down-content ul {
        list-style: none;
        margin: 0;
        padding: 0 5px 0 0;
      }
      .drop-down-content li {
        border-bottom: 1px solid rgba(159,153,153,.39);
        font-size: 16px;
        font-weight: 400;
        line-height: 20px;
        text-align: right;
      }
      .drop-down-content li:hover {
        background: #718fcd;
      }
      .drop-down-content li:last-child {
        border-bottom: none;
      }
      
      /* Calendar popup overlay */
      .nepali-date-picker-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.3);
        z-index: 9998;
        display: none;
      }
      .nepali-date-picker-overlay.active {
        display: block;
      }
      
      /* Scrollbar styles */
      ::-webkit-scrollbar {
        width: 13px;
        height: 13px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(0,0,0,.1);
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,.5);
      }
      
      /* Additional custom styles for Enketo integration */
      .or .nepali-date-widget {
        margin-top: 5px;
        display: flex;
        flex-direction: column;
      }
      .or .nepali-date-widget .widget-controls {
        margin-top: 5px;
      }
      .or .widget-calendar-btn {
        position: absolute;
        right: 5px;
        top: 5px;
      }
      .or .btn-calendar {
        background: none;
        border: none;
        cursor: pointer;
      }
      .or .nepali-datepicker-input {
        padding-right: 30px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Widget HTML template
const TEMPLATE = `
  <div class="input-group bikram-sambat-input-group bikram-sambat-widget">
    <input name="day" type="tel" class="form-control devanagari-number-input day-field" placeholder="गते" aria-label="गते" maxlength="2">
    <input name="month" type="hidden">
    <div class="input-group-btn month-dropdown">
      <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
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
    <input name="year" type="tel" class="form-control devanagari-number-input year-field" placeholder="साल" aria-label="साल" maxlength="4">
    <button type="button" class="calendar-btn" title="Choose date">
      <span class="calendar-icon"></span>
    </button>
  </div>
`;

// Helper function to sync all inputs and ensure consistent state
function syncInputValues($group) {
  try {
    const day = $group.find('input[name=day]').val();
    const monthValue = $group.find('input[name=month]').val();
    const year = $group.find('input[name=year]').val();
    
    // If we have all values, make sure they're consistent
    if (day && monthValue && year) {
      // Already good, just update month dropdown if needed
      if (monthValue) {
        // If monthValue is a name, just update display
        if (isNaN(parseInt(convertNepaliDigitsToArabic(monthValue), 10))) {
          $group.find('.month-dropdown button').text(monthValue);
        } 
        // If monthValue is a number, convert to name
        else {
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
      }
    }
  } catch (error) {
    console.error('Error syncing input values:', error);
  }
}