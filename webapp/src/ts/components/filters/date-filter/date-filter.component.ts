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
  subscription: Subscription = new Subscription();
  inputLabel;
  date = {
    from: undefined,
    to: undefined,
  };

  @Input() disabled;
  @Input() isRange;
  @Input() isStartDate;
  @Input() fieldId;
  @Output() search: EventEmitter<any> = new EventEmitter();

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
        this.date = { ...date };
        this.setLabel();
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
        if (dateRange.from && dateRange.to && dateRange.to < dateRange.from) {
          return;
        }
        this.applyFilter(dateRange);
      }
    );

    // todo TOUR needs to show and hide this datepicker!
    datepicker.on('show.daterangepicker', (e, picker) => {
      setTimeout(() => {
        if ($('#dateRangeDropdown').is('.disabled')) {
          picker.hide();
        }
      });
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

  applyFilter(date, skipSearch?) {
    this.globalActions.setFilter({ date });
    if (skipSearch) {
      // ToDo: Backward compatibility with the "reports-filters" component, remove this "skipSearch"
      //  once we delete that component. The new "mm-reports-sidebar-filter" doesn't need it.
      return;
    }
    this.search.emit();
  }

  createDateRange(from, to) {
    if (this.isRange) {
      return { from, to };
    }

    if (this.isStartDate) {
      return { ...this.date, from };
    }

    return { ...this.date, to };
  }

  clear(skipSearch?) {
    this.applyFilter({ from: undefined, to: undefined }, skipSearch);
  }

  countSelected() {
    const date = this.isStartDate ? this.date.from : this.date.to;
    return date ? 1 : 0;
  }

  setLabel() {
    this.inputLabel = '';
    const divider = ' - ';
    const format = 'd MMM';
    const dates = {
      from: this.date.from ? this.datePipe.transform(this.date.from, format) : undefined,
      to: this.date.to ? this.datePipe.transform(this.date.to, format) : undefined,
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
    this.subscription.unsubscribe();
    const datePicker:any = $(`#${this.fieldId}`).data('daterangepicker');

    if (datePicker) {
      // avoid dom-nodes leaks
      datePicker.remove();
    }
  }
}
