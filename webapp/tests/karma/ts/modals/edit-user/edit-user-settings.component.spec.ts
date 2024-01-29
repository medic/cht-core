import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentFixture, fakeAsync, TestBed, flush } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { EditUserSettingsComponent } from '@mm-modals/edit-user/edit-user-settings.component';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguagesService } from '@mm-services/languages.service';
import { SetLanguageService, LanguageService } from '@mm-services/language.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

describe('EditUserSettingsComponent', () => {

  let component: EditUserSettingsComponent;
  let fixture: ComponentFixture<EditUserSettingsComponent>;
  let userSettingsService;
  let languageService;
  let languagesService;
  let setLanguageService;
  let matDialogRef;
  let consoleErrorStub;

  beforeEach(() => {
    userSettingsService = {
      get: sinon.stub().resolves(
        {
          _id: 'user123',
          name: 'admin',
          fullname: 'Admin',
          email: 'admin@demo.medic.com',
          phone: '+99 999 9999'
        }
      ),
      put: sinon.stub().resolves()
    };
    languageService = { get: sinon.stub().resolves('es') };
    languagesService = {
      get: sinon.stub().resolves(
        [
          {code: 'en', name: 'English'},
          {code: 'es', name: 'Español (Spanish)'},
          {code: 'fr', name: 'Français (French)'},
        ]
      )
    };
    setLanguageService = { set: sinon.stub().resolves() };
    matDialogRef = { close: sinon.stub() };
    consoleErrorStub = sinon.stub(console, 'error');

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FormsModule,
        ],
        declarations: [
          EditUserSettingsComponent,
          ModalLayoutComponent,
          PanelHeaderComponent,
        ],
        providers: [
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: LanguageService, useValue: languageService },
          { provide: LanguagesService, useValue: languagesService },
          { provide: SetLanguageService, useValue: setLanguageService },
          { provide: MatDialogRef, useValue: matDialogRef },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(EditUserSettingsComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
        return fixture.whenStable();
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should close modal', () => {
    component.close();

    expect(matDialogRef.close.calledOnce).to.be.true;
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
    expect(component.enabledLocales).to.deep.equal([
      {code: 'en', name: 'English'},
      {code: 'es', name: 'Español (Spanish)'},
      {code: 'fr', name: 'Français (French)'},
    ]);
    expect(component.error).to.be.undefined;
  });

  describe('editUserSettings()', () => {
    it('should not trigger any error and process successfully', fakeAsync(async () => {
      sinon.resetHistory();
      component.editUserModel.language.code = 'en';
      component.editUserModel.fullname = 'Sir Admin';
      component.editUserModel.phone = '11 123 4567';

      component.editUserSettings();

      expect(component.processing).to.be.true;

      flush();

      expect(component.processing).to.be.false;
      expect(component.error).to.be.undefined;
      expect(consoleErrorStub.notCalled).to.be.true;
      expect(matDialogRef.close.calledOnce).to.be.true;
    }));

    it('should catch any error and not close the modal', fakeAsync(async () => {
      sinon.resetHistory();
      userSettingsService.put.rejects(new Error('some error'));
      component.editUserModel.language.code = 'en';
      component.editUserModel.fullname = 'Sir Admin';
      component.editUserModel.phone = '11 123 4567';

      component.editUserSettings();

      expect(component.processing).to.be.true;

      flush();

      expect(component.processing).to.be.false;
      expect(component.error).to.equal('Error updating user');
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0]).to.have.deep.members([
        'Error updating user',
        new Error('some error'),
      ]);
      expect(matDialogRef.close.notCalled).to.be.true;
    }));
  });
});
