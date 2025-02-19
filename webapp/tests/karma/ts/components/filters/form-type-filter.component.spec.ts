import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

describe('Form Type Filter Component', () => {
  let component:FormTypeFilterComponent;
  let fixture:ComponentFixture<FormTypeFilterComponent>;
  let store;

  beforeEach(waitForAsync(() => {
    const mockedSelectors = [
      { selector: Selectors.getForms, value: [] },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          BrowserAnimationsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FormsModule,
          FormTypeFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FormTypeFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        store = TestBed.inject(MockStore);
      });
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create Form Type Filter', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');
    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  describe('getLabel', () => {
    it('should return the form title', () => {
      const form = { title: 'myform' };
      expect(component.itemLabel(form)).to.equal('myform');
    });

    it('should return form code when title not present', () => {
      const form = { code: 'formcode' };
      expect(component.itemLabel(form)).to.equal('formcode');
    });
  });

  it('should return form code when calling trackByFn', () => {
    const form = { code: 'formcode' };
    expect(component.trackByFn(0, form)).to.equal('formcode');
  });

  it('should apply correct filter', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    const forms = [{ _id: 'form1' }, { _id: 'form2' }];
    component.applyFilter(forms);
    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([{ forms: { selected: forms } }]);
  });

  it('should clear the filter', () => {
    const filterClearSpy = sinon.spy(component.filter, 'clear');
    component.filter.selected.add('form-1');
    component.filter.selected.add('form-2');

    component.clear();

    expect(filterClearSpy.calledOnce).to.be.true;
    expect(component.filter.selected.size).to.equal(0);
  });

  it('should count selected items in the filter', () => {
    const filterCountSelectedSpy = sinon.spy(component.filter, 'countSelected');
    component.filter.selected.add('form-1');
    component.filter.selected.add('form-2');

    const result = component.countSelected();

    expect(filterCountSelectedSpy.calledOnce).to.be.true;
    expect(result).to.equal(2);
  });

  it('should sort forms by title', fakeAsync(() => {
    const forms = [
      {
        _id: 'id-A',
        code: 'code-A',
        title: 'Form A'
      },
      {
        _id: 'id-C',
        code: 'code-C',
        title: 'Form C'
      },
      {
        _id: 'id-B',
        code: 'code-B',
        title: 'Form B'
      }
    ];
    store.overrideSelector(Selectors.getForms, forms);
    store.overrideSelector(Selectors.getSidebarFilter, { isOpen: true });
    store.refreshState();

    component.ngOnInit();
    flush();

    expect(component.forms).to.have.deep.members([
      {
        _id: 'id-A',
        code: 'code-A',
        title: 'Form A'
      },
      {
        _id: 'id-B',
        code: 'code-B',
        title: 'Form B'
      },
      {
        _id: 'id-C',
        code: 'code-C',
        title: 'Form C'
      }
    ]);
  }));


  it('should do nothing if sidebar is not open', fakeAsync(() => {
    const forms = [
      {
        _id: 'id-A',
        code: 'code-A',
        title: 'Form A'
      },
      {
        _id: 'id-C',
        code: 'code-C',
        title: 'Form C'
      },
      {
        _id: 'id-B',
        code: 'code-B',
        title: 'Form B'
      }
    ];
    store.overrideSelector(Selectors.getForms, forms);
    store.overrideSelector(Selectors.getSidebarFilter, { isOpen: false });
    store.refreshState();

    component.ngOnInit();
    flush();

    expect(component.forms).to.be.undefined;
  }));

  it('should do nothing if component is disabled', () => {
    const filterClearSpy = sinon.spy(component.filter, 'clear');
    component.disabled = true;

    component.clear();

    expect(filterClearSpy.notCalled).to.be.true;
  });
});
