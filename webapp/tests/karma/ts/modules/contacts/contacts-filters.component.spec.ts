import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { GlobalActions } from '@mm-actions/global';
import { expect } from 'chai';
import sinon from 'sinon';
import { ContactsFiltersComponent } from '@mm-modules/contacts/contacts-filters.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { SimprintsFilterComponent } from '@mm-components/filters/simprints-filter/simprints-filter.component';

describe('Reports Filters Component', () => {
  let component: ContactsFiltersComponent;
  let fixture: ComponentFixture<ContactsFiltersComponent>;

  beforeEach(async(() => {
    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          ContactsFiltersComponent,
          FreetextFilterComponent,
          SimprintsFilterComponent
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
    expect(searchSpy.callCount).to.equal(1);
    expect(searchSpy.args[0]).to.deep.equal([undefined]);
    component.applyFilters(true);
    expect(searchSpy.callCount).to.equal(2);
    expect(searchSpy.args[1]).to.deep.equal([true]);
  });

  it('reset filters should reset all filters', () => {
    const clearFilters = sinon.stub(GlobalActions.prototype, 'clearFilters');
    const searchSpy = sinon.spy(component.search, 'emit');
    const freetextClearSpy = sinon.spy(component.freetextFilter, 'clear');

    component.resetFilters();
    expect(clearFilters.callCount).to.equal(1);
    expect(searchSpy.callCount).to.equal(1);
    expect(searchSpy.args[0]).to.deep.equal([undefined]);
    expect(freetextClearSpy.callCount).to.equal(1);
  });
});
