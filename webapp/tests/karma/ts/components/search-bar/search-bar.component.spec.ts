import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';

import { SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { Selectors } from '@mm-selectors/index';

describe('Search Bar Component', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  beforeEach(waitForAsync(() => {
    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: { filterCount: { total: 5 } } },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          SearchBarComponent,
          FreetextFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(SearchBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create component', fakeAsync(() => {
    flush();
    expect(component).to.exist;
    expect(component.activeFilters).to.equal(5);
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
  });

  it('should do nothing if component is disabled', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter, 'clear');
    component.disabled = true;

    component.clear();

    expect(freeTextClearSpy.notCalled).to.be.true;
  });
});
