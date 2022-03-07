import { FormsModule } from '@angular/forms';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { ComponentFixture, TestBed, fakeAsync, waitForAsync } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

import { UpdatePasswordComponent } from '@mm-modals/edit-user/update-password.component';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguageService } from '@mm-services/language.service';
import { UpdatePasswordService } from '@mm-services/update-password.service';
import { UserLoginService } from '@mm-services/user-login.service';
import { MmModal, MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { TranslateService } from '@mm-services/translate.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { ConfirmPasswordUpdatedComponent } from '@mm-modals/edit-user/confirm-password-updated.component';

describe('UpdatePasswordComponent', () => {

  let component: UpdatePasswordComponent;
  let fixture: ComponentFixture<UpdatePasswordComponent>;
  let userSettingsService;
  let languageService;
  let updatePasswordService;
  let translateService;
  let bsModalRef;
  let userLoginService;
  let modalService;
  let setFinished;
  let close;

  beforeEach(waitForAsync(() => {
    bsModalRef = { hide: sinon.stub(), onHide: new Subject() };
    updatePasswordService = {
      update: sinon.stub().resolves({}),
    };
    userLoginService = {
      login: sinon.stub(),
    };
    modalService = {
      show: sinon.stub().resolves(),
    };
    userSettingsService = {
      get: sinon.stub().resolves(
        {
          _id: 'user123',
          name: 'admin',
          fullname: 'Admin',
          email: 'admin@demo.medic.com',
          phone: '+99 999 9999'
        }
      )
    };
    languageService = { get: sinon.stub().resolves('es') };
    translateService = {
      fieldIsRequired: sinon.stub().resolvesArg(0),
      get: sinon.stub().resolvesArg(0),
    };
    setFinished = sinon.stub(MmModalAbstract.prototype, 'setFinished');
    close = sinon.stub(MmModalAbstract.prototype, 'close');

    return TestBed
      .configureTestingModule({
        imports: [
          FormsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          UpdatePasswordComponent,
          MmModal,
        ],
        providers: [
          { provide: UpdatePasswordService, useValue: updatePasswordService },
          { provide: UserLoginService, useValue: userLoginService },
          { provide: ModalService, useValue: modalService },
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: LanguageService, useValue: languageService },
          { provide: BsModalRef, useValue: bsModalRef },
          { provide: TranslateService, useValue: translateService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(UpdatePasswordComponent);
        component = fixture.componentInstance;

        // @ts-ignore
        sinon.stub(component, 'windowReload');

        fixture.detectChanges();
        return fixture.whenStable();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('password must be filled', fakeAsync(async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    component.editUserModel.password = '';
    await component.updatePassword();
    expect(translateService.fieldIsRequired.called).to.equal(true);
    expect(translateService.fieldIsRequired.args[0]).to.deep.equal(['Password']);
    expect(updatePasswordService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  }));

  it('password must be long enough', fakeAsync(async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    component.editUserModel.password = '2sml4me';
    component.editUserModel.passwordConfirm = '2sml4me';
    component.editUserModel.currentPassword = '2xml4me';
    await component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('password.length.minimum');
    expect(updatePasswordService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  }));

  it('password must be hard to brute force', fakeAsync(async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    component.editUserModel.password = 'password';
    component.editUserModel.passwordConfirm = 'password';
    component.editUserModel.currentPassword = '2xml4me';
    await component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('password.weak');
    expect(updatePasswordService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  }));

  it('error if password and confirm do not match', fakeAsync(async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password + 'a';
    component.editUserModel.currentPassword = '2xml4me';
    await component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('Passwords must match');
    expect(updatePasswordService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  }));

  it('user is updated with password change', fakeAsync(async () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    const currentPassword = '2xml4me';
    const user = 'admin';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;
    component.editUserModel.currentPassword = currentPassword;
    userLoginService.login.resolves({});
    await component.updatePassword();

    expect(translateService.get.called).to.equal(false);
    expect(component.errors).to.deep.equal({});
    expect(updatePasswordService.update.called).to.equal(true);
    expect(updatePasswordService.update.getCall(0).args[0]).to.equal(user);
    expect(updatePasswordService.update.getCall(0).args[1]).to.equal(currentPassword);
    expect(updatePasswordService.update.getCall(0).args[2]).to.equal(password);
    expect(userLoginService.login.called).to.equal(true);
    expect(userLoginService.login.getCall(0).args[0]).to.equal(user, password);
  }));

  it('should login user when password is correclty updated', fakeAsync(async () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    const currentPassword = '2xml4me';
    const user = 'admin';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;
    component.editUserModel.currentPassword = currentPassword;

    modalService.show.resolves({});
    userLoginService.login.rejects({status: 302});

    await component.updatePassword();

    expect(updatePasswordService.update.called).to.equal(true);
    expect(userLoginService.login.called).to.equal(true);
    expect(userLoginService.login.getCall(0).args[0]).to.equal(user, password);
    expect(setFinished.callCount).to.equal(1);
    expect(close.callCount).to.equal(1);
    expect(modalService.show.callCount).to.equal(1);
    expect(modalService.show.args[0]).to.deep.equal([
      ConfirmPasswordUpdatedComponent,
    ]);
  }));

  it('should not show updated password modal when login is not successful', fakeAsync(async () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    const currentPassword = '2xml4me';
    const user = 'admin';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;
    component.editUserModel.currentPassword = currentPassword;

    modalService.show.resolves({});
    userLoginService.login.rejects({status: 401});

    await component.updatePassword();

    expect(updatePasswordService.update.called).to.equal(true);
    expect(userLoginService.login.called).to.equal(true);
    expect(userLoginService.login.getCall(0).args[0]).to.equal(user, password);
    expect(setFinished.callCount).to.equal(0);
    expect(close.callCount).to.equal(0);
    expect(modalService.show.callCount).to.equal(0);
  }));

  it('errors if current password is not provided', fakeAsync(async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;

    await component.updatePassword();
    expect(translateService.fieldIsRequired.called).to.equal(true);
    expect(translateService.fieldIsRequired.getCall(0).args[0]).to.deep.equal('Current Password');
    expect(updatePasswordService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  }));
});
