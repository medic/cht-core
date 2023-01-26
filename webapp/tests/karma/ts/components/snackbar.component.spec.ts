import type { SinonStub } from 'sinon';
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
  let setSnackbarContent: SinonStub;

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
    setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
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
    expect(setSnackbarContent.args[0]).to.deep.equal([]);
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

  it('should display the snackbar with a message and queue another one', fakeAsync(async () => {
    const firstMessage = 'first message';
    const secondMessage = 'second message';

    component.ngOnInit();
    store.overrideSelector(Selectors.getSnackbarContent, { message: firstMessage, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(firstMessage);

    // second message gets queued
    expect(setSnackbarContent.callCount).to.equal(0);
    store.overrideSelector(Selectors.getSnackbarContent, { message: secondMessage, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(firstMessage);

    tick(250);
    // first message disappears
    expect(setSnackbarContent.callCount).to.equal(1);
    expect(setSnackbarContent.args[0]).to.deep.equal([]);
    store.overrideSelector(Selectors.getSnackbarContent, { message: undefined, action: undefined });
    store.refreshState();

    tick(250);
    // second message is shown
    expect(setSnackbarContent.callCount).to.equal(2);
    expect(setSnackbarContent.secondCall.args[0]).to.equal(secondMessage);
    store.overrideSelector(Selectors.getSnackbarContent, { message: secondMessage, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(secondMessage);

    tick(5000);
    // snackbar is hidden
    expect(setSnackbarContent.callCount).to.equal(3);
    expect(setSnackbarContent.args[2]).to.deep.equal([]);
    store.overrideSelector(Selectors.getSnackbarContent, { message: undefined, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active')).to.not.exist;
  }));

  it('should display the snackbar with a message and queue two others', fakeAsync(async () => {
    const firstMessage = 'first message';
    const secondMessage = 'second message';
    const thirdMessage = 'third message';

    component.ngOnInit();
    store.overrideSelector(Selectors.getSnackbarContent, { message: firstMessage, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(firstMessage);

    // second message gets queued
    expect(setSnackbarContent.callCount).to.equal(0);
    store.overrideSelector(Selectors.getSnackbarContent, { message: secondMessage, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(firstMessage);

    tick(200);
    // queue third message before first message disappears
    expect(setSnackbarContent.callCount).to.equal(0);
    store.overrideSelector(Selectors.getSnackbarContent, { message: thirdMessage, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(firstMessage);

    tick(250);
    // first message disappears
    expect(setSnackbarContent.callCount).to.equal(1);
    expect(setSnackbarContent.args[0]).to.deep.equal([]);
    store.overrideSelector(Selectors.getSnackbarContent, { message: undefined, action: undefined });
    store.refreshState();

    tick(500);
    // third message is shown
    expect(setSnackbarContent.callCount).to.equal(2);
    expect(setSnackbarContent.secondCall.args[0]).to.equal(thirdMessage);
    store.overrideSelector(Selectors.getSnackbarContent, { message: thirdMessage, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active .snackbar-message').innerText).to.equal(thirdMessage);

    tick(5000);
    // snackbar is hidden
    expect(setSnackbarContent.callCount).to.equal(3);
    expect(setSnackbarContent.args[2]).to.deep.equal([]);
    store.overrideSelector(Selectors.getSnackbarContent, { message: undefined, action: undefined });
    store.refreshState();
    expect(getElement('#snackbar.active')).to.not.exist;
  }));
});
