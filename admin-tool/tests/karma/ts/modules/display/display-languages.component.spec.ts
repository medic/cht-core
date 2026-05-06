import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { DisplayLanguagesComponent } from '@admin-tool-modules/display/display-languages/display-languages.component';
import { LanguagesService } from '@admin-tool-services/languages.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { ChangesService } from '@admin-tool-services/changes.service';

describe('DisplayLanguagesComponent', () => {
  let component: DisplayLanguagesComponent;
  let fixture: ComponentFixture<DisplayLanguagesComponent>;
  let languagesService;
  let settingsService;
  let changesService;

  const mockLanguages = [
    {
      doc: { _id: 'messages-en', code: 'en', name: 'English', type: 'translations', generic: {}, custom: {} },
      enabled: true,
      missing: 0,
    },
    {
      doc: { _id: 'messages-es', code: 'es', name: 'Español (Spanish)', type: 'translations', generic: {}, custom: {} },
      enabled: false,
      missing: 5,
    },
  ];

  beforeEach(waitForAsync(() => {
    languagesService = {
      getLanguages: sinon.stub().resolves(mockLanguages),
      enableLanguage: sinon.stub().resolves(),
      disableLanguage: sinon.stub().resolves(),
      importLanguage: sinon.stub().resolves(),
    };
    settingsService = {
      getLanguageSettings: sinon.stub().resolves({ locale: 'en', localeOutgoing: 'en'}),
      updateLanguageSettings: sinon.stub().resolves(),
    };
    changesService = {
      subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayLanguagesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: LanguagesService, useValue: languagesService },
        { provide: SettingsService, useValue: settingsService },
        { provide: ChangesService, useValue: changesService }
      ],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayLanguagesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
  });
  describe('initial state', () => {
    it('should start with empty languages array', () => {
      expect(component.languages).to.be.an('array');
    });

    it('should start with loadingPageStatus false', () => {
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });
  });
  describe('ngOnInit', () => {
    it('should call getLanguages on init', () => {
      expect(languagesService.getLanguages.calledOnce).to.be.true;
    });

    it('should fill languages array after init', async () => {
      await fixture.whenStable();
      expect(component.languages).to.have.length(2);
    });

    it('should set loadingPageStatus to false after init', async () => {
      await fixture.whenStable();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should set loadingPageStatus to false even if getLanguages fails', async () => {
      sinon.stub(console, 'error');
      languagesService.getLanguages.rejects(new Error('error'));
      await component.ngOnInit();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should handle error if getLanguages fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      languagesService.getLanguages.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });

    it('should call getLanguageSettings on init', () => {
      expect(settingsService.getLanguageSettings.calledOnce).to.be.true;
    });

    it('should set localeLanguage from settings', async () => {
      await fixture.whenStable();
      expect(component.localeLanguage).to.equal('en');
    });

    it('should set localeOutgoingLanguage from settings', async () => {
      await fixture.whenStable();
      expect(component.localeOutgoingLanguage).to.equal('en');
    });

    it('should handle error if getLanguageSettings fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      settingsService.getLanguageSettings.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });
    it('should call changesService.subscribe on init', async () => {
      await fixture.whenStable();
      expect(changesService.subscribe.calledOnce).to.be.true;
    });

    it('should subscribe with key display-languages', async () => {
      await fixture.whenStable();
      const options = changesService.subscribe.args[0][0];
      expect(options.key).to.equal('display-languages');
    });

    it('should pass filter that returns true for messages- documents', async () => {
      await fixture.whenStable();
      const options = changesService.subscribe.args[0][0];
      expect(options.filter({ id: 'messages-en' })).to.be.true;
    });

    it('should pass filter that returns true for settings document', async () => {
      await fixture.whenStable();
      const options = changesService.subscribe.args[0][0];
      expect(options.filter({ id: 'settings' })).to.be.true;
    });

    it('should pass filter that returns false for unrelated documents', async () => {
      await fixture.whenStable();
      const options = changesService.subscribe.args[0][0];
      expect(options.filter({ id: 'medic-client' })).to.be.false;
    });

    it('should call ngOnInit when changes callback fires', async () => {
      await fixture.whenStable();
      const initialCallCount = languagesService.getLanguages.callCount;
      const options = changesService.subscribe.args[0][0];
      await options.callback();
      expect(languagesService.getLanguages.callCount).to.be.greaterThan(initialCallCount);
    });
  });
  describe('ngOnDestroy', () => {
    it('should call unsubscribe on destroy', async () => {
      await fixture.whenStable();
      component.ngOnDestroy();
      const unsubscribe = changesService.subscribe.returnValues[0].unsubscribe;
      expect(unsubscribe.calledOnce).to.be.true;
    });

    it('should not throw if changesSubscription is null', () => {
      component['changesSubscription'] = null;
      expect(() => component.ngOnDestroy()).to.not.throw();
    });
  });
  describe('submitLanguageSettings', () => {
    it('should set responseStatus to loading at start', () => {
      component.submitLanguageSettings();
      expect(component.responseStatus.state).to.equal('loading');
    });

    it('should call updateLanguageSettings with correct values', async () => {
      component.localeLanguage = 'en';
      component.localeOutgoingLanguage = 'en';
      await component.submitLanguageSettings();
      expect(settingsService.updateLanguageSettings.calledWith({
        locale: 'en',
        localeOutgoing: 'en',
      })).to.be.true;
    });

    it('should set responseStatus to success on success', async () => {
      await component.submitLanguageSettings();
      expect(component.responseStatus.state).to.equal('success');
      expect(component.responseStatus.msg).to.equal('Saved');
    });

    it('should set responseStatus to error on failure', async () => {
      settingsService.updateLanguageSettings.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submitLanguageSettings();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error saving language settings');
    });

    it('should call console.error on failure', async () => {
      settingsService.updateLanguageSettings.rejects(new Error('error'));
      const consoleStub = sinon.stub(console, 'error');
      await component.submitLanguageSettings();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('editLanguage', () => {
    it('should set selectedDoc with the doc', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.editLanguage(doc);
      expect(component.selectedDoc).to.equal(doc);
    });

    it('should set showEditModal to true', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.editLanguage(doc);
      expect(component.showEditModal).to.be.true;
    });
  });
  describe('addLanguage', () => {
    it('should set selectedDoc to null', async () => {
      await component.addLanguage();
      expect(component.selectedDoc).to.be.null;
    });

    it('should set showEditModal to true', async () => {
      await component.addLanguage();
      expect(component.showEditModal).to.be.true;
    });
  });
  describe('enableLanguage', () => {
    it('should call languagesService.enableLanguage with the doc', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.enableLanguage(doc);
      expect(languagesService.enableLanguage.calledWith(doc)).to.be.true;
    });

    it('should reload languages after success', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.enableLanguage(doc);
      expect(languagesService.getLanguages.callCount).to.be.greaterThan(1);
    });

    it('should handle error if enableLanguage fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      languagesService.enableLanguage.rejects(new Error('error'));
      const doc = mockLanguages[0].doc as any;
      await component.enableLanguage(doc);
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('disableLanguage', () => {
    it('should call languagesService.disableLanguage with the doc', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.disableLanguage(doc);
      expect(languagesService.disableLanguage.calledWith(doc)).to.be.true;
    });

    it('should reload languages after success', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.disableLanguage(doc);
      expect(languagesService.getLanguages.callCount).to.be.greaterThan(1);
    });

    it('should handle error if disableLanguage fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      languagesService.disableLanguage.rejects(new Error('error'));
      const doc = mockLanguages[0].doc as any;
      await component.disableLanguage(doc);
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('deleteLanguage', () => {
    it('should set selectedDoc with the doc', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.deleteLanguage(doc);
      expect(component.selectedDoc).to.equal(doc);
    });

    it('should set showDeleteModal to true', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.deleteLanguage(doc);
      expect(component.showDeleteModal).to.be.true;
    });
  });
  describe('uploadLanguage', () => {
    it('should set selectedDoc with the doc', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.uploadLanguage(doc);
      expect(component.selectedDoc).to.equal(doc);
    });

    it('should set showUploadModal to true', async () => {
      const doc = mockLanguages[0].doc as any;
      await component.uploadLanguage(doc);
      expect(component.showUploadModal).to.be.true;
    });
  });
  describe('downloadLanguage', () => {
    let createObjectURLStub;
    let revokeObjectURLStub;
    let createElementStub;
    let mockAnchor;

    beforeEach(() => {
      createObjectURLStub = sinon.stub(window.URL, 'createObjectURL').returns('blob:fake-url');
      revokeObjectURLStub = sinon.stub(window.URL, 'revokeObjectURL');
      mockAnchor = { href: '', download: '', click: sinon.stub() };
      createElementStub = sinon.stub(document, 'createElement').returns(mockAnchor as any);
    });

    it('should not create blob when doc has no translations', () => {
      const doc = {
        _id: 'messages-fr', code: 'fr', name: 'Français',
        type: 'translations', generic: {}, custom: {}
      } as any;
      component.downloadLanguage(doc);
      expect(createObjectURLStub.called).to.be.false;
    });

    it('should create blob with generic translations', () => {
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations', generic: { Submit: 'Submit' }, custom: {}
      } as any;
      component.downloadLanguage(doc);
      expect(createObjectURLStub.calledOnce).to.be.true;
    });

    it('should create blob with custom translations', () => {
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations', generic: {}, custom: { Clinic: 'Household' }
      } as any;
      component.downloadLanguage(doc);
      expect(createObjectURLStub.calledOnce).to.be.true;
    });

    it('should set download filename as doc._id.properties', () => {
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations', generic: { Submit: 'Submit' }
      } as any;
      component.downloadLanguage(doc);
      expect(mockAnchor.download).to.equal('messages-en.properties');
    });

    it('should set anchor href to blob url', () => {
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations', generic: { Submit: 'Submit' }
      } as any;
      component.downloadLanguage(doc);
      expect(mockAnchor.href).to.equal('blob:fake-url');
    });
    
    it('should create an anchor element', () => {
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations', generic: { Submit: 'Submit' }
      } as any;
      component.downloadLanguage(doc);
      expect(createElementStub.calledWith('a')).to.be.true;
    });

    it('should click the anchor to trigger download', () => {
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations', generic: { Submit: 'Submit' }
      } as any;
      component.downloadLanguage(doc);
      expect(mockAnchor.click.calledOnce).to.be.true;
    });

    it('should revoke object url after click', () => {
      const clock = sinon.useFakeTimers();
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations', generic: { Submit: 'Submit' }
      } as any;
      component.downloadLanguage(doc);
      expect(revokeObjectURLStub.called).to.be.false;
      clock.tick(101);
      expect(revokeObjectURLStub.calledWith('blob:fake-url')).to.be.true;
      clock.restore();
    });

    it('should merge generic and custom translations', () => {
      const doc = {
        _id: 'messages-en', code: 'en', name: 'English',
        type: 'translations',
        generic: { Submit: 'Submit' },
        custom: { Clinic: 'Household' }
      } as any;
      component.downloadLanguage(doc);
      expect(createObjectURLStub.calledOnce).to.be.true;
      expect(mockAnchor.click.calledOnce).to.be.true;
    });
  });
  describe('DOM', () => {
    it('should show loader when loadingPageStatus is true', () => {
      component.loadingPageStatus = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.exist;
    });

    it('should not show loader when loadingPageStatus is false', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.not.exist;
    });

    it('should render locale select', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#locale')).to.exist;
    });

    it('should render locale-outgoing select', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#locale-outgoing')).to.exist;
    });

    it('should show default language star icon when locale matches', async () => {
      await fixture.whenStable();
      component.localeLanguage = 'en';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.fa-file-o')).to.exist;
    });

    it('should show outgoing language star icon when locale_outgoing matches', async () => {
      await fixture.whenStable();
      component.localeOutgoingLanguage = 'en';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.fa-envelope-o')).to.exist;
    });

    it('should show submit button', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('button[type="submit"]')).to.exist;
    });
    
    it('should disable submit button when loading', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).to.be.true;
    });

    it('should show error message when responseStatus is error', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'error', msg: 'Error saving language settings' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')).to.exist;
    });

    it('should show success message when responseStatus is success', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'success', msg: 'Saved' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.success')).to.exist;
    });

    it('should render a panel for each language', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const panels = compiled.querySelectorAll('.panel');
      expect(panels.length).to.equal(2);
    });

    it('should show missing translations warning when missing > 0', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-warning')).to.exist;
    });

    it('should not show missing translations warning when missing is 0', async () => {
      await fixture.whenStable();
      languagesService.getLanguages.resolves([{ ...mockLanguages[0], missing: 0 }]);
      await component.ngOnInit();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-warning')).to.not.exist;
    });

    it('should render Add new language button', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.btn-primary')).to.exist;
    });
    
    it('should show disable button when language is enabled', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const panels = compiled.querySelectorAll('.panel-collapse');
      expect(panels[0].querySelector('.fa-ban')).to.exist;
    });

    it('should show enable button when language is disabled', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const panels = compiled.querySelectorAll('.panel-collapse');
      expect(panels[1].querySelector('.fa-circle-o')).to.exist;
    });
  });
});
