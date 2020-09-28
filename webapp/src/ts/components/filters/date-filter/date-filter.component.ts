import { Component, EventEmitter, OnDestroy, ChangeDetectorRef, Output, ViewChild, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription } from 'rxjs';
import { GlobalActions } from '../../../actions/global';
import 'bootstrap-daterangepicker';
import { isMobile } from '@mm-providers/responsive.provider';
import * as moment from 'moment';
// the default declaration of moment doesn't include _week property
interface LocaleWithWeekSpec extends moment.Locale {
  _week: moment.WeekSpec;
}

@Component({
  selector: 'mm-date-filter',
  templateUrl: './date-filter.component.html'
})
export class DateFilterComponent implements OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;

  date = {
    from: undefined,
    to: undefined,
  }
  selectMode;
  selectedReports;

  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(
    private store: Store,
    private cd: ChangeDetectorRef,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getSelectMode)),
      this.store.pipe(select(Selectors.getSelectedReports))
    ).subscribe(([
      selectMode,
      selectedReports,
    ]) => {
      this.selectMode = selectMode;
      this.selectedReports = selectedReports;
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);
  }

  applyFilter() {
    this.globalActions.setFilter({ date: this.date });
    this.search.emit();
  }

  ngAfterViewInit() {
    const datepicker = (<any>$('#date-filter')).daterangepicker(
      {
        showDropdowns: true,
        startDate: moment().subtract(1, 'months'),
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
        this.date = { from, to };
        this.applyFilter();
      }
    );

    // todo TOUR needs to show and hide this datepicker!
    datepicker.on('show.daterangepicker', (e, picker) => {
      setTimeout(() => {
        if ($('#dateRangeDropdown').is('.disabled')) {
          picker.hide();
        }
      });
    })

    datepicker.on('mm.dateSelected.daterangepicker', (e, picker) => {
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

  ngOnDestroy() {
    this.subscription.unsubscribe();
    // avoid dom-nodes leaks
    (<any>$('#date-filter')).data('daterangepicker').remove();
  }
}
