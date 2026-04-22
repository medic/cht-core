import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  DisplayTranslationsComponent
} from '@admin-tool-modules/display/display-translations/display-translations.component';
import { LanguagesService } from '@admin-tool-services/languages.service';

describe('DisplayTranslationsComponent', () => {
  let component: DisplayTranslationsComponent;
  let fixture: ComponentFixture<DisplayTranslationsComponent>;
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
      getLanguageDocs: sinon.stub().resolves(mockDocs),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayTranslationsComponent, TranslateModule.forRoot()],
      providers: [{ provide: LanguagesService, useValue: languagesService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayTranslationsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
  });

  describe('initial state', () => {
    it('should start with loadingPageStatus false', () => {
      expect(component.loadingPageStatus).to.be.false;
    });
  });
  describe('ngOnInit', () => {
    it('should call getLanguageDocs on init', () => {
      expect(languagesService.getLanguageDocs.calledOnce).to.be.true;
    });

    it('should fill docs after init', async () => {
      await fixture.whenStable();
      expect(component.docs).to.deep.equal(mockDocs);
    });

    it('should fill rightTranslationOptions after init', async () => {
      await fixture.whenStable();
      expect(component.rightTranslationOptions).to.have.length(2);
    });

    it('should fill leftTranslationOptions with Translation Keys as first option', async () => {
      await fixture.whenStable();
      expect(component.leftTranslationOptions[0].code).to.equal('keys');
      expect(component.leftTranslationOptions[0].name).to.equal('Translation Keys');
    });

    it('should fill leftTranslationOptions with all languages after Translation Keys', async () => {
      await fixture.whenStable();
      expect(component.leftTranslationOptions).to.have.length(3);
    });

    it('should set leftCode to en after init', async () => {
      await fixture.whenStable();
      expect(component.leftCode).to.equal('en');
    });

    it('should set rightCode to first non-en language after init', async () => {
      await fixture.whenStable();
      expect(component.rightCode).to.equal('es');
    });

    it('should fill translationRows after init', async () => {
      await fixture.whenStable();
      expect(component.translationRows).to.have.length.greaterThan(0);
    });

    it('should set loadingPageStatus to false after init', async () => {
      await fixture.whenStable();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should set loadingPageStatus to false even if getLanguageDocs fails', async () => {
      sinon.stub(console, 'error');
      languagesService.getLanguageDocs.rejects(new Error('error'));
      await component.ngOnInit();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should handle error if getLanguageDocs fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      languagesService.getLanguageDocs.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('initLocaleCodes', () => {
    it('should set leftCode to en', () => {
      component['initLocaleCodes']();
      expect(component.leftCode).to.equal('en');
    });

    it('should set rightCode to first non-en language', () => {
      component.rightTranslationOptions = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ];
      component['initLocaleCodes']();
      expect(component.rightCode).to.equal('es');
    });

    it('should set rightCode to en if no other language exists', () => {
      component.rightTranslationOptions = [
        { code: 'en', name: 'English' },
      ];
      component['initLocaleCodes']();
      expect(component.rightCode).to.equal('en');
    });

    it('should set rightCode to en if rightTranslationOptions is empty', () => {
      component.rightTranslationOptions = [];
      component['initLocaleCodes']();
      expect(component.rightCode).to.equal('en');
    });
  });
  describe('buildTranslationRows', () => {
    beforeEach(async () => {
      await fixture.whenStable();
    });

    it('should build rows based on left doc keys', () => {
      component.leftCode = 'en';
      component.rightCode = 'es';
      component.buildTranslationRows();
      expect(component.translationRows).to.have.length(3);
    });

    it('should set leftValue to translated value when not in keys mode', () => {
      component.leftCode = 'en';
      component.rightCode = 'es';
      component.buildTranslationRows();
      const row = component.translationRows.find(r => r.key === 'Submit');
      expect(row!.leftValue).to.equal('Submit');
    });

    it('should set rightValue to translated value in right doc', () => {
      component.leftCode = 'en';
      component.rightCode = 'es';
      component.buildTranslationRows();
      const row = component.translationRows.find(r => r.key === 'Submit');
      expect(row!.rightValue).to.equal('Enviar');
    });

    it('should set rightValue to undefined if key does not exist in right doc', () => {
      component.leftCode = 'en';
      component.rightCode = 'es';
      component.buildTranslationRows();
      const row = component.translationRows.find(r => r.key === 'Cancel');
      expect(row!.rightValue).to.be.undefined;
    });

    it('should set leftValue to key when in keys mode', () => {
      component.leftCode = 'keys';
      component.rightCode = 'es';
      component.buildTranslationRows();
      const row = component.translationRows.find(r => r.key === 'Submit');
      expect(row!.leftValue).to.equal('Submit');
    });

    it('should use en as base doc when in keys mode', () => {
      component.leftCode = 'keys';
      component.rightCode = 'es';
      component.buildTranslationRows();
      expect(component.translationRows).to.have.length(3);
    });

    it('should merge generic and custom in left doc', () => {
      component.leftCode = 'en';
      component.rightCode = 'es';
      component.buildTranslationRows();
      const row = component.translationRows.find(r => r.key === 'Clinic');
      expect(row!.leftValue).to.equal('Household');
    });

    it('should return empty rows if left doc is not found', () => {
      component.leftCode = 'fr';
      component.rightCode = 'es';
      component.buildTranslationRows();
      expect(component.translationRows).to.deep.equal([]);
    });
  });
  describe('onDropdownChange', () => {
    beforeEach(async () => {
      await fixture.whenStable();
    });

    it('should call buildTranslationRows', () => {
      const buildSpy = sinon.spy(component, 'buildTranslationRows');
      component.onDropdownChange();
      expect(buildSpy.calledOnce).to.be.true;
    });

    it('should update translationRows when leftCode changes', () => {
      component.leftCode = 'es';
      component.onDropdownChange();
      const row = component.translationRows.find(r => r.key === 'Submit');
      expect(row!.leftValue).to.equal('Enviar');
    });

    it('should update translationRows when rightCode changes', () => {
      component.leftCode = 'en';
      component.rightCode = 'es';
      component.onDropdownChange();
      const row = component.translationRows.find(r => r.key === 'Submit');
      expect(row!.rightValue).to.equal('Enviar');
    });
  });
  describe('addTranslation', () => {
    it('should set selectedKey to null', () => {
      component.addTranslation();
      expect(component.selectedKey).to.be.null;
    });

    it('should set showEditModal to true', () => {
      component.addTranslation();
      expect(component.showEditModal).to.be.true;
    });
  });
  describe('editTranslation', () => {
    it('should set selectedKey to the given key', () => {
      component.editTranslation('Submit');
      expect(component.selectedKey).to.equal('Submit');
    });

    it('should set showEditModal to true', () => {
      component.editTranslation('Submit');
      expect(component.showEditModal).to.be.true;
    });
  });
  describe('DOM', () => {
    beforeEach(async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should show loader when loadingPageStatus is true', () => {
      component.loadingPageStatus = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.exist;
    });

    it('should not show loader when loadingPageStatus is false', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.not.exist;
    });

    it('should render the add translation button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.btn.btn-primary')).to.exist;
    });

    it('should render two selects', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const selects = compiled.querySelectorAll('select');
      expect(selects.length).to.equal(2);
    });

    it('should render left select with Translation Keys as first option', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const leftSelect = compiled.querySelectorAll('select')[0];
      const firstOption = leftSelect.querySelectorAll('option')[0];
      expect(firstOption.textContent).to.include('Translation Keys');
    });

    it('should render right select without Translation Keys option', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const rightSelect = compiled.querySelectorAll('select')[1];
      const options = rightSelect.querySelectorAll('option');
      const hasKeys = Array.from(options).some(o => o.textContent?.includes('Translation Keys'));
      expect(hasKeys).to.be.false;
    });

    it('should render a row for each translation', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const rows = compiled.querySelectorAll('.translation');
      expect(rows.length).to.equal(component.translationRows.length);
    });

    it('should show missing-term class when rightValue is undefined', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.missing-term')).to.exist;
    });

    it('should not show missing-term when all values exist', () => {
      component.translationRows = [
        { key: 'Submit', leftValue: 'Submit', rightValue: 'Enviar' }
      ];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.missing-term')).to.not.exist;
    });
  });
});
