import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  DisplayLanguagesDeleteComponent 
} from '@admin-tool-modules/display/display-languages/display-languages-delete/display-languages-delete.component';
import { LanguagesService } from '@admin-tool-services/languages.service';

describe('DisplayLanguagesDeleteComponent', () => {
  let component: DisplayLanguagesDeleteComponent;
  let fixture: ComponentFixture<DisplayLanguagesDeleteComponent>;
  let languagesService;

  const mockDoc = {
    _id: 'messages-en',
    _rev: '1-abc',
    code: 'en',
    name: 'English',
    type: 'translations',
    generic: { Submit: 'Submit' },
  };

  beforeEach(waitForAsync(() => {
    languagesService = {
      deleteLanguage: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayLanguagesDeleteComponent, TranslateModule.forRoot()],
      providers: [{ provide: LanguagesService, useValue: languagesService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayLanguagesDeleteComponent);
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

    it('should start with loadingModalState false', () => {
      expect(component.loadingModalState).to.be.false;
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });
  });
  describe('ngOnChanges', () => {
    it('should clear loadingModalState when visible changes to true', () => {
      component.loadingModalState = true;
      component.ngOnChanges({ 
        visible: { 
          currentValue: true, 
          previousValue: false, 
          firstChange: false, 
          isFirstChange: () => false } });
      expect(component.loadingModalState).to.be.false;
    });

    it('should clear responseStatus when visible changes to true', () => {
      component.responseStatus = { state: 'error', msg: 'error' };
      component.ngOnChanges({
        visible: { 
          currentValue: true, 
          previousValue: false, 
          firstChange: false, 
          isFirstChange: () => false } });
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should not clear state when visible changes to false', () => {
      component.loadingModalState = true;
      component.ngOnChanges({ 
        visible: { 
          currentValue: false, 
          previousValue: true, 
          firstChange: false, 
          isFirstChange: () => false } });
      expect(component.loadingModalState).to.be.true;
    });
  });
  describe('confirmDelete', () => {
    it('should call deleteLanguage with the doc', async () => {
      component.doc = mockDoc as any;
      await component.confirmDelete();
      expect(languagesService.deleteLanguage.calledWith(mockDoc)).to.be.true;
    });

    it('should emit confirmed on success', async () => {
      component.doc = mockDoc as any;
      let confirmedEmitted = false;
      component.confirmed.subscribe(() => confirmedEmitted = true);
      await component.confirmDelete();
      expect(confirmedEmitted).to.be.true;
    });

    it('should emit closed on success', async () => {
      component.doc = mockDoc as any;
      let closedEmitted = false;
      component.closed.subscribe(() => closedEmitted = true);
      await component.confirmDelete();
      expect(closedEmitted).to.be.true;
    });

    it('should set responseStatus error if deleteLanguage fails', async () => {
      component.doc = mockDoc as any;
      languagesService.deleteLanguage.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.confirmDelete();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error deleting document');
    });

    it('should set loadingModalState to false after success', async () => {
      component.doc = mockDoc as any;
      await component.confirmDelete();
      expect(component.loadingModalState).to.be.false;
    });

    it('should set loadingModalState to false after error', async () => {
      component.doc = mockDoc as any;
      languagesService.deleteLanguage.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.confirmDelete();
      expect(component.loadingModalState).to.be.false;
    });

    it('should set loadingModalState to true while deleting', async () => {
      component.doc = mockDoc as any;
      languagesService.deleteLanguage.callsFake(() => {
        expect(component.loadingModalState).to.be.true;
        return Promise.resolve();
      });
      await component.confirmDelete();
    });
  });
  describe('confirmDelete - language in use', () => {
    it('should set error if doc code matches localeLanguage', async () => {
      component.doc = mockDoc as any;
      component.localeLanguage = 'en';
      component.localeOutgoingLanguage = 'es';
      await component.confirmDelete();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Language in use as default and/or outgoing locale');
    });

    it('should set error if doc code matches localeOutgoingLanguage', async () => {
      component.doc = mockDoc as any;
      component.localeLanguage = 'es';
      component.localeOutgoingLanguage = 'en';
      await component.confirmDelete();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Language in use as default and/or outgoing locale');
    });

    it('should not call deleteLanguage if doc code matches localeLanguage', async () => {
      component.doc = mockDoc as any;
      component.localeLanguage = 'en';
      component.localeOutgoingLanguage = 'es';
      await component.confirmDelete();
      expect(languagesService.deleteLanguage.called).to.be.false;
    });

    it('should not call deleteLanguage if doc code matches localeOutgoingLanguage', async () => {
      component.doc = mockDoc as any;
      component.localeLanguage = 'es';
      component.localeOutgoingLanguage = 'en';
      await component.confirmDelete();
      expect(languagesService.deleteLanguage.called).to.be.false;
    });

    it('should proceed with delete if doc code does not match either locale', async () => {
      component.doc = mockDoc as any;
      component.localeLanguage = 'es';
      component.localeOutgoingLanguage = 'fr';
      await component.confirmDelete();
      expect(languagesService.deleteLanguage.calledWith(mockDoc)).to.be.true;
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
      component.responseStatus = { state: 'error', msg: 'Error deleting document' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-danger')).to.exist;
    });
  });
});
