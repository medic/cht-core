'use strict';

const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');
require('nepali-date-picker/dist/nepaliDatePicker.min.js');
require('../../../css/bikramsambat.less');
 
// Add CSS directly to document head since the webpack import was failing
const addNepalDatePickerCSS = () => {
  if (!document.getElementById('nepali-datepicker-css')) {
    const style = document.createElement('style');
    style.id = 'nepali-datepicker-css';
    style.textContent = `
      .nepali-date-picker{background:#fff;border:1px solid #ccc;box-shadow:0 5px 15px -5px rgba(0,0,0,.506);box-sizing:border-box;color:#333;display:block;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:8px;position:absolute;z-index:9999;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}
      .nepali-date-picker table{background-color:transparent;border-collapse:collapse;width:100%;max-width:100%;box-sizing:border-box;margin:0;padding:0;border:2px solid rgba(129,120,120,.17)}
      .nepali-date-picker table thead{background:#dedede}
      .nepali-date-picker table th{color:#999;font-weight:700;text-align:center;cursor:default;background:#f1f1f1}
      .nepali-date-picker table thead td{color:#8b8686;font-weight:700}
      .nepali-date-picker table td{border:1px solid rgba(154,150,150,.46);color:#666;padding:0;width:35px;text-align:center;font-size:14px}
      .nepali-date-picker table tbody td{cursor:pointer}
      .nepali-date-picker table tbody td.current-month-date:hover{background-color:#718fcd;color:#fff;font-weight:700}
      .nepali-date-picker table td.current-month-date.disable,.nepali-date-picker table td.other-month-date{color:#ccc;cursor:default}
      .nepali-date-picker table tbody td.current-month-date.disable:hover{background-color:inherit;color:#ccc;font-weight:400}
      .nepali-date-picker .icon{opacity:.5;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAeCAYAAADaW7vzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Q0NBRjI1NjM0M0UwMTFFNDk4NkFGMzJFQkQzQjEwRUIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Q0NBRjI1NjQ0M0UwMTFFNDk4NkFGMzJFQkQzQjEwRUIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDQ0FGMjU2MTQzRTAxMUU0OTg2QUYzMkVCRDNCMTBFQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDQ0FGMjU2MjQzRTAxMUU0OTg2QUYzMkVCRDNCMTBFQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PoNEP54AAAIOSURBVHja7Jq9TsMwEMcxrZD4WpBYeKUCe+kTMCACHZh4BFfHO/AAIHZGFhYkBBsSEqxsLCAgXKhbXYOTxh9pfJVP+qutnZ5s/5Lz2Y5I03QhWji2GIcgAokWgfCxNvcOCCGKqiSqhUp0laHOne05vdEyGMfkdxJDVjgwDlEQgYQBgx+ULJaWSXXS6r/ER5FBVR8VfGftTKcITNs+a1XpcFoExREIDF14AVIFxgQUS+h520cdud6wNkC0UBw6BCO/HoCYwBhD8QCkQ/x1mwDyD4plh4D6DDV0TAGyo4HcawLIBBSLDkHeH0Mg2yVP3l4TQMZQDDsEOl/MgHQqhMNuE0D+oBh0CIr8MAKyazBH9WyBuKxDWgbXfjNf32TZ1KWm/Ap1oSk/R53UtQ5xTh3LUlMmT8gt6g51Q9p+SobxgJQ/qmsfZhWywGFSl0yBjCLJCMgXail3b7+rumdVJ2YRss4cN+r6qAHDkPWjPjdJCF4n9RmAD/V9A/Wp4NQassDjwlB6XBiCxcJQWmZZb8THFilfy/lfrTvLghq2TqTHrRMTKNJ0sIhdo15RT+RpyWwFdY96UZ/LdQKBGjcXpcc1AlSFEfLmouD+1knuxBDUVrvOBmoOC/rEcN7OQxKVeJTCiAdUzUJhA2Oez9QTkp72OTVcxDcXY8iKNkxGAJXmJCOQwOa6dhyXsOa6XwEGAKdeb5ET3rQdAAAAAElFTkSuQmCC)}
      .nepali-date-picker .icon:hover{opacity:1}
      .nepali-date-picker .prev-btn.icon{background-position:80px center;float:left;height:30px;width:20px}
      .current-month-date.active,.drop-down-content li.active{background-color:#7bde77;color:#fff;font-weight:700}
      .nepali-date-picker .next-btn.icon{background-position:0 center;float:right;height:30px;width:20px}
      .nepali-date-picker .today-btn.icon{background-position:130px center;display:block;float:left;height:30px;margin:0 15px;width:20px}
      .nepali-date-picker .current-month-txt,.nepali-date-picker .current-year-txt{color:#545b54;font-weight:700;padding-right:20px;cursor:pointer;position:relative;display:inline-block;line-height:30px}
      .nepali-date-picker .current-month-txt{text-align:right;width:80px}
      .nepali-date-picker .current-month-txt:hover,.nepali-date-picker .current-year-txt:hover{text-decoration:underline}
      .nepali-date-picker .calendar-controller i.icon-drop-down{background-position:12px -15px;height:30px;position:absolute;width:20px}
      .nepali-date-picker .drop-down-content{background-color:#fff;border:1px solid #ccc;box-shadow:0 3px 3px 0 rgba(0,0,0,.32);display:none;height:99px;padding:5px;position:absolute;width:100%}
      .nepali-date-picker .scrollbar-wrapper{border-left:1px solid rgba(204,204,204,.2);height:100%;position:absolute;right:0;top:0;width:15px}
      .scrollbar{background-color:#000;border-radius:2.5px;display:block;height:100%;opacity:.5;position:absolute;right:6.5px;width:5px}
      .nepali-date-picker .drop-down-content .option-wrapper{height:100%;overflow-x:hidden;overflow-y:scroll;padding:0;position:relative}
      .nepali-date-picker .drop-down-content ul{list-style:none;margin:0;padding:0 5px 0 0}
      .drop-down-content li{border-bottom:1px solid rgba(159,153,153,.39);font-size:16px;font-weight:400;line-height:20px;text-align:right}
      .drop-down-content li:hover{background:#718fcd}
      .drop-down-content li:last-child{border-bottom:medium none}
      ::-webkit-scrollbar{width:13px;height:13px}
      ::-webkit-scrollbar-track{background:rgba(0,0,0,.1)}
      ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.5)}
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
};

// Convert AD date to BS (Bikram Sambat)
const AD2BS = (adDate) => {
  try {
    let year, month, day;
    
    if (adDate instanceof Date) {
      year = adDate.getFullYear();
      month = adDate.getMonth() + 1;
      day = adDate.getDate();
    } else if (typeof adDate === 'string') {
      const parts = adDate.split('-');
      if (parts.length !== 3) return '';
      
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      return '';
    }
    
    // Simple conversion (approximate)
    const bsYear = year + 57;
    const bsMonth = ((month + 3) % 12) || 12; // Approximate mapping
    const bsDay = day;
    
    return {
      year: bsYear,
      month: bsMonth,
      day: bsDay,
      formatted: `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`
    };
  } catch (err) {
    console.error('Error converting AD to BS:', err);
    return null;
  }
};

// Convert BS date to AD
const BS2AD = (bsDate) => {
  try {
    if (!bsDate) return null;
    
    const [bsYear, bsMonth, bsDay] = bsDate.split('-').map(Number);
    
    // Convert to AD (approximate)
    const adYear = bsYear - 57;
    const adMonth = ((bsMonth + 8) % 12) || 12;
    const adDay = bsDay;
    
    // Format as ISO string
    return `${adYear}-${String(adMonth).padStart(2, '0')}-${String(adDay).padStart(2, '0')}`;
  } catch (err) {
    console.error('Error converting BS to AD:', err);
    return null;
  }
};

class Bikramsambatdatepicker extends Widget {
  static get selector() {
    return 'input[type="date"][data-type-xml="date"]';
  }

  _init() {
    // Add the CSS to the page directly
    addNepalDatePickerCSS();
    
    const $el = $(this.element);
    
    window.CHTCore.Language.get().then(language => {
      // Only apply this widget to Nepali forms or those with the bikram-sambat appearance
      if (
        language.indexOf('ne') !== 0 &&
        $el.parent('.or-appearance-bikram-sambat').length === 0
      ) {
        return;
      }
      
      // Find the closest field parent
      const $question = $el.closest('.question');
      
      if (!$question.length) {
        console.error('Date input must be inside a form question');
        return;
      }
      
      // Hide the original date input
      $el.addClass('hide');
      $question.find('.widget.date').remove();
      
      // Create a unique ID for our nepali datepicker
      const nepaliInputId = `nepali-datepicker-${Math.floor(Math.random() * 10000)}`;
      
      // Create our custom widget template
      const template = `
        <div class="widget nepali-date-widget">
          <div class="input-group">
            <input type="text" id="${nepaliInputId}" class="nepali-datepicker-input form-control" placeholder="YYYY-MM-DD" />
          </div>
          <div class="widget-controls"> 
            <button type="button" class="btn btn-clear">Clear</button>
          </div>
        </div>
      `;
      
      // Append our widget after the original input
      $el.after(template);
      
      // Get reference to our nepali date input
      const $nepaliInput = $(`#${nepaliInputId}`);
      
      // Clean up existing datepickers and ensure the container exists
      $('.nepali-date-picker').remove();
      $('<div class="nepali-date-picker"></div>').appendTo('body');
      
      // Initialize the datepicker
      try {
        // Initialize with simpler format to avoid Nepali character parsing issues
        $nepaliInput.nepaliDatePicker({
          dateFormat: '%y-%m-%d',
          closeOnDateSelect: true
        });
        
        // Set initial value if original input has a value
        const initialVal = $el.val();
        if (initialVal) {
          try {
            const bsDate = AD2BS(initialVal);
            if (bsDate && bsDate.formatted) {
              $nepaliInput.val(bsDate.formatted);
            }
          } catch (e) {
            console.warn('Error setting initial BS date:', e);
          }
        }
        
        // Handle date selection
        $nepaliInput.on('change', function() {
          const bsDate = $(this).val();
          
          if (!bsDate) {
            $el.val('').trigger('change');
            return;
          }
          
          try {
            const adDate = BS2AD(bsDate);
            if (adDate) {
              $el.val(adDate).trigger('change');
            }
          } catch (e) {
            console.error('Error converting BS to AD date:', e);
          }
        });
        
         
        // Clear button
        $question.find('.btn-clear').on('click', function() {
          $nepaliInput.val('');
          $el.val('').trigger('change');
        });
        
        // Calendar button handler
        $question.find('.btn-calendar, .nepali-datepicker-input').on('click', function() {
          // Reset any existing datepickers
          $('.nepali-date-picker').hide();
          
          // Ensure the calendar is re-initialized and make it visible
          setTimeout(() => {
            try {
              $nepaliInput.nepaliDatePicker('show');
            } catch(e) {
              console.error('Error showing Nepali calendar:', e);
              
              // Full re-initialization as fallback
              $('.nepali-date-picker').remove();
              $('<div class="nepali-date-picker"></div>').appendTo('body');
              
              $nepaliInput.nepaliDatePicker({
                dateFormat: '%y-%m-%d',
                closeOnDateSelect: true
              });
              
              // Try again after re-initialization
              setTimeout(() => {
                $nepaliInput.nepaliDatePicker('show');
              }, 50);
            }
          }, 50);
        });
        
      } catch (e) {
        console.error('Error initializing Nepali date picker:', e);
      }
    }).catch(err => {
      console.error('Error getting language:', err);
    });
  }
  
  update() {
    const $el = $(this.element);
    const $nepaliInput = $el.siblings('.nepali-date-widget').find('.nepali-datepicker-input');
    
    if ($nepaliInput.length && $el.val()) {
      try {
        const bsDate = AD2BS($el.val());
        if (bsDate && bsDate.formatted) {
          $nepaliInput.val(bsDate.formatted);
        }
      } catch (e) {
        console.warn('Error updating Nepali date:', e);
      }
    }
  }
}

module.exports = Bikramsambatdatepicker;
