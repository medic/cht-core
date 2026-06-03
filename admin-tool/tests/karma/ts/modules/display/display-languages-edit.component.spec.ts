import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  DisplayLanguagesEditComponent 
} from '@admin-tool-modules/display/display-languages/display-languages-edit/display-languages-edit.component';
import { LanguagesService } from '@admin-tool-services/languages.service';

describe('DisplayLanguagesEditComponent', () => {
  let component: DisplayLanguagesEditComponent;
  let fixture: ComponentFixture<DisplayLanguagesEditComponent>;
  let languagesService;

  const mockDoc = {
    _id: 'messages-en',
    _rev: '1-abc',
    code: 'en',
    name: 'English',
    type: 'translations',
    generic: { Submit: 'Submit' },
    custom: { Clinic: 'Household' },
  };

  beforeEach(waitForAsync(() => {
    languagesService = {
      saveLanguage: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayLanguagesEditComponent, TranslateModule.forRoot()],
      providers: [{ provide: LanguagesService, useValue: languagesService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayLanguagesEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
  });
  describe('initial state', () => {
    it('should start with visible false', () => {
      expect(component.visible).to.be.false;
    });

    it('should start with empty model', () => {
      expect(component.model).to.deep.equal({ code: '', name: '', rtl: false });
    });

    it('should start with empty languageErrors', () => {
      expect(component.languageErrors).to.deep.equal({});
    });

    it('should start with loadingModalState false', () => {
      expect(component.loadingModalState).to.be.false;
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });
  });
  describe('ngOnChanges', () => {
    it('should preload model when visible changes to true with doc', () => {
      component.doc = mockDoc as any;
      component.ngOnChanges({
        visible: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      });
      expect(component.model).to.deep.equal({ code: 'en', name: 'English', rtl: false });
    });

    it('should reset model when visible changes to true without doc', () => {
      component.doc = null;
      component.ngOnChanges({
        visible: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      });
      expect(component.model).to.deep.equal({ code: '', name: '', rtl: false });
    });

    it('should clear languageErrors when visible changes to true', () => {
      component.languageErrors = { code: 'error' };
      component.ngOnChanges({
        visible: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      });
      expect(component.languageErrors).to.deep.equal({});
    });

    it('should clear loadingModalState when visible changes to true', () => {
      component.loadingModalState = true;
      component.ngOnChanges({
        visible: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      });
      expect(component.loadingModalState).to.be.false;
    });

    it('should not reset model when visible changes to false', () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      component.ngOnChanges({
        visible: {
          currentValue: false,
          previousValue: true,
          firstChange: false,
          isFirstChange: () => false
        }
      });
      expect(component.model).to.deep.equal({ code: 'en', name: 'English', rtl: false });
    });
  });
  describe('validate', () => {
    it('should return false and set code error when code is empty', () => {
      component.model = { code: '', name: 'English', rtl: false };
      expect(component['validate']()).to.be.false;
      expect(component.languageErrors.code).to.exist;
    });

    it('should return false and set name error when name is empty', () => {
      component.model = { code: 'en', name: '', rtl: false };
      expect(component['validate']()).to.be.false;
      expect(component.languageErrors.name).to.exist;
    });

    it('should return false and set both errors when both fields are empty', () => {
      component.model = { code: '', name: '', rtl: false };
      expect(component['validate']()).to.be.false;
      expect(component.languageErrors.code).to.exist;
      expect(component.languageErrors.name).to.exist;
    });

    it('should return true when both fields are filled', () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      expect(component['validate']()).to.be.true;
    });

    it('should clear previous errors before validating', () => {
      component.languageErrors = { code: 'error', name: 'error' };
      component.model = { code: 'en', name: 'English', rtl: false };
      expect(component['validate']()).to.be.true;
      expect(component.languageErrors.code).to.be.undefined;
      expect(component.languageErrors.name).to.be.undefined;
    });
  });
  describe('submit', () => {
    it('should not call saveLanguage if validation fails', async () => {
      component.model = { code: '', name: '', rtl: false };
      await component.submit();
      expect(languagesService.saveLanguage.called).to.be.false;
    });

    it('should set loadingModalState to true while saving', async () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      languagesService.saveLanguage.callsFake(() => {
        expect(component.loadingModalState).to.be.true;
        return Promise.resolve();
      });
      await component.submit();
    });

    it('should call saveLanguage with correct doc for add', async () => {
      component.doc = null;
      component.model = { code: 'fr', name: 'Français', rtl: false };
      await component.submit();
      const doc = languagesService.saveLanguage.args[0][0];
      expect(doc.code).to.equal('fr');
      expect(doc.name).to.equal('Français');
      expect(doc.type).to.equal('translations');
      expect(doc._rev).to.be.undefined;
    });

    it('should call saveLanguage with correct doc for edit', async () => {
      component.doc = mockDoc as any;
      component.model = { code: 'en', name: 'English updated', rtl: false };
      await component.submit();
      const doc = languagesService.saveLanguage.args[0][0];
      expect(doc._id).to.equal('messages-en');
      expect(doc._rev).to.equal('1-abc');
      expect(doc.name).to.equal('English updated');
    });

    it('should emit saved on success', async () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      let savedEmitted = false;
      component.saved.subscribe(() => savedEmitted = true);
      await component.submit();
      expect(savedEmitted).to.be.true;
    });

    it('should emit closed on success', async () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      let closedEmitted = false;
      component.closed.subscribe(() => closedEmitted = true);
      await component.submit();
      expect(closedEmitted).to.be.true;
    });

    it('should set responseStatus error if saveLanguage fails', async () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      languagesService.saveLanguage.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submit();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error saving settings');
    });

    it('should set loadingModalState to false after success', async () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      await component.submit();
      expect(component.loadingModalState).to.be.false;
    });

    it('should set loadingModalState to false after error', async () => {
      component.model = { code: 'en', name: 'English', rtl: false };
      languagesService.saveLanguage.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submit();
      expect(component.loadingModalState).to.be.false;
    });
  });
  describe('cancel', () => {
    it('should emit closed', () => {
      let closedEmitted = false;
      component.closed.subscribe(() => closedEmitted = true);
      component.cancel();
      expect(closedEmitted).to.be.true;
    });
  });
  describe('DOM', () => {
    it('should show modal when visible is true', () => {
      component.visible = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal.in')).to.exist;
    });

    it('should not show modal when visible is false', () => {
      component.visible = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal.in')).to.not.exist;
    });

    it('should disable code input in edit mode', () => {
      component.visible = true;
      component.doc = mockDoc as any;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('#code') as HTMLInputElement;
      expect(input.disabled).to.be.true;
    });

    it('should enable code input in add mode', () => {
      component.visible = true;
      component.doc = null;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('#code') as HTMLInputElement;
      expect(input.disabled).to.be.false;
    });

    it('should show code error when languageErrors.code is set', () => {
      component.visible = true;
      component.languageErrors = { code: 'field is required' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.help-block.error')).to.exist;
    });

    it('should show name error when languageErrors.name is set', () => {
      component.visible = true;
      component.languageErrors = { name: 'field is required' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.help-block.error')).to.exist;
    });

    it('should disable buttons when loadingModalState is true', () => {
      component.visible = true;
      component.loadingModalState = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll<HTMLButtonElement>('button:not(.close)');
      buttons.forEach(button => expect(button.disabled).to.be.true);
    });

    it('should show error alert when responseStatus is error', () => {
      component.visible = true;
      component.responseStatus = { state: 'error', msg: 'Error saving settings' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-danger')).to.exist;
    });
  });
});
