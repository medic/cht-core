import sinon from 'sinon';
import {expect} from 'chai';
import {EMPTY} from 'rxjs';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {UpdatePasswordComponent} from '@mm-modals/edit-user/update-password.component';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {UserSettingsService} from '@mm-services/user-settings.service';
import {LanguagesService} from '@mm-services/languages.service';
import {UpdateUserService} from '@mm-services/update-user.service';
import {TranslateService} from '@ngx-translate/core';
import {RouterTestingModule} from "@angular/router/testing";

describe('UpdatePasswordComponent', () => {

  let component: UpdatePasswordComponent;
  let fixture: ComponentFixture<UpdatePasswordComponent>;
  let userSettingsService: any = {};
  let updateUserService: any = {};
  let translateServiceSpy: any;
  let languagesService: any = {};
  let translateService: any = { get: function (key: string) {return EMPTY} };

  beforeEach(async(() => {
    updateUserService.update = sinon.stub().returns(Promise.resolve());
    userSettingsService.get = sinon.stub().returns(Promise.resolve(
      {
        _id: 'user123',
        name: 'admin',
        fullname: 'Admin',
        email: 'admin@demo.medic.com',
        phone: '+99 999 9999',
        language: 'es'
      }
    ));
    languagesService.get = sinon.stub().returns(Promise.resolve(
      [{code: 'en', name: 'English'}]
    ));
    translateServiceSpy = sinon.spy(translateService, 'get');
    //translateService.get = sinon.stub().returns(EMPTY);
    TestBed.configureTestingModule({
      declarations: [ UpdatePasswordComponent ],
      providers: [
        {provide: UpdateUserService, useValue: updateUserService},
        {provide: UserSettingsService, useValue: userSettingsService},
        {provide: LanguagesService, useValue: languagesService},
        {provide: BsModalRef, useValue: new BsModalRef()},
        {provide: TranslateService, useValue: translateService}
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

  it('password must be long enough', () => {
    component.editUserModel.password = '2sml4me';
    component.editUserModel.passwordConfirm = '2sml4me';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateServiceSpy.called).to.equal(true);
    expect(translateServiceSpy.getCall(0).args[0]).to.equal('password.length.minimum');
  });

  it('password must be hard to brute force', () => {
    component.editUserModel.password = 'password';
    component.editUserModel.passwordConfirm = 'password';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateServiceSpy.called).to.equal(true);
    expect(translateServiceSpy.getCall(0).args[0]).to.equal('password.weak');
  });

  it('error if password and confirm do not match', () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password + 'a';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateServiceSpy.called).to.equal(true);
    expect(translateServiceSpy.getCall(0).args[0]).to.equal('Passwords must match');
  });

  it('errors if current password is not provided', () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;

    component.updatePassword();
    expect(translateServiceSpy.called).to.equal(true);
    expect(translateServiceSpy.getCall(0).args[0]).to.equal('field is required');
    expect(translateServiceSpy.getCall(0).args[1]).to.deep.equal({ field: 'currentPassword' });
  });

  it('no errors if current password is provided and the new one is strong', () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateServiceSpy.called).to.equal(false);
    expect(component.errors).to.deep.equal({});
  });
});
