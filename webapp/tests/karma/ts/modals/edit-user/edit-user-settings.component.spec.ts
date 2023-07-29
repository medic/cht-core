import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentFixture, fakeAsync, TestBed, flush, waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { Subject } from 'rxjs';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { EditUserSettingsComponent } from '@mm-modals/edit-user/edit-user-settings.component';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguagesService } from '@mm-services/languages.service';
import { MmModal } from '@mm-modals/mm-modal/mm-modal';
import { SetLanguageService, LanguageService } from '@mm-services/language.service';

describe('EditUserSettingsComponent', () => {

  let component: EditUserSettingsComponent;
  let fixture: ComponentFixture<EditUserSettingsComponent>;
  let userSettingsService;
  let languageService;
  let languagesService;
  let setLanguageService;
  let bdModalRef;

  beforeEach(waitForAsync(() => {
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
    bdModalRef = { hide: sinon.stub(), onHide: new Subject() };

    return TestBed
      .configureTestingModule({
        declarations: [
          EditUserSettingsComponent,
          MmModal,
        ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FormsModule,
        ],
        providers: [
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: LanguageService, useValue: languageService },
          { provide: LanguagesService, useValue: languagesService },
          { provide: SetLanguageService, useValue: setLanguageService },
          { provide: BsModalRef, useValue: bdModalRef },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(EditUserSettingsComponent);
        component = fixture.componentInstance;

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
    expect(component.enabledLocales).to.deep.equal([
      {code: 'en', name: 'English'},
      {code: 'es', name: 'Español (Spanish)'},
      {code: 'fr', name: 'Français (French)'},
    ]);
    expect(component.errors).to.deep.equal({});
  });

  it('editUserSettings() should not trigger any error', fakeAsync(async () => {
    component.editUserModel.language!!.code = 'en';
    component.editUserModel.fullname = 'Sir Admin';
    component.editUserModel.phone = '11 123 4567';

    component.status = {
      processing: false,
      error: true,    // There was an error before
      severity: true,
    };

    component.editUserSettings();

    expect(component.status).to.deep.equal({
      processing: true,   // Processing ...
      error: false,       // The error was cleared
      severity: false,
    });
    flush();
    expect(component.status).to.deep.equal({
      processing: false,    // Processing finished
      error: false,         // No more errors
      severity: false,
    });
  }));
});
