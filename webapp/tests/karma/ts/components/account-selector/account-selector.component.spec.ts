import 'mocha';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { AccountSelectorComponent } from '@mm-components/account-selector/account-selector.component';
import { SessionCacheService } from '@mm-services/session-cache.service';

describe('AccountSelectorComponent', () => {
  let fixture: ComponentFixture<AccountSelectorComponent>;
  let sessionCacheService: {
    cacheCurrentSessionForSelector: sinon.SinonStub;
    listCachedAccounts: sinon.SinonStub;
    navigateToAddAccountLogin: sinon.SinonStub;
    restoreSession: sinon.SinonStub;
  };

  beforeEach(async () => {
    sessionCacheService = {
      cacheCurrentSessionForSelector: sinon.stub(),
      listCachedAccounts: sinon.stub().returns([
        { username: 'user-a' },
        { username: 'user-b' },
      ]),
      navigateToAddAccountLogin: sinon.stub(),
      restoreSession: sinon.stub(),
    };

    await TestBed
      .configureTestingModule({
        imports: [AccountSelectorComponent],
        providers: [
          { provide: SessionCacheService, useValue: sessionCacheService },
        ],
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountSelectorComponent);
    fixture.detectChanges();
  });

  afterEach(() => sinon.restore());

  it('renders cached account list', () => {
    const accountButtons = fixture.nativeElement.querySelectorAll('.account-option');
    expect(accountButtons.length).to.equal(2);
    expect(accountButtons[0].textContent).to.contain('user-a');
    expect(accountButtons[1].textContent).to.contain('user-b');
    expect(sessionCacheService.cacheCurrentSessionForSelector.calledOnce).to.be.true;
    expect(sessionCacheService.listCachedAccounts.calledOnce).to.be.true;
  });

  it('navigates to login when add account is clicked', () => {
    fixture.nativeElement.querySelector('.add-account').click();
    expect(sessionCacheService.navigateToAddAccountLogin.calledOnce).to.be.true;
  });

  it('restores selected cached account', () => {
    fixture.nativeElement.querySelector('.account-option').click();
    expect(sessionCacheService.restoreSession.calledOnceWith('user-a')).to.be.true;
  });
});
