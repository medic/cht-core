import { Component, EventEmitter, OnDestroy, Output, Input, AfterViewInit, OnInit } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { Store } from '@ngrx/store';
import 'bootstrap-daterangepicker';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
// the default declaration of moment doesn't include _week property
interface LocaleWithWeekSpec extends moment.Locale {
  _week: moment.WeekSpec;
}

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '@mm-services/language.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { toBik, toGreg_text } from 'bikram-sambat';
import { setupNepaliDatePicker, hideDatePicker } from '../../../../js/enketo/widgets/bikram-sambat-picker-shared';

@Component({
  selector: 'mm-date-filter',
  templateUrl: './date-filter.component.html',
  imports: [BsDropdownModule, NgIf, TranslatePipe]
})
export class DateFilterComponent implements OnInit, OnDestroy, AfterViewInit {
  private globalActions: GlobalActions;
  private subscription: Subscription = new Subscription();
  isNepali = false;
  inputLabel;
  error?: string;
  direction: string | undefined;
  dateRange = {
    from: undefined as any,
    to: undefined as any,
  };

  @Input() disabled;
  @Input() isStartDate;
  @Input() fieldId;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Output() onError: EventEmitter<any> = new EventEmitter();

  constructor(
    private store: Store,
    private datePipe: DatePipe,
    private readonly languageService: LanguageService,
    private readonly formatDateService: FormatDateService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.store.select(Selectors.getDirection).subscribe(direction => {
      this.direction = direction;
    });
  }

  ngOnInit() {
    this.isNepali = this.languageService.useDevanagariScript();
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
    if (this.isNepali) {
      this.initNepaliDatePicker();
      return;
    }

    const datepicker:any = $(`#${this.fieldId}`).daterangepicker(
      {
        singleDatePicker: true,
        startDate: moment(),
        endDate: moment(),
        maxDate: moment(),
        opens: 'center',
        autoApply: true,
        locale: {
          daysOfWeek: moment.weekdaysMin(),
          monthNames: moment.monthsShort(),
          firstDay: (<LocaleWithWeekSpec>moment.localeData())._week.dow,
          direction: this.direction,
        },
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
      let date = this.isStartDate ? this.dateRange.from : this.dateRange.to;
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
  }

  private initNepaliDatePicker() {
    const $hiddenDateInput = $('<input type="text" class="nepali-datepicker-input" />');
    $(`#${this.fieldId}`).parent().append($hiddenDateInput);

    setupNepaliDatePicker($hiddenDateInput, {
      onDateSelect: (data: any) => {
        const gregDateStr = toGreg_text(data.bsYear, data.bsMonth, data.bsDate);
        const gregMoment = moment(gregDateStr);
        const normalizedMoment = this.isStartDate ? gregMoment.startOf('day') : gregMoment.endOf('day');
        const dateRange = this.createDateRange(normalizedMoment, normalizedMoment);
        this.applyFilter(dateRange);
      }
    });

    $(`#${this.fieldId}`).on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (this.disabled) {
        return;
      }

      const activeDate = this.isStartDate ? this.dateRange.from : this.dateRange.to;
      if (activeDate) {
        const bsDate = toBik(moment(activeDate));
        const bsMonth = String(bsDate.month).padStart(2, '0');
        const bsDay = String(bsDate.day).padStart(2, '0');
        const latinVal = `${bsDate.year}-${bsMonth}-${bsDay}`;
        const devanagariVal = latinVal.replace(/\d/g, (w) => ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'][+w]);
        $hiddenDateInput.val(devanagariVal);
      } else {
        $hiddenDateInput.val('');
      }

      $hiddenDateInput.click();
    });
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

  applyFilter(dateRange) {
    if (!this.validateDateRange(dateRange)) {
      return;
    }

    this.globalActions.setFilter({ date: dateRange });

    this.search.emit();
  }

  private createDateRange(from, to) {
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

  clear() {
    if (this.disabled) {
      return;
    }

    this.applyFilter(undefined);
  }

  countSelected() {
    const date = this.isStartDate ? this.dateRange.from : this.dateRange.to;
    return date ? 1 : 0;
  }

  setLabel(dateRange) {
    this.inputLabel = '';
    if (this.isNepali) {
      const dates = {
        from: dateRange.from ? this.formatDateService.dayMonth(dateRange.from) : undefined,
        to: dateRange.to ? this.formatDateService.dayMonth(dateRange.to) : undefined,
      };

      if (dates.from && this.isStartDate) {
        this.inputLabel += dates.from;
      }

      if (dates.to && !this.isStartDate) {
        this.inputLabel += dates.to;
      }
      return;
    }

    const format = 'd MMM';
    const dates = {
      from: dateRange.from ? this.datePipe.transform(dateRange.from, format) : undefined,
      to: dateRange.to ? this.datePipe.transform(dateRange.to, format) : undefined,
    };

    if (dates.from && this.isStartDate) {
      this.inputLabel += dates.from;
    }

    if (dates.to && !this.isStartDate) {
      this.inputLabel += dates.to;
    }
  }

  ngOnDestroy() {
    this.setError(false);
    this.subscription.unsubscribe();

    if (this.isNepali) {
      this.cleanupNepaliDatePicker();
      return;
    }

    const datePicker: any = $(`#${this.fieldId}`).data('daterangepicker');
    if (datePicker) {
      datePicker.remove();
    }
  }

  private cleanupNepaliDatePicker() {
    const $hiddenDateInput = $(`#${this.fieldId}`).parent().find('.nepali-datepicker-input');
    if ($hiddenDateInput.length) {
      const container = $hiddenDateInput.data('pickerContainer');
      hideDatePicker($hiddenDateInput);
      $hiddenDateInput.remove();
      if (container) {
        $(container).remove();
      } else {
        $('.nepali-date-picker').remove();
      }
    }
    if ($('.nepali-date-picker').length === 0) {
      $('.nepali-date-picker-overlay').remove();
    }
  }
}
