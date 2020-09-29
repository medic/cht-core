import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { MultiDropdownFilterComponent } from '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';

describe('Form Type Filter Component', () => {
  let component:FormTypeFilterComponent;
  let fixture:ComponentFixture<FormTypeFilterComponent>;
  let store:MockStore;

  beforeEach(async(() => {
    const mockedSelectors = [
      { selector: 'getForms', value: [] },
    ];

    TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          FormTypeFilterComponent,
          MultiDropdownFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FormTypeFilterComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create Form Type Filter', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
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

  it('trackByFn should return form code', () => {
    const form = { code: 'formcode' };
    expect(component.trackByFn(0, form)).to.equal('formcode');
  });
});
