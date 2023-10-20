import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { FormsModule } from '@angular/forms';

describe('Search Bar Component', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;
  let store: MockStore;
  let responsiveService;
  let searchFiltersService;

  beforeEach(() => {
    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: { filterCount: { total: 5 } } },
      { selector: Selectors.getFilters, value: undefined },
    ];
    searchFiltersService = { init: sinon.stub() };
    responsiveService = { isMobile: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          FormsModule
        ],
        declarations: [
          SearchBarComponent,
          FreetextFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: SearchFiltersService, useValue: searchFiltersService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(SearchBarComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  });

  it('should create component', fakeAsync(() => {
    flush();
    expect(component).to.exist;
    expect(component.activeFilters).to.equal(5);
  }));

  it('should init search filter service', fakeAsync(() => {
    sinon.resetHistory();

    component.ngAfterViewInit();

    expect(searchFiltersService.init.calledOnce).to.be.true;
  }));

  it('should unsubscribe from observables on component destroy', () => {
    const unsubscribeSpy = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.callCount).to.equal(1);
  });

  it('should clear search term and apply', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter, 'clear');

    component.clear();

    expect(freeTextClearSpy.calledOnce).to.be.true;
    expect(freeTextClearSpy.args[0]).to.deep.equal([ true ]);
    expect(component.openSearch).to.be.false;
  });

  it('should do nothing if component is disabled', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter, 'clear');
    component.disabled = true;

    component.clear();

    expect(freeTextClearSpy.notCalled).to.be.true;
  });

  it('should toggle search', () => {
    responsiveService.isMobile.returns(true);
    component.toggleMobileSearch();
    expect(component.openSearch).to.be.true;
    component.toggleMobileSearch();
    expect(component.openSearch).to.be.false;

    responsiveService.isMobile.returns(false);
    component.toggleMobileSearch();
    expect(component.openSearch).to.be.false;

    component.toggleMobileSearch(true);
    expect(component.openSearch).to.be.true;
  });

  it('should show search icon when searchbar is close and no search terms', fakeAsync(() => {
    store.overrideSelector(Selectors.getFilters, { search: 'some text' });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showSearchIcon()).to.be.false;

    component.openSearch = false;
    tick();
    expect(component.showSearchIcon()).to.be.false;

    store.overrideSelector(Selectors.getFilters, { search: null });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showSearchIcon()).to.be.false;

    component.openSearch = false;
    tick();
    expect(component.showSearchIcon()).to.be.true;
  }));

  it('should show clear icon when searchbar is open or there are search terms', fakeAsync(() => {
    store.overrideSelector(Selectors.getFilters, { search: 'some text' });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showClearIcon()).to.be.true;

    component.openSearch = false;
    tick();
    expect(component.showClearIcon()).to.be.true;

    store.overrideSelector(Selectors.getFilters, { search: null });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showClearIcon()).to.be.true;

    component.openSearch = false;
    tick();
    expect(component.showClearIcon()).to.be.false;
  }));
});
