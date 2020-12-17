import { FormsModule } from '@angular/forms';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

import { UpdatePasswordComponent } from '@mm-modals/edit-user/update-password.component';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { UpdateUserService } from '@mm-services/update-user.service';
import { MmModal } from '@mm-modals/mm-modal/mm-modal';
import { TranslateHelperService } from '@mm-services/translate-helper.service';

describe('UpdatePasswordComponent', () => {

  let component: UpdatePasswordComponent;
  let fixture: ComponentFixture<UpdatePasswordComponent>;
  let userSettingsService;
  let updateUserService;
  let translateHelperService;
  let bsModalRef;

  beforeEach(async(() => {
    bsModalRef = { hide: sinon.stub(), onHide: new Subject() };
    updateUserService = {
      update: sinon.stub().resolves({}),
    };
    userSettingsService = {
      get: sinon.stub().resolves(
        {
          _id: 'user123',
          name: 'admin',
          fullname: 'Admin',
          email: 'admin@demo.medic.com',
          phone: '+99 999 9999',
          language: 'es'
        }
      )
    };
    translateHelperService = {
      fieldIsRequired: sinon.stub().resolvesArg(0),
      get: sinon.stub().resolvesArg(0),
    };

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
          { provide: UpdateUserService, useValue: updateUserService },
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: BsModalRef, useValue: bsModalRef },
          { provide: TranslateHelperService, useValue: translateHelperService },
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

  it('should state been initialized correctly', () => {
    expect(component.editUserModel).to.deep.equal({
      id: 'user123',
      username: 'admin',
      fullname: 'Admin',
      email: 'admin@demo.medic.com',
      phone: '+99 999 9999',
      language: { code: 'es' }
    });
    expect(component.errors).to.deep.equal({});
  });

  it('password must be filled', () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    component.editUserModel.password = '';
    component.updatePassword();
    expect(translateHelperService.fieldIsRequired.called).to.equal(true);
    expect(translateHelperService.fieldIsRequired.args[0]).to.deep.equal(['Password']);
    expect(updateUserService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  });

  it('password must be long enough', () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    component.editUserModel.password = '2sml4me';
    component.editUserModel.passwordConfirm = '2sml4me';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateHelperService.get.called).to.equal(true);
    expect(translateHelperService.get.getCall(0).args[0]).to.equal('password.length.minimum');
    expect(updateUserService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  });

  it('password must be hard to brute force', () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    component.editUserModel.password = 'password';
    component.editUserModel.passwordConfirm = 'password';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateHelperService.get.called).to.equal(true);
    expect(translateHelperService.get.getCall(0).args[0]).to.equal('password.weak');
    expect(updateUserService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  });

  it('error if password and confirm do not match', () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password + 'a';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateHelperService.get.called).to.equal(true);
    expect(translateHelperService.get.getCall(0).args[0]).to.equal('Passwords must match');
    expect(updateUserService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  });

  it('user is updated with password change', () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    const currentPassword = '2xml4me';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;
    component.editUserModel.currentPassword = currentPassword;
    component.updatePassword();
    expect(translateHelperService.get.called).to.equal(false);
    expect(component.errors).to.deep.equal({});
    expect(updateUserService.update.called).to.equal(true);
    expect(updateUserService.update.getCall(0).args[0]).to.equal('admin');
    expect(updateUserService.update.getCall(0).args[1].password).to.equal(password);
    expect(updateUserService.update.getCall(0).args[2]).to.equal('admin');
    expect(updateUserService.update.getCall(0).args[3]).to.equal(currentPassword);
  });

  it('errors if current password is not provided', () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;

    component.updatePassword();
    expect(translateHelperService.fieldIsRequired.called).to.equal(true);
    expect(translateHelperService.fieldIsRequired.getCall(0).args[0]).to.deep.equal('Current Password');
    expect(updateUserService.update.called).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
  });
});
