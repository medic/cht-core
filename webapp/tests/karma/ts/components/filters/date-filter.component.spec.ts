import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { expect } from 'chai';
import sinon from 'sinon';
import * as moment from 'moment';

import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { provideMockStore } from '@ngrx/store/testing';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

describe('Date Filter Component', () => {
  let component:DateFilterComponent;
  let fixture:ComponentFixture<DateFilterComponent>;
  let dateRangePicker;
  let clock;

  beforeEach(async(() => {
    const mockedSelectors = [
      { selector: Selectors.getCurrentTab, value: 'reports' },
    ];

    dateRangePicker = (<any>$.fn).daterangepicker = sinon.stub().returns({ on: sinon.stub() });

    TestBed
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

  it('clear should clear the value', () => {
    component.date = { from: 1, to: 2 };
    component.clear();
    expect(component.date).to.deep.equal({ from: undefined, to: undefined });
  });

  it('should apply filter correctly', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    component.date = { from: 'yesterday', to: 'tomorrow' };
    component.applyFilter();
    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([{ date: { from: 'yesterday', to: 'tomorrow' } }]);
  });
});
