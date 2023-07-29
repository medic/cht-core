import { Component, EventEmitter, OnDestroy, Output, Input, AfterViewInit, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import 'bootstrap-daterangepicker';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
// the default declaration of moment doesn't include _week property
interface LocaleWithWeekSpec extends moment.Locale {
  _week: moment.WeekSpec;
}

import { GlobalActions } from '@mm-actions/global';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';
import { ResponsiveService } from '@mm-services/responsive.service';
import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'mm-date-filter',
  templateUrl: './date-filter.component.html'
})
export class DateFilterComponent implements OnInit, OnDestroy, AbstractFilter, AfterViewInit {
  private globalActions;
  private subscription: Subscription = new Subscription();
  inputLabel;
  error: string;
  dateRange = {
    from: undefined as any,
    to: undefined as any,
  };

  @Input() disabled;
  @Input() isRange;
  @Input() isStartDate;
  @Input() fieldId;
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Output() onError: EventEmitter<any> = new EventEmitter();

  constructor(
    private store: Store,
    private responsiveService: ResponsiveService,
    private datePipe: DatePipe,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    const subscription = this.store
      .select(Selectors.getFilters)
      .subscribe(({ date }) => {
        this.dateRange = { ...date };
        this.validateDateRange(this.dateRange);
        this.setLabel(this.dateRange);
      });
    this.subscription.add(subscription);
  }

  ngAfterViewInit() {
    const datepicker:any = $(`#${this.fieldId}`).daterangepicker(
      {
        singleDatePicker: !this.isRange,
        startDate: this.isRange ? moment().subtract(1, 'months') : moment(),
        endDate: moment(),
        maxDate: moment(),
        opens: 'center',
        autoApply: true,
        locale: {
          daysOfWeek: moment.weekdaysMin(),
          monthNames: moment.monthsShort(),
          firstDay: (<LocaleWithWeekSpec>moment.localeData())._week.dow
        }
      },
      (from, to) => {
        const dateRange = this.createDateRange(from, to);
        this.applyFilter(dateRange);
      }
    );

    datepicker.on('show.daterangepicker', (element, picker) => {
      setTimeout(() => {
        if (this.disabled) {
          picker.hide();
          return;
        }

        if (!this.isInViewport(picker.container[0])) {
          picker.drops = picker.drops === 'down' ? 'up' : 'down';
          picker.move();
        }
      });
    });

    datepicker.on('hide.daterangepicker', (element, picker) => {
      if (this.isRange) {
        return;
      }
      let date: moment.Moment | undefined = this.isStartDate ? this.dateRange.from : this.dateRange.to;
      if (!date) {
        date = moment();
      }
      if (!picker.startDate?.isSame(date, 'day')) {
        picker.setStartDate(date);
      }
      if (!picker.endDate?.isSame(date, 'day')) {
        picker.setEndDate(date);
      }
    });

    datepicker.on('mm.dateSelected.daterangepicker', (e, picker) => {
      if (this.responsiveService.isMobile() && this.isRange) {
        // mobile version - only show one calendar at a time
        if (picker.container.is('.show-from')) {
          picker.container.removeClass('show-from').addClass('show-to');
        } else {
          picker.container.removeClass('show-to').addClass('show-from');
        }
      }
    });

    if (this.isRange) {
      $('.daterangepicker').addClass('filter-daterangepicker mm-dropdown-menu show-from');
    }
  }

  private setError(error) {
    this.error = error;
    this.onError.emit(this.error);
  }

  private validateDateRange(dateRange) {
    if (dateRange?.from && dateRange?.to && dateRange.to < dateRange.from) {
      const errorKey = this.isStartDate ? 'date_filter.error.from_date' : 'date_filter.error.to_date';
      this.setError(errorKey);
      return false;
    }

    this.setError(false);
    return true;
  }

  applyFilter(dateRange, skipSearch?) {
    if (!this.validateDateRange(dateRange)) {
      return;
    }

    this.globalActions.setFilter({ date: dateRange });

    if (skipSearch) {
      // ToDo: Backward compatibility with the "reports-filters" component, remove this "skipSearch"
      //  once we delete that component. The new "mm-reports-sidebar-filter" doesn't need it.
      return;
    }

    this.search.emit();
  }

  private createDateRange(from, to) {
    if (this.isRange) {
      return { from, to };
    }

    if (this.isStartDate) {
      return { ...this.dateRange, from };
    }

    return { ...this.dateRange, to };
  }

  private isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  }

  clear(skipSearch?) {
    if (this.disabled) {
      return;
    }

    this.applyFilter(undefined, skipSearch);
  }

  countSelected() {
    const date = this.isStartDate ? this.dateRange.from : this.dateRange.to;
    return date ? 1 : 0;
  }

  setLabel(dateRange) {
    this.inputLabel = '';
    const divider = ' - ';
    const format = 'd MMM';
    const dates = {
      from: dateRange.from ? this.datePipe.transform(dateRange.from, format) : undefined,
      to: dateRange.to ? this.datePipe.transform(dateRange.to, format) : undefined,
    };

    if (dates.from && (this.isRange || this.isStartDate)) {
      this.inputLabel += dates.from;
    }

    if (this.isRange && dates.to) {
      this.inputLabel += divider;
    }

    if (dates.to && (this.isRange || !this.isStartDate)) {
      this.inputLabel += dates.to;
    }
  }

  ngOnDestroy() {
    this.setError(false);
    this.subscription.unsubscribe();
    const datePicker:any = $(`#${this.fieldId}`).data('daterangepicker');

    if (datePicker) {
      // avoid dom-nodes leaks
      datePicker.remove();
    }
  }
}
