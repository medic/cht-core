import * as moment from 'moment';
import { isMobile } from '../providers/responsive.provider';
import {Injectable} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const ENTER_KEY_CODE = 13;

@Injectable({
  providedIn: 'root'
})
export class SearchFiltersService {
  constructor(private translateService:TranslateService) {
  }

  private search = () => {};
  private isEnter(e) {
    return e.which === ENTER_KEY_CODE;
  }

  private freetext(callback) {
    this.search = () => callback(true);

    (<any>$('#search')).on('click', (e) => {
      e.preventDefault();
      this.search();
    });
    (<any>$('#freetext')).on('keypress', (e) => {
      if (this.isEnter(e)) {
        e.preventDefault();
        this.search();
      }
    });

    const performMobileSearch = (e) => {
      e.preventDefault();
      (<any>$(e.target)).closest('.filter').removeClass('open');
      this.search();
    };
    (<any>$('#mobile-search-go')).on('click', performMobileSearch);
    (<any>$('#mobile-freetext')).on('keypress', (e) => {
      if (this.isEnter(e)) {
        performMobileSearch(e);
      }
    });
    (<any>$('.mobile-freetext-filter')).on('shown.bs.dropdown', () => {
      (<any>$('#mobile-freetext')).focus();
    });

    // stop bootstrap closing the search pane on click
    (<any>$('.filters .mobile-freetext-filter .search-pane')).on('click', (e) => {
      e.stopPropagation();
    });
  }

  private getMultidropdownOptions() {
    return this
      .translateService
      .get('anything')
      .toPromise()
      .then(() => {
        return {
          label: (state, callback) => {
            if (state.selected.length === 0 || state.selected.length === state.total.length) {
              return callback(this.translateService.instant(state.menu.data('label-no-filter')));
            }
            if (state.selected.length === 1) {
              return callback(state.selected.first().text());
            }
            callback(this.translateService.instant(
              state.menu.data('filter-label'), { number: state.selected.length }
            ));
          },
          selectAllLabel: this.translateService.instant('select all'),
          clearLabel: this.translateService.instant('clear')
        }
      });
  }

  private getMultidropdownResult(input) {
    const dropdown = input.multiDropdown();
    return {
      selected: dropdown.val(),
      options: dropdown.options()
    };
  };

  formType(callback) {
    const getMultiDropdownResult = this.getMultidropdownResult;
    this.getMultidropdownOptions().then(function(options) {
      (<any>$('#formTypeDropdown')).multiDropdown(options);
      (<any>$('#formTypeDropdown')).on('update', function() {
        callback(getMultiDropdownResult($(this)));
      });
    });
  };

  facility(callback) {
    const getMultiDropdownResult = this.getMultidropdownResult;
    this.getMultidropdownOptions().then(function(options) {
      (<any>$('#facilityDropdown')).multiDropdown(options);
      (<any>$('#facilityDropdown')).on('update', function() {
        callback(getMultiDropdownResult($(this)));
      });
    });
  };

  private getTernaryValue(positive, negative) {
    if (positive && !negative) {
      return true;
    }
    if (!positive && negative) {
      return false;
    }
  }

  status(callback) {
    return this
      .translateService
      .get('any')
      .toPromise()
      .then(() => {
        (<any>$('#statusDropdown')).multiDropdown({
          label: (state, callback) => {
            const values:any = {};
            state.selected.each(function() {
              const elem = $(this);
              values[elem.data('value')] = elem.text();
            });
            let parts = [];
            if(values.unverified) {
              parts.push(values.unverified);
            }
            if(values.verifiedErrors) {
              parts.push(values.verifiedErrors);
            }
            if(values.verified) {
              parts.push(values.verified);
            }
            if(values.unverified && values.verifiedErrors && values.verified) {
              parts = [];
            }

            if (values.valid && !values.invalid) {
              parts.push(values.valid);
            } else if (!values.valid && values.invalid) {
              parts.push(values.invalid);
            }
            if (parts.length === 0 || parts.length === state.total.length) {
              return callback(this.translateService.instant(state.menu.data('label-no-filter')));
            }
            return callback(parts.join(', '));
          },
          selectAllLabel: this.translateService.instant('select all'),
          clearLabel: this.translateService.instant('clear')
        });

        const getTernaryValue = this.getTernaryValue;
        (<any>$('#statusDropdown')).on('update', function() {
          const values = (<any>$(this)).multiDropdown().val();
          const valid = getTernaryValue(
            values.includes('valid'),
            values.includes('invalid')
          );
          const verified = [];
          if(values.includes('verified')) {
            verified.push(true);
          }
          if(values.includes('unverified')) {
            verified.push(undefined);
          }
          if(values.includes('verifiedErrors')) {
            verified.push(false);
          }

          callback({
            valid: valid,
            verified: verified
          });
        });
      })
  }

  date(callback) {
    (<any>$('#date-filter')).daterangepicker({
        startDate: moment().subtract(1, 'months'),
        endDate: moment(),
        maxDate: moment(),
        opens: 'center',
        autoApply: true,
        locale: {
          daysOfWeek: moment.weekdaysMin(),
          monthNames: moment.monthsShort(),
          //firstDay: moment.localeData()._week.dow
        }
      },
      (start, end) => {
        callback({
          from: start.valueOf(),
          to: end.valueOf()
        });
      })
      .on('show.daterangepicker', function(e, picker) {
        setTimeout(function() {
          if ($('#dateRangeDropdown').is('.disabled')) {
            picker.hide();
          }
        });
      })
      .on('mm.dateSelected.daterangepicker', function(e, picker) {
        if (isMobile()) {
          // mobile version - only show one calendar at a time
          if (picker.container.is('.show-from')) {
            picker.container.removeClass('show-from').addClass('show-to');
          } else {
            picker.container.removeClass('show-to').addClass('show-from');
          }
        }
      });
    $('.daterangepicker').addClass('filter-daterangepicker mm-dropdown-menu show-from');
  }

  private updateFreetextValue(val) {
    $('#freetext,#mobile-freetext').val(val).trigger('change');
  }

  freetextSearch(query) {
    this.updateFreetextValue(query);
    this.search();
  }

  reset() {
    $('.filter.multidropdown:not(.no-reset)').each(function() {
      (<any>$(this)).multiDropdown().reset();
    });
    this.updateFreetextValue('');
  }

  destroy() {
    $('#date-filter').data('daterangepicker').remove();
  }
}
