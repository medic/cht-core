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

import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';

describe('Date Filter Component', () => {
  let component:DateFilterComponent;
  let fixture:ComponentFixture<DateFilterComponent>;
  let dateRangePicker;
  let datePipe;
  let clock;

  beforeEach(waitForAsync(() => {
    const mockedSelectors = [
      { selector: Selectors.getFilters, value: {} },
    ];
    datePipe = { transform: sinon.stub() };
    dateRangePicker = (<any>$.fn).daterangepicker = sinon.stub().returns({ on: sinon.stub() });

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          BrowserAnimationsModule,
          BsDropdownModule.forRoot(),
        ],
        declarations: [
          DateFilterComponent
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          ResponsiveService,
          { provide: DatePipe, useValue: datePipe },
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
    clock = sinon.useFakeTimers(moment().valueOf());
    component.isRange = true;

    component.ngAfterViewInit();

    // value is 2 here because the component was already initialized
    expect(dateRangePicker.callCount).to.equal(2);
    expect(dateRangePicker.args[1][0]).to.deep.include({
      startDate: moment().subtract(1, 'months'),
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
    expect(setFilter.args[0]).to.deep.equal([{ date: { from, to } }]);
  });

  it('should clear the value', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    component.dateRange = { from: 1, to: 2 };

    component.clear();

    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([{ date: undefined }]);
  });

  it('should apply filter correctly', () => {
    clock = sinon.useFakeTimers(moment().valueOf());
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

  it('should do nothing if component is disabled', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    component.dateRange = { from: 1, to: 2 };
    component.disabled = true;

    component.clear();

    expect(setFilter.notCalled).to.be.true;
  });
});
