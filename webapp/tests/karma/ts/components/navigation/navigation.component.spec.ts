import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { NavigationService } from '@mm-services/navigation.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture;
  let globalActions;
  let store;
  let navigationService;

  beforeEach(() => {
    const mockedSelectors = [
      { selector: Selectors.getCancelCallback, value: null },
      { selector: Selectors.getTitle, value: null },
      { selector: Selectors.getEnketoSavingStatus, value: null },
    ];

    navigationService = { goBack: sinon.stub() };

    globalActions = {
      unsetSelected: sinon.stub(GlobalActions.prototype, 'unsetSelected'),
      navigationCancel: sinon.stub(GlobalActions.prototype, 'navigationCancel'),
    };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: NavigationService, useValue: navigationService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(NavigationComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  });

  afterEach(() => sinon.restore());

  it('should subscribe to store and assign values', () => {
    const callback = () => 'anything';
    store.overrideSelector(Selectors.getCancelCallback, callback);
    store.overrideSelector(Selectors.getTitle, 'Something');
    store.overrideSelector(Selectors.getEnketoSavingStatus, true);
    store.refreshState();

    component.ngAfterViewInit();

    expect(component.isCancelCallbackSet).to.be.true;
    expect(component.title).to.equal('Something');
    expect(component.enketoSaving).to.be.true;
  });

  it('should cancel navigate', () => {
    component.navigationCancel();

    expect(globalActions.navigationCancel.callCount).to.equal(1);
  });

  describe('navigateBack()', () => {
    it('should navigate back and not unset selected', () => {
      navigationService.goBack.returns(true);

      component.navigateBack();

      expect(navigationService.goBack.callCount).to.equal(1);
      expect(globalActions.unsetSelected.callCount).to.equal(0);
    });

    it('should unset selected if it didnt navigated back', () => {
      navigationService.goBack.returns(false);

      component.navigateBack();

      expect(navigationService.goBack.callCount).to.equal(1);
      expect(globalActions.unsetSelected.callCount).to.equal(1);
    });
  });
});
