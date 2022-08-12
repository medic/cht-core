import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';

import { ReportsActionsBarComponent } from '@mm-modules/reports/reports-actions-bar.component';
import { Selectors } from '@mm-selectors/index';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';

describe('Reports Actions Bar Component', () => {
  let component: ReportsActionsBarComponent;
  let fixture: ComponentFixture<ReportsActionsBarComponent>;

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
          ReportsActionsBarComponent,
          FreetextFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ReportsActionsBarComponent);
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

  it('should reset filters', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter, 'clear');
    const resetFilterSpy = sinon.spy(component.resetFilter, 'emit');

    component.reset();

    expect(freeTextClearSpy.calledOnce).to.be.true;
    expect(resetFilterSpy.calledOnce).to.be.true;
  });

  it('should do nothing if component is disabled', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter, 'clear');
    const resetFilterSpy = sinon.spy(component.resetFilter, 'emit');
    component.disabled = true;

    component.reset();

    expect(freeTextClearSpy.notCalled).to.be.true;
    expect(resetFilterSpy.notCalled).to.be.true;
  });
});
