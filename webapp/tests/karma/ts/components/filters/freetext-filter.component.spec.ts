import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { provideMockStore } from '@ngrx/store/testing';
import { GlobalActions } from '@mm-actions/global';

describe('Freetext Filter Component', () => {
  let component:FreetextFilterComponent;
  let fixture:ComponentFixture<FreetextFilterComponent>;
  let clock;

  beforeEach(async(() => {
    const mockedSelectors = [
      { selector: 'getCurrentTab', value: 'reports' },
      { selector: 'getFilters', value: { search: '' } },
    ];

    TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          FreetextFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FreetextFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
  });

  it('should create Freetext Filter', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('should debounce searches on typing', () => {
    clock = sinon.useFakeTimers();
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');

    const applyFilterSpy = sinon.spy(component, 'applyFilter');
    component.onFieldChange('v');
    expect(applyFilterSpy.callCount).to.equal(0);
    expect(setFilter.callCount).to.equal(0);
    component.onFieldChange('va');
    expect(applyFilterSpy.callCount).to.equal(0);
    clock.tick(100);
    component.onFieldChange('val');
    expect(applyFilterSpy.callCount).to.equal(0);
    clock.tick(100);
    component.onFieldChange('valu');
    expect(applyFilterSpy.callCount).to.equal(0);
    expect(setFilter.callCount).to.equal(0);
    clock.tick(1000);
    expect(applyFilterSpy.callCount).to.equal(1);
    expect(component.inputText).to.equal('valu');
    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([{ search: 'valu' }]);
  });

  it('clear should clear the value', () => {
    clock = sinon.useFakeTimers();
    component.onFieldChange('value');
    clock.tick(1000);
    expect(component.inputText).to.equal('value');
    component.clear();
    expect(component.inputText).to.equal('');
  });
});
