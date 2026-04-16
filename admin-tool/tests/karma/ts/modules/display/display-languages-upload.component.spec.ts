import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  DisplayLanguagesUploadComponent 
} from '@admin-tool-modules/display/display-languages/display-languages-upload/display-languages-upload.component';
import { LanguagesService } from '@admin-tool-services/languages.service';

describe('DisplayLanguagesUploadComponent', () => {
  let component: DisplayLanguagesUploadComponent;
  let fixture: ComponentFixture<DisplayLanguagesUploadComponent>;
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
      importLanguage: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayLanguagesUploadComponent, TranslateModule.forRoot()],
      providers: [{ provide: LanguagesService, useValue: languagesService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayLanguagesUploadComponent);
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

    it('should start with doc null', () => {
      expect(component.doc).to.be.null;
    });

    it('should start with selectedFile null', () => {
      expect(component.selectedFile).to.be.null;
    });

    it('should start with loadingModalState false', () => {
      expect(component.loadingModalState).to.be.false;
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should start with fileError null', () => {
      expect(component.fileError).to.be.null;
    });
  });
  describe('ngOnChanges', () => {
    it('should clear selectedFile when visible changes to true', () => {
      component.selectedFile = new File([''], 'test.properties');
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.selectedFile).to.be.null;
    });

    it('should clear responseStatus when visible changes to true', () => {
      component.responseStatus = { state: 'error', msg: 'error' };
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should clear loadingModalState when visible changes to true', () => {
      component.loadingModalState = true;
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.loadingModalState).to.be.false;
    });

    it('should clear fileError when visible changes to true', () => {
      component.fileError = 'error';
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.fileError).to.be.null;
    });

    it('should not clear state when visible changes to false', () => {
      component.loadingModalState = true;
      component.ngOnChanges({
        visible: { currentValue: false, previousValue: true, firstChange: false, isFirstChange: () => false }
      });
      expect(component.loadingModalState).to.be.true;
    });
  });
  describe('onFileChange', () => {
    it('should set selectedFile from event', () => {
      const file = new File([''], 'test.properties');
      const event = { target: { files: [file] } } as any;
      component.onFileChange(event);
      expect(component.selectedFile).to.equal(file);
    });

    it('should set selectedFile to null when no files', () => {
      const event = { target: { files: [] } } as any;
      component.onFileChange(event);
      expect(component.selectedFile).to.be.null;
    });

    it('should clear fileError when file is selected', () => {
      component.fileError = 'error';
      const file = new File([''], 'test.properties');
      const event = { target: { files: [file] } } as any;
      component.onFileChange(event);
      expect(component.fileError).to.be.null;
    });
  });
  describe('parseProperties', () => {
    it('should parse key=value lines', async () => {
      const result = await component['parseProperties']('Submit=Enviar\nCancel=Cancelar');
      expect(result['Submit']).to.equal('Enviar');
      expect(result['Cancel']).to.equal('Cancelar');
    });

    it('should ignore comment lines starting with #', async () => {
      const result = await component['parseProperties']('# comment\nSubmit=Enviar');
      expect(result['# comment']).to.be.undefined;
      expect(result['Submit']).to.equal('Enviar');
    });

    it('should ignore empty lines', async () => {
      const result = await component['parseProperties']('Submit=Enviar\n\nCancel=Cancelar');
      expect(Object.keys(result)).to.have.length(2);
    });

    it('should split only on first equals sign', async () => {
      const result = await component['parseProperties']('key=val=ue');
      expect(result['key']).to.equal('val=ue');
    });
  });
  describe('submit', () => {
    let fileReaderStub;

    beforeEach(() => {
      fileReaderStub = {
        addEventListener: sinon.stub().callsFake((event, cb) => {
          if (event === 'loadend') {
            fileReaderStub._loadendCb = cb;
          }
        }),
        readAsText: sinon.stub().callsFake(() => {
          fileReaderStub.result = 'Submit=Enviar\nCancel=Cancelar';
          fileReaderStub._loadendCb();
        }),
        result: '',
      };
      sinon.stub(window, 'FileReader').returns(fileReaderStub);
    });

    it('should set fileError if no file selected', async () => {
      component.selectedFile = null;
      await component.submit();
      expect(component.fileError).to.exist;
    });

    it('should not call importLanguage if no file selected', async () => {
      component.selectedFile = null;
      await component.submit();
      expect(languagesService.importLanguage.called).to.be.false;
    });

    it('should set loadingModalState to true while submitting', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      languagesService.importLanguage.callsFake(() => {
        expect(component.loadingModalState).to.be.true;
        return Promise.resolve();
      });
      await component.submit();
    });

    it('should call importLanguage with doc and parsed translations', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      await component.submit();
      expect(languagesService.importLanguage.calledOnce).to.be.true;
      const translations = languagesService.importLanguage.args[0][1];
      expect(translations['Submit']).to.equal('Enviar');
      expect(translations['Cancel']).to.equal('Cancelar');
    });

    it('should emit saved on success', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      let savedEmitted = false;
      component.saved.subscribe(() => savedEmitted = true);
      await component.submit();
      expect(savedEmitted).to.be.true;
    });

    it('should emit closed on success', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      let closedEmitted = false;
      component.closed.subscribe(() => closedEmitted = true);
      await component.submit();
      expect(closedEmitted).to.be.true;
    });

    it('should set responseStatus error if importLanguage fails', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      languagesService.importLanguage.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submit();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error parsing file');
    });

    it('should set loadingModalState to false after success', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      await component.submit();
      expect(component.loadingModalState).to.be.false;
    });

    it('should set loadingModalState to false after error', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      languagesService.importLanguage.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submit();
      expect(component.loadingModalState).to.be.false;
    });

    it('should call console.error if importLanguage fails', async () => {
      component.selectedFile = new File([''], 'test.properties');
      component.doc = mockDoc as any;
      languagesService.importLanguage.rejects(new Error('error'));
      const consoleStub = sinon.stub(console, 'error');
      await component.submit();
      expect(consoleStub.calledOnce).to.be.true;
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

    it('should show error alert when responseStatus is error', () => {
      component.visible = true;
      component.responseStatus = { state: 'error', msg: 'Error parsing file' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-danger')).to.exist;
    });

    it('should not show error alert when responseStatus is empty', () => {
      component.visible = true;
      component.responseStatus = {};
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-danger')).to.not.exist;
    });

    it('should disable buttons when loadingModalState is true', () => {
      component.visible = true;
      component.loadingModalState = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll<HTMLButtonElement>('button:not(.close)');
      buttons.forEach(button => expect(button.disabled).to.be.true);
    });

    it('should show file input', () => {
      component.visible = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('input[type="file"]')).to.exist;
    });

    it('should show fileError when set', () => {
      component.visible = true;
      component.fileError = 'field is required';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.help-block.error')).to.exist;
    });

    it('should not show fileError when null', () => {
      component.visible = true;
      component.fileError = null;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.help-block.error')).to.not.exist;
    });
  });
});
