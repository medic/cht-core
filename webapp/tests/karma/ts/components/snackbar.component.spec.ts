import sinon from 'sinon';
import { expect } from 'chai';
import { fakeAsync, tick, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { SnackbarComponent } from '@mm-components/snackbar/snackbar.component';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

describe('SnackbarComponent', () => {
  let fixture;
  let component: SnackbarComponent;
  let store: MockStore;

  const getElement = (cssSelector) => {
    return fixture.debugElement.query(By.css(cssSelector))?.nativeElement;
  };

  beforeEach(async () => {
    const mockedSelectors = [
      { selector: Selectors.getSnackbarContent, value: null },
    ];

    await TestBed
      .configureTestingModule({
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
        ],
      })
      .compileComponents();
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(SnackbarComponent);
    component = fixture.componentInstance;
  });

  it('should hide the snackbar when no message', async () => {
    store.overrideSelector(Selectors.getSnackbarContent, { message: undefined, action: undefined });

    component.ngOnInit();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.active).to.equal(false);
    expect(getElement('#snackbar')).to.exist;
    expect(getElement('#snackbar.active')).to.not.exist;
  });

  it('should display the snackbar with a message and then hide it', fakeAsync(async () => {
    const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
    const message = 'important message';
    component.ngOnInit();
    store.overrideSelector(Selectors.getSnackbarContent, { message, action: undefined });
    store.refreshState();

    expect(component.active).to.equal(true);
    expect(getElement('#snackbar.active')).to.exist;
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(message);
    expect(getElement('#snackbar.active .snackbar-action')).to.not.exist;
    expect(setSnackbarContent.callCount).to.equal(0);

    tick(4500);
    expect(component.active).to.equal(true);
    expect(getElement('#snackbar.active')).to.exist;
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(message);

    tick(500);

    expect(setSnackbarContent.callCount).to.equal(1);
    expect(setSnackbarContent.firstCall.firstArg).to.be.undefined;
    store.overrideSelector(Selectors.getSnackbarContent, { message: undefined, action: undefined });
    store.refreshState();
    expect(component.active).to.equal(false);
    expect(getElement('#snackbar')).to.exist;
    expect(getElement('#snackbar.active')).to.not.exist;
  }));

  it('should display the snackbar with a clickable action', async () => {
    const message = 'important message';
    const action = { label: 'click me', onClick: sinon.stub() };
    component.ngOnInit();
    store.overrideSelector(Selectors.getSnackbarContent, { message, action });
    store.refreshState();

    expect(component.active).to.equal(true);
    expect(getElement('#snackbar.active')).to.exist;
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(message);

    const actionElement = getElement('#snackbar.active .snackbar-action');
    expect(actionElement).to.exist;
    expect(actionElement.innerText).to.equal(action.label);

    expect(action.onClick.callCount).to.equal(0);
    actionElement.click();
    expect(action.onClick.callCount).to.equal(1);
  });
});
