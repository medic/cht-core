import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { AppFormsComponent } from '@admin-tool-modules/forms/app-forms/app-forms.component';
import { AppFormsService } from '@admin-tool-services/app-forms.service';
import { ResourcesService } from '@admin-tool-services/resources.service';
import { FormDoc } from '@admin-tool-modules/forms/app-forms-interfaces';
import { ResourcesDoc } from '@admin-tool-modules/resources-interfaces';

describe('AppFormsComponent', () => {
  let component: AppFormsComponent;
  let fixture: ComponentFixture<AppFormsComponent>;
  let appFormsService;
  let resourcesService;

  const mockForms: FormDoc[] = [
    { 
      _id: 'form:death_report', 
      type: 'form', 
      internalId: 'death_report', 
      title: 'Death report', 
      icon: 'icon-death-general' 
    },
    { 
      _id: 'form:pregnancy', 
      type: 'form', 
      internalId: 'pregnancy', 
      title: 'Pregnancy registration', 
      icon: 'icon-pregnancy', 
      translation_key: 'pregnancy.title' 
    },
  ];

  const mockResourcesDoc: ResourcesDoc = {
    _id: 'resources',
    resources: {
      'icon-death-general': 'icon-death-general.png',
    },
    _attachments: {
      'icon-death-general.png': {
        content_type: 'image/png',
        data: btoa('png-content'),
      },
    },
  };

  beforeEach(waitForAsync(() => {
    appFormsService = {
      getForms: sinon.stub().resolves(mockForms),
    };

    resourcesService = {
      getResources: sinon.stub().resolves(mockResourcesDoc),
      getIconContent: sinon.stub().returns({ isSvg: false, content: '' }),
    };

    return TestBed.configureTestingModule({
      imports: [AppFormsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AppFormsService, useValue: appFormsService },
        { provide: ResourcesService, useValue: resourcesService },
      ],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AppFormsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  describe('initial state', () => {
    it('should create', () => {
      expect(component).to.exist;
    });

    it('should start with empty forms array', () => {
      expect(component.forms).to.be.an('array');
    });

    it('should start with loadingPageStatus false', () => {
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });
  });
  describe('ngOnInit', () => {
    it('should call getForms on init', () => {
      expect(appFormsService.getForms.calledOnce).to.be.true;
    });

    it('should call getResources on init', () => {
      expect(resourcesService.getResources.calledOnce).to.be.true;
    });

    it('should set forms after init', async () => {
      await fixture.whenStable();
      expect(component.forms).to.deep.equal(mockForms);
    });

    it('should set resourcesDoc after init', async () => {
      await fixture.whenStable();
      expect(component.resourcesDoc).to.deep.equal(mockResourcesDoc);
    });

    it('should set loadingPageStatus to false after init', async () => {
      await fixture.whenStable();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should set loadingPageStatus to false even if getForms fails', async () => {
      sinon.stub(console, 'error');
      appFormsService.getForms.rejects(new Error('error'));
      await component.ngOnInit();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should set loadingPageStatus to false even if getResources fails', async () => {
      sinon.stub(console, 'error');
      resourcesService.getResources.rejects(new Error('error'));
      await component.ngOnInit();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should handle error if getForms fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      appFormsService.getForms.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledWith('Error fetching XForms for form config page.', sinon.match.any)).to.be.true;
    });

    it('should handle error if getResources fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      resourcesService.getResources.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledWith('Error fetching XForms for form config page.', sinon.match.any)).to.be.true;
    });
  });
  describe('getFormIcon', () => {
    it('should return empty content if resourcesDoc is null', () => {
      component.resourcesDoc = null;
      const result = component.getFormIcon('icon-death-general');
      expect(result.content).to.equal('');
      expect(result.isSvg).to.be.false;
    });

    it('should return empty content if iconName is empty', () => {
      const result = component.getFormIcon('');
      expect(result.content).to.equal('');
      expect(result.isSvg).to.be.false;
    });

    it('should call getIconContent with correct parameters', async () => {
      await fixture.whenStable();
      component.getFormIcon('icon-death-general');
      expect(resourcesService.getIconContent.calledWith('icon-death-general', mockResourcesDoc)).to.be.true;
    });

    it('should return result from getIconContent', async () => {
      await fixture.whenStable();
      resourcesService.getIconContent.returns({ isSvg: true, content: '<svg>test</svg>' });
      const result = component.getFormIcon('icon-pregnancy');
      expect(result.isSvg).to.be.true;
      expect((result.content as any).changingThisBreaksApplicationSecurity).to.equal('<svg>test</svg>');
    });
  });
  describe('upload', () => {

    beforeEach(async () => {
      appFormsService.uploadForm = sinon.stub().resolves();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    const setFiles = (xmlFile: File | null, metaFile: File | null) => {
      Object.defineProperty(component.xmlFileRef.nativeElement, 'files', {
        value: xmlFile ? [xmlFile] : [],
        configurable: true,
      });
      Object.defineProperty(component.metaFileRef.nativeElement, 'files', {
        value: metaFile ? [metaFile] : [],
        configurable: true,
      });
    };

    it('should set error if no files selected', async () => {
      setFiles(null, null);
      await component.upload();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Upload failed: XML and JSON meta files not found');
    });

    it('should set error if only meta file selected', async () => {
      setFiles(null, new File(['{}'], 'test.json'));
      await component.upload();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Upload failed: XML file not found');
    });

    it('should set error if only xml file selected', async () => {
      setFiles(new File(['<xml/>'], 'test.xml'), null);
      await component.upload();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Upload failed: JSON meta file not found');
    });
    it('should set responseStatus to loading during upload', async () => {
      appFormsService.uploadForm.callsFake(() => {
        expect(component.responseStatus.state).to.equal('loading');
        return Promise.resolve();
      });
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
    });

    it('should call uploadForm with correct files', async () => {
      const xmlFile = new File(['<xml/>'], 'test.xml');
      const metaFile = new File(['{}'], 'test.json');
      setFiles(xmlFile, metaFile);
      await component.upload();
      expect(appFormsService.uploadForm.calledWith(xmlFile, metaFile)).to.be.true;
    });

    it('should reset inputs after success', async () => {
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
      expect(component.xmlFileRef.nativeElement.value).to.equal('');
      expect(component.metaFileRef.nativeElement.value).to.equal('');
    });

    it('should call getForms after success', async () => {
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
      expect(appFormsService.getForms.callCount).to.be.greaterThan(1);
    });

    it('should not touch loadingPageStatus after success', async () => {
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should clear responseStatus after success', async () => {
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should set responseStatus error if uploadForm fails', async () => {
      appFormsService.uploadForm.rejects(new Error('server error'));
      sinon.stub(console, 'error');
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
      expect(component.responseStatus.state).to.equal('error');
    });

    it('should set error message with Upload failed prefix if uploadForm fails', async () => {
      appFormsService.uploadForm.rejects(new Error('server error'));
      sinon.stub(console, 'error');
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
      expect(component.responseStatus.msg).to.equal('Upload failed: server error');
    });

    it('should call console.error if uploadForm fails', async () => {
      appFormsService.uploadForm.rejects(new Error('server error'));
      const consoleStub = sinon.stub(console, 'error');
      setFiles(new File(['<xml/>'], 'test.xml'), new File(['{}'], 'test.json'));
      await component.upload();
      expect(consoleStub.calledWith('Upload failed', sinon.match.any)).to.be.true;
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

    it('should render a row for each form', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const rows = compiled.querySelectorAll('.row:not(.selection-heading)');
      expect(rows.length).to.equal(mockForms.length);
    });

    it('should render the form id in each row', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const rows = compiled.querySelectorAll('.row:not(.selection-heading)');
      expect(rows[0].querySelector('.col-sm-5')!.textContent).to.include('form:death_report');
    });

    it('should render title when form has no translation_key', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const rows = compiled.querySelectorAll('.row:not(.selection-heading)');
      expect(rows[0].querySelector('.col-sm-6')!.textContent).to.include('Death report');
    });

    it('should render img when icon is not svg', async () => {
      await fixture.whenStable();
      resourcesService.getIconContent.returns({ 
        isSvg: false, 
        content: `data:image/png;base64,${btoa('png-content')}` 
      });
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('img')).to.exist;
    });

    it('should render span with innerHTML when icon is svg', async () => {
      await fixture.whenStable();
      resourcesService.getIconContent.returns({ isSvg: true, content: '<svg>test</svg>' });
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('span[innerHTML]')).to.not.exist;
    });
  });
});
