import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { provideMockStore } from '@ngrx/store/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import * as moment from 'moment';

import { MockStore } from '@ngrx/store/testing';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';
import { LanguageService } from '@mm-services/language.service';
import { FormatDateService } from '@mm-services/format-date.service';

describe('Date Filter Component', () => {
  let component: DateFilterComponent;
  let fixture: ComponentFixture<DateFilterComponent>;
  let dateRangePicker;
  let datePipe;
  let clock;
  let languageService;
  let formatDateService;
  let nepaliDatePickerStub;

  beforeEach(waitForAsync(() => {
    const mockedSelectors = [
      { selector: Selectors.getFilters, value: {} },
      { selector: Selectors.getDirection, value: 'ltr' },
    ];
    datePipe = { transform: sinon.stub() };
    dateRangePicker = (<any>$.fn).daterangepicker = sinon.stub().returns({ on: sinon.stub() });
    nepaliDatePickerStub = (<any>$.fn).nepaliDatePicker = sinon.stub().returns({ on: sinon.stub() });

    languageService = {
      useDevanagariScript: sinon.stub().returns(false),
    };
    formatDateService = {
      dayMonth: sinon.stub().returns('Formatted Date'),
    };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          BrowserAnimationsModule,
          BsDropdownModule.forRoot(),
          DateFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          ResponsiveService,
          { provide: DatePipe, useValue: datePipe },
          { provide: LanguageService, useValue: languageService },
          { provide: FormatDateService, useValue: formatDateService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DateFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
  });

  it('should create Date Filter', () => {
    expect(component).to.exist;
  });

  it('ngAfterViewInit should initialize daterangepicker', () => {
    clock = sinon.useFakeTimers({now: moment().valueOf()});

    component.ngAfterViewInit();

    // value is 2 here because the component was already initialized
    expect(dateRangePicker.callCount).to.equal(2);
    expect(dateRangePicker.args[1][0]).to.deep.include({
      startDate: moment(),
      endDate: moment(),
      maxDate: moment(),
    });
    const callback = dateRangePicker.args[0][1];
    expect(callback).to.be.a('function');

    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    expect(setFilter.callCount).to.equal(0);
    const from = moment().subtract(2, 'months');
    const to = moment().subtract(1, 'months');
    callback(from, to);
    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([{ date: { to } }]);
  });

  it('should clear the value', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    component.dateRange = { from: 1, to: 2 };

    component.clear();

    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([{ date: undefined }]);
  });

  it('should apply filter correctly', () => {
    clock = sinon.useFakeTimers({now: moment().valueOf()});
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    const from = moment().subtract(2, 'days');
    const to = moment();
    const dateRange = { from, to };

    component.applyFilter(dateRange);

    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([{ date: { from, to } }]);
  });

  it('should not apply filter if date range is invalid', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    const from = moment();
    const to = moment().subtract(2, 'days');
    const dateRange = { from, to };

    component.applyFilter(dateRange);

    expect(setFilter.callCount).to.equal(0);
  });

  it('should count if a date has value', () => {
    component.dateRange = { from: new Date(), to: undefined };
    component.isStartDate = true;
    const result1 = component.countSelected();
    expect(result1).to.equal(1);

    component.isStartDate = false;
    const result2 = component.countSelected();
    expect(result2).to.equal(0);
  });

  it('should unsubscribe from direction selector on destroy', () => {
    const store = TestBed.inject(MockStore);
    expect(component.direction).to.equal('ltr');

    component.ngOnDestroy();
    store.overrideSelector(Selectors.getDirection, 'rtl');
    store.refreshState();

    expect(component.direction).to.equal('ltr');
  });

  it('should do nothing if component is disabled', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    component.dateRange = { from: 1, to: 2 };
    component.disabled = true;

    component.clear();

    expect(setFilter.notCalled).to.be.true;
  });

  describe('when language is Nepali (Bikram Sambat)', () => {
    beforeEach(() => {
      languageService.useDevanagariScript.returns(true);
      // Re-create component to pick up the updated stub value
      fixture = TestBed.createComponent(DateFilterComponent);
      component = fixture.componentInstance;
      component.ngOnInit();
      // Mock the field element so we can append/find the hidden input
      const html = `<div id="bikram-sambat-test-wrapper"><input id="test-field-id" /></div>`;
      document.body.insertAdjacentHTML('afterbegin', html);
      component.fieldId = 'test-field-id';

      // Reset stub histories
      dateRangePicker.resetHistory();
      nepaliDatePickerStub.resetHistory();
    });

    afterEach(() => {
      $('#bikram-sambat-test-wrapper').remove();
    });

    it('ngAfterViewInit should initialize setupNepaliDatePicker on hidden input', () => {
      component.ngAfterViewInit();

      expect(dateRangePicker.callCount).to.equal(0);
      expect(nepaliDatePickerStub.callCount).to.equal(1);

      const maxDateVal = nepaliDatePickerStub.args[0][0].maxDate;
      expect(maxDateVal).to.match(/^[०-९-]+$/);

      const hiddenInput = $('#bikram-sambat-test-wrapper .nepali-datepicker-input');
      expect(hiddenInput).to.have.lengthOf(1);
    });

    it('clicking filter input should trigger click on hidden input with pre-populated BS date', () => {
      component.ngAfterViewInit();
      component.isStartDate = true;
      component.dateRange = { from: moment('2024-07-24').valueOf(), to: undefined };

      const hiddenInput = $('#bikram-sambat-test-wrapper .nepali-datepicker-input');
      const clickSpy = sinon.spy(hiddenInput[0], 'click');

      $(`#test-field-id`).click();

      expect(clickSpy.callCount).to.equal(1);
      expect(hiddenInput.val()).to.equal('२०८१-०४-०९'); // 2024-07-24 is 2081-04-09 in Bikram Sambat (Devanagari format)

      clickSpy.restore();
    });

    it('clicking filter input for to-date should trigger click on hidden input with start-of-day BS date', () => {
      component.ngAfterViewInit();
      component.isStartDate = false;
      const endOfDay = moment('2024-07-24').endOf('day').valueOf();
      component.dateRange = { from: undefined, to: endOfDay };

      const hiddenInput = $('#bikram-sambat-test-wrapper .nepali-datepicker-input');
      const clickSpy = sinon.spy(hiddenInput[0], 'click');

      $(`#test-field-id`).click();

      expect(clickSpy.callCount).to.equal(1);
      // Should still be 2081-04-09, NOT 2081-04-10 (which is the next day)
      expect(hiddenInput.val()).to.equal('२०८१-०४-०९');

      clickSpy.restore();
    });

    it('selecting a date from nepaliDatePicker should apply filter with converted Gregorian date', () => {
      component.ngAfterViewInit();
      component.isStartDate = true;
      component.dateRange = { from: undefined, to: undefined };

      const hiddenInput = $('#bikram-sambat-test-wrapper .nepali-datepicker-input');
      const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');

      // Trigger the dateSelect event handler registered on the hidden input
      const event = $.Event('dateSelect');
      (event as any).datePickerData = {
        bsYear: 2081,
        bsMonth: 4,
        bsDate: 9
      };
      hiddenInput.trigger(event);

      expect(setFilter.callCount).to.equal(1);
      const appliedDate = setFilter.args[0][0].date.from;
      expect(moment(appliedDate).format('YYYY-MM-DD')).to.equal('2024-07-24');
      setFilter.restore();
    });

    it('should normalize to-date to end of day on selection', () => {
      component.ngAfterViewInit();
      component.isStartDate = false;
      component.dateRange = { from: undefined, to: undefined };

      const hiddenInput = $('#bikram-sambat-test-wrapper .nepali-datepicker-input');
      const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');

      const event = $.Event('dateSelect');
      (event as any).datePickerData = {
        bsYear: 2081,
        bsMonth: 4,
        bsDate: 9
      };
      hiddenInput.trigger(event);

      expect(setFilter.callCount).to.equal(1);
      const appliedDate = setFilter.args[0][0].date.to;
      expect(moment(appliedDate).format('YYYY-MM-DD HH:mm:ss.SSS')).to.equal('2024-07-24 23:59:59.999');
      setFilter.restore();
    });

    it('ngOnDestroy should clean up specific picker container and overlay', () => {
      component.ngAfterViewInit();
      const hiddenInput = $('#bikram-sambat-test-wrapper .nepali-datepicker-input');
      
      // Mock picker data and element
      const containerHtml = `<div class="nepali-date-picker"></div>`;
      document.body.insertAdjacentHTML('afterbegin', containerHtml);
      const $pickerEl = $('.nepali-date-picker');
      hiddenInput.data('picker', $pickerEl);

      // Create overlay
      $('<div class="nepali-date-picker-overlay"></div>').appendTo('body');

      component.ngOnDestroy();

      expect($('.nepali-datepicker-input')).to.have.lengthOf(0);
      expect($('.nepali-date-picker')).to.have.lengthOf(0);
      expect($('.nepali-date-picker-overlay')).to.have.lengthOf(0);
    });

    it('setLabel should use formatDateService.dayMonth', () => {
      component.isStartDate = true;
      component.setLabel({ from: moment('2024-07-24').valueOf(), to: undefined });

      expect(formatDateService.dayMonth.callCount).to.equal(1);
      expect(formatDateService.dayMonth.args[0][0]).to.equal(moment('2024-07-24').valueOf());
      expect(component.inputLabel).to.equal('Formatted Date');
    });

    it('setLabel should normalize to-date to start of day', () => {
      component.isStartDate = false;
      const endOfDayVal = moment('2024-07-24').endOf('day').valueOf();
      const startOfDayVal = moment('2024-07-24').startOf('day').valueOf();

      component.setLabel({ from: undefined, to: endOfDayVal });

      expect(formatDateService.dayMonth.callCount).to.equal(1);
      expect(formatDateService.dayMonth.args[0][0]).to.equal(startOfDayVal);
      expect(component.inputLabel).to.equal('Formatted Date');
    });
  });
});
