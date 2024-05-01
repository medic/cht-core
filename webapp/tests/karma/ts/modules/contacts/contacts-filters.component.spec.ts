import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { GlobalActions } from '@mm-actions/global';
import { expect } from 'chai';
import sinon from 'sinon';

import { ContactsFiltersComponent } from '@mm-modules/contacts/contacts-filters.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { ResetFiltersComponent } from '@mm-components/filters/reset-filters/reset-filters.component';
import { SortFilterComponent } from '@mm-components/filters/sort-filter/sort-filter.component';

describe('Reports Filters Component', () => {
  let component: ContactsFiltersComponent;
  let fixture: ComponentFixture<ContactsFiltersComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FormsModule,
        ],
        declarations: [
          ContactsFiltersComponent,
          FreetextFilterComponent,
          ResetFiltersComponent,
          SortFilterComponent,
        ],
        providers: [
          provideMockStore(),
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ContactsFiltersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('apply filters should emit search', () => {
    const searchSpy = sinon.spy(component.search, 'emit');
    component.applyFilters();

    expect(searchSpy.calledOnce).to.be.true;
    expect(searchSpy.args[0][0]).to.be.undefined;
  });

  it('reset filters should reset all filters', () => {
    const clearFilters = sinon.stub(GlobalActions.prototype, 'clearFilters');
    const searchSpy = sinon.spy(component.search, 'emit');
    const freetextClearSpy = sinon.spy(component.freetextFilter!, 'clear');

    component.resetFilters();

    expect(clearFilters.calledOnce).to.be.true;
    expect(searchSpy.calledOnce).to.be.true;
    expect(searchSpy.args[0]).to.be.empty;
    expect(freetextClearSpy.calledOnce).to.be.true;
  });
});
