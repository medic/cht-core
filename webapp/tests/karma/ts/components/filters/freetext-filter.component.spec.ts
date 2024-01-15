import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { provideMockStore } from '@ngrx/store/testing';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

describe('Freetext Filter Component', () => {
  let component:FreetextFilterComponent;
  let fixture:ComponentFixture<FreetextFilterComponent>;

  beforeEach(waitForAsync(() => {
    const mockedSelectors = [
      { selector: Selectors.getCurrentTab, value: 'reports' },
      { selector: Selectors.getFilters, value: { search: '' } },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          BrowserAnimationsModule,
          FormsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          BsDropdownModule.forRoot(),   // Fix "Can't bind to 'insideClick' since it isn't a known property ..."
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
  });

  it('should create Freetext Filter', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('clear should apply and clear the value', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    component.applyFieldChange('value');
    expect(component.inputText).to.equal('value');
    expect(setFilter.callCount).to.equal(0);
    component.clear();
    expect(component.inputText).to.equal('');
    expect(setFilter.callCount).to.equal(0);
  });

  it('should set the filter correctly', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    const emitSpy = sinon.spy(component.search, 'emit');

    component.applyFieldChange('new value', true);

    expect(setFilter.calledOnce).to.be.true;
    expect(setFilter.args[0]).to.deep.equal([{ search: 'new value' }]);
    expect(emitSpy.calledOnce).to.be.true;
    expect(emitSpy.args[0]).to.be.empty;
  });

  it('should do nothing if component is disabled', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    component.disabled = true;

    component.applyFieldChange('value', true);
    component.clear();

    expect(setFilter.notCalled).to.be.true;
  });
});
