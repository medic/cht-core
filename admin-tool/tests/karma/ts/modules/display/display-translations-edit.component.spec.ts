import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  DisplayTranslationsEditComponent
} from '@admin-tool-modules/display/display-translations/display-translations-edit/display-translations-edit.component';
import { LanguagesService } from '@admin-tool-services/languages.service';

describe('DisplayTranslationsEditComponent', () => {
  let component: DisplayTranslationsEditComponent;
  let fixture: ComponentFixture<DisplayTranslationsEditComponent>;
  let languagesService;

  const mockDocs = [
    {
      _id: 'messages-en',
      _rev: '1-abc',
      code: 'en',
      name: 'English',
      type: 'translations',
      generic: { Submit: 'Submit', Cancel: 'Cancel' },
      custom: { Clinic: 'Household' },
    },
    {
      _id: 'messages-es',
      _rev: '1-def',
      code: 'es',
      name: 'Spanish',
      type: 'translations',
      generic: { Submit: 'Enviar' },
      custom: {},
    },
  ];

  beforeEach(waitForAsync(() => {
    languagesService = {
      saveTranslation: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayTranslationsEditComponent, TranslateModule.forRoot()],
      providers: [{ provide: LanguagesService, useValue: languagesService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayTranslationsEditComponent);
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

    it('should start with key null', () => {
      expect(component.key).to.be.null;
    });

    it('should start with empty docs', () => {
      expect(component.docs).to.deep.equal([]);
    });

    it('should start with empty translationValues', () => {
      expect(component.translationValues).to.deep.equal({});
    });

    it('should start with loadingModalState false', () => {
      expect(component.loadingModalState).to.be.false;
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should start with keyError null', () => {
      expect(component.keyError).to.be.null;
    });

    it('should start with isCustom false', () => {
      expect(component.isCustom).to.be.false;
    });

    it('should start with empty newKey', () => {
      expect(component.newKey).to.equal('');
    });
  });

  describe('ngOnChanges', () => {
    it('should clear loadingModalState when visible changes to true', () => {
      component.loadingModalState = true;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.loadingModalState).to.be.false;
    });

    it('should clear responseStatus when visible changes to true', () => {
      component.responseStatus = { state: 'error', msg: 'error' };
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should clear keyError when visible changes to true', () => {
      component.keyError = 'error';
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.keyError).to.be.null;
    });

    it('should clear newKey when visible changes to true in add mode', () => {
      component.key = null;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.newKey).to.equal('');
    });

    it('should set newKey to key when visible changes to true in edit mode', () => {
      component.key = 'Submit';
      component.docs = mockDocs as any;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.newKey).to.equal('Submit');
    });

    it('should preload translationValues in edit mode', () => {
      component.key = 'Submit';
      component.docs = mockDocs as any;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.translationValues['en']).to.equal('Submit');
      expect(component.translationValues['es']).to.equal('Enviar');
    });

    it('should set translationValues to empty string for missing keys in edit mode', () => {
      component.key = 'Cancel';
      component.docs = mockDocs as any;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.translationValues['es']).to.equal('');
    });

    it('should set isCustom to true when key exists in custom of any doc', () => {
      component.key = 'Clinic';
      component.docs = mockDocs as any;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.isCustom).to.be.true;
    });

    it('should set isCustom to false when key does not exist in any custom', () => {
      component.key = 'Submit';
      component.docs = mockDocs as any;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.isCustom).to.be.false;
    });

    it('should not change state when visible changes to false', () => {
      component.loadingModalState = true;
      component.ngOnChanges({
        visible: { currentValue: false, previousValue: true, firstChange: false, isFirstChange: () => false }
      });
      expect(component.loadingModalState).to.be.true;
    });

    it('should clear translationValues when visible changes to true in add mode', () => {
      component.translationValues = { en: 'Submit' };
      component.key = null;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.translationValues).to.deep.equal({});
    });
  });
  describe('validate', () => {
    it('should return false and set keyError when newKey is empty in add mode', () => {
      component.key = null;
      component.newKey = '';
      expect(component['validate']()).to.be.false;
      expect(component.keyError).to.exist;
    });

    it('should return true when newKey is filled in add mode', () => {
      component.key = null;
      component.newKey = 'NewKey';
      expect(component['validate']()).to.be.true;
    });

    it('should return true in edit mode regardless of newKey', () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      expect(component['validate']()).to.be.true;
    });

    it('should clear keyError before validating', () => {
      component.keyError = 'error';
      component.key = null;
      component.newKey = 'NewKey';
      expect(component['validate']()).to.be.true;
      expect(component.keyError).to.be.null;
    });
  });
  describe('submit', () => {
    it('should not call saveTranslation if validation fails', async () => {
      component.key = null;
      component.newKey = '';
      await component.submit();
      expect(languagesService.saveTranslation.called).to.be.false;
    });

    it('should set loadingModalState to true while saving', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      languagesService.saveTranslation.callsFake(() => {
        expect(component.loadingModalState).to.be.true;
        return Promise.resolve();
      });
      await component.submit();
    });

    it('should call saveTranslation with correct args', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      component.translationValues = { en: 'Submit', es: 'Enviar' };
      await component.submit();
      const [key, values, docs] = languagesService.saveTranslation.args[0];
      expect(key).to.equal('Submit');
      expect(values).to.deep.equal({ en: 'Submit', es: 'Enviar' });
      expect(docs).to.deep.equal(mockDocs);
    });

    it('should call saveTranslation with newKey in add mode', async () => {
      component.key = null;
      component.newKey = 'NewKey';
      component.docs = mockDocs as any;
      component.translationValues = { en: 'New value' };
      await component.submit();
      expect(languagesService.saveTranslation.args[0][0]).to.equal('NewKey');
    });

    it('should emit saved on success', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      let savedEmitted = false;
      component.saved.subscribe(() => savedEmitted = true);
      await component.submit();
      expect(savedEmitted).to.be.true;
    });

    it('should emit closed on success', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      let closedEmitted = false;
      component.closed.subscribe(() => closedEmitted = true);
      await component.submit();
      expect(closedEmitted).to.be.true;
    });

    it('should set responseStatus error if saveTranslation fails', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      languagesService.saveTranslation.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submit();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error updating settings');
    });

    it('should set loadingModalState to false after success', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      await component.submit();
      expect(component.loadingModalState).to.be.false;
    });

    it('should set loadingModalState to false after error', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      languagesService.saveTranslation.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submit();
      expect(component.loadingModalState).to.be.false;
    });

    it('should call console.error if saveTranslation fails', async () => {
      component.key = 'Submit';
      component.newKey = 'Submit';
      component.docs = mockDocs as any;
      languagesService.saveTranslation.rejects(new Error('error'));
      const consoleStub = sinon.stub(console, 'error');
      await component.submit();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('deleteTranslation', () => {
    it('should call saveTranslation with empty values for all docs', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      await component.deleteTranslation();
      const values = languagesService.saveTranslation.args[0][1];
      expect(values['en']).to.equal('');
      expect(values['es']).to.equal('');
    });

    it('should call saveTranslation with correct key', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      await component.deleteTranslation();
      expect(languagesService.saveTranslation.args[0][0]).to.equal('Clinic');
    });

    it('should emit saved on success', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      let savedEmitted = false;
      component.saved.subscribe(() => savedEmitted = true);
      await component.deleteTranslation();
      expect(savedEmitted).to.be.true;
    });

    it('should emit closed on success', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      let closedEmitted = false;
      component.closed.subscribe(() => closedEmitted = true);
      await component.deleteTranslation();
      expect(closedEmitted).to.be.true;
    });

    it('should set loadingModalState to true while deleting', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      languagesService.saveTranslation.callsFake(() => {
        expect(component.loadingModalState).to.be.true;
        return Promise.resolve();
      });
      await component.deleteTranslation();
    });

    it('should set loadingModalState to false after success', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      await component.deleteTranslation();
      expect(component.loadingModalState).to.be.false;
    });

    it('should set responseStatus error if saveTranslation fails', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      languagesService.saveTranslation.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.deleteTranslation();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error updating settings');
    });

    it('should set loadingModalState to false after error', async () => {
      component.newKey = 'Clinic';
      component.docs = mockDocs as any;
      languagesService.saveTranslation.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.deleteTranslation();
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
    beforeEach(async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    });

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

    it('should show modal title as Add new translation key in add mode', () => {
      component.visible = true;
      component.key = null;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal-title')!.textContent).to.include('translation.add');
    });

    it('should show modal title as Edit translation in edit mode', () => {
      component.visible = true;
      component.key = 'Submit';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal-title')!.textContent).to.include('Edit translation');
    });

    it('should disable key input in edit mode', () => {
      component.visible = true;
      component.key = 'Submit';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('#translation-key') as HTMLInputElement;
      expect(input.disabled).to.be.true;
    });

    it('should enable key input in add mode', () => {
      component.visible = true;
      component.key = null;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('#translation-key') as HTMLInputElement;
      expect(input.disabled).to.be.false;
    });

    it('should render a textarea for each doc', () => {
      component.visible = true;
      component.docs = mockDocs as any;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const textareas = compiled.querySelectorAll('textarea');
      expect(textareas.length).to.equal(mockDocs.length);
    });

    it('should show delete button when isCustom is true', () => {
      component.visible = true;
      component.isCustom = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.btn-danger')).to.exist;
    });

    it('should not show delete button when isCustom is false', () => {
      component.visible = true;
      component.isCustom = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.btn-danger')).to.not.exist;
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
      component.responseStatus = { state: 'error', msg: 'Error updating settings' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-danger')).to.exist;
    });

    it('should show keyError when set', () => {
      component.visible = true;
      component.keyError = 'field is required';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.help-block.error')).to.exist;
    });

    it('should not show keyError when null', () => {
      component.visible = true;
      component.keyError = null;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.help-block.error')).to.not.exist;
    });
  });
});
