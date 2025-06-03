import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { SessionService } from '@mm-services/session.service';
import { ModalService } from '@mm-services/modal.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ConfigurationUserComponent } from '@mm-modules/configuration-user/configuration-user.component';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { NavigationService } from '@mm-services/navigation.service';
import { EditUserSettingsComponent } from '@mm-modals/edit-user/edit-user-settings.component';
import { UpdatePasswordComponent } from '@mm-modals/edit-user/update-password.component';

describe('Configuration User Component', () => {
  let modalService;
  let sessionService;
  let userSettingsService;

  beforeEach(async () => {
    modalService = { show: sinon.stub() };
    sessionService = { isAdmin: sinon.stub() };
    userSettingsService = { get: sinon.stub() };

    await TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        providers: [
          provideMockStore({ selectors: [] }),
          { provide: ModalService, useValue: modalService },
          { provide: NavigationService, useValue: {} },
          { provide: SessionService, useValue: sessionService },
          { provide: UserSettingsService, useValue: userSettingsService },
        ]
      })
      .compileComponents();
  });

  const createComponent = () => {
    const fixture = TestBed.createComponent(ConfigurationUserComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  afterEach(() => {
    sinon.restore();
  });

  describe('ngOnInit', () => {
    [
      ['user can update password', { token_login: false, oidc_login: false }, false, true],
      ['token login is enabled', { token_login: true, oidc_login: false }, false, false],
      ['oidc login is enabled', { token_login: false, oidc_login: true }, false, false],
      ['the user is an admin', { token_login: false, oidc_login: false }, true, false],
    ].forEach(([test, user, isAdmin, expectedCanUpdatePass]) => {
      it(`correctly initializes the component when ${test}`, fakeAsync(() => {
        userSettingsService.get.resolves(user);
        sessionService.isAdmin.returns(isAdmin);
        const component = createComponent();
        expect(component.loading).to.be.true;

        flush();

        expect(component.loading).to.be.false;
        expect(component.canUpdatePassword).to.equal(expectedCanUpdatePass);
      }));
    });
  });

  it('editSettings shows edit user settings component', () => {
    userSettingsService.get.resolves({});

    const component = createComponent();
    component.editSettings();

    expect(modalService.show.calledOnceWithExactly(EditUserSettingsComponent)).to.be.true;
  });

  it('updatePassword shows update password component', () => {
    userSettingsService.get.resolves({});

    const component = createComponent();
    component.updatePassword();

    expect(modalService.show.calledOnceWithExactly(UpdatePasswordComponent)).to.be.true;
  });
});
