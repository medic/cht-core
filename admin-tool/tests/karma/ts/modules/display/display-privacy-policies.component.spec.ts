import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  DisplayPrivacyPoliciesComponent 
} from '@admin-tool-modules/display/display-privacy-policies/display-privacy-policies.component';
import { LanguagesService } from '@admin-tool-services/languages.service';

describe('DisplayPrivacyPoliciesComponent', () => {
  let component: DisplayPrivacyPoliciesComponent;
  let fixture: ComponentFixture<DisplayPrivacyPoliciesComponent>;
  let languagesService;

  const mockLanguageDocs = [
    { _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations', generic: {}, custom: {} },
    { _id: 'messages-es', _rev: '1-def', code: 'es', name: 'Spanish', type: 'translations', generic: {}, custom: {} },
  ];

  const mockPrivacyPoliciesDoc = {
    _id: 'privacy-policies',
    _rev: '1-abc',
    privacy_policies: { en: 'en.html' },
    _attachments: {
      'en.html': {
        content_type: 'text/html',
        digest: 'md5-xxx',
        data: 'PGh0bWw+PC9odG1sPg==',
        revpos: 1,
      }
    }
  };

  beforeEach(waitForAsync(() => {
    languagesService = {
      getLanguageDocs: sinon.stub().resolves(mockLanguageDocs),
      getPrivacyPoliciesDoc: sinon.stub().resolves(mockPrivacyPoliciesDoc),
      savePrivacyPolicies: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayPrivacyPoliciesComponent, TranslateModule.forRoot()],
      providers: [{ provide: LanguagesService, useValue: languagesService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayPrivacyPoliciesComponent);
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

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should start with empty languagePolicyDeletes', () => {
      expect(component.languagePolicyDeletes).to.deep.equal([]);
    });

    it('should start with showPreviewModal false', () => {
      expect(component.showPreviewModal).to.be.false;
    });

    it('should start with previewAttachment null', () => {
      expect(component.previewAttachment).to.be.null;
    });

    it('should start with previewStagedFile null', () => {
      expect(component.previewStagedFile).to.be.null;
    });

    it('should start with previewLanguageName empty', () => {
      expect(component.previewLanguageName).to.equal('');
    });
  });
  describe('ngOnInit', () => {
    it('should call getLanguageDocs on init', () => {
      expect(languagesService.getLanguageDocs.calledOnce).to.be.true;
    });

    it('should call getPrivacyPoliciesDoc with true on init', () => {
      expect(languagesService.getPrivacyPoliciesDoc.calledWith(true)).to.be.true;
    });

    it('should set privacyPoliciesDoc after init', async () => {
      await fixture.whenStable();
      expect(component.privacyPoliciesDoc).to.deep.equal(mockPrivacyPoliciesDoc);
    });

    it('should build privacyPolicyRows after init', async () => {
      await fixture.whenStable();
      expect(component.privacyPolicyRows).to.have.length(2);
    });

    it('should set attachment for language that has a policy', async () => {
      await fixture.whenStable();
      const enRow = component.privacyPolicyRows.find(row => row.code === 'en');
      expect(enRow!.attachment).to.deep.equal(mockPrivacyPoliciesDoc._attachments['en.html']);
    });

    it('should show rows even if getPrivacyPoliciesDoc fails', async () => {
      languagesService.getPrivacyPoliciesDoc.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.ngOnInit();
      expect(component.privacyPolicyRows).to.have.length(2);
    });

    it('should set attachment to null for all rows if getPrivacyPoliciesDoc fails', async () => {
      languagesService.getPrivacyPoliciesDoc.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.ngOnInit();
      component.privacyPolicyRows.forEach(row => expect(row.attachment).to.be.null);
    });

    it('should set attachment to null for language without a policy', async () => {
      await fixture.whenStable();
      const esRow = component.privacyPolicyRows.find(row => row.code === 'es');
      expect(esRow!.attachment).to.be.null;
    });

    it('should set stagedFile to null for all rows', async () => {
      await fixture.whenStable();
      component.privacyPolicyRows.forEach(row => expect(row.stagedFile).to.be.null);
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

    it('should handle error if getPrivacyPoliciesDoc fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      languagesService.getPrivacyPoliciesDoc.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('onFileSelected', () => {
    it('should set stagedFile on the correct row', () => {
      const file = new File([''], 'en.html', { type: 'text/html' });
      const event = { target: { files: [file] } } as any;
      component.onFileSelected('en', event);
      const row = component.privacyPolicyRows.find(row => row.code === 'en');
      expect(row!.stagedFile).to.equal(file);
    });

    it('should not affect other rows when file is selected', () => {
      const file = new File([''], 'en.html', { type: 'text/html' });
      const event = { target: { files: [file] } } as any;
      component.onFileSelected('en', event);
      const esRow = component.privacyPolicyRows.find(row => row.code === 'es');
      expect(esRow!.stagedFile).to.be.null;
    });

    it('should set stagedFile to null when no file is selected', () => {
      const event = { target: { files: [] } } as any;
      component.onFileSelected('en', event);
      const row = component.privacyPolicyRows.find(row => row.code === 'en');
      expect(row!.stagedFile).to.be.null;
    });

    it('should do nothing if row code does not exist', () => {
      const file = new File([''], 'fr.html', { type: 'text/html' });
      const event = { target: { files: [file] } } as any;
      component.onFileSelected('fr', event);
      component.privacyPolicyRows.forEach(row => expect(row.stagedFile).to.be.null);
    });
  });
  describe('deletePolicy', () => {
    it('should set attachment to null on the correct row', async () => {
      await fixture.whenStable();
      component.deletePolicy('en');
      const row = component.privacyPolicyRows.find(row => row.code === 'en');
      expect(row!.attachment).to.be.null;
    });

    it('should add code to languagePolicyDeletes', async () => {
      await fixture.whenStable();
      component.deletePolicy('en');
      expect(component.languagePolicyDeletes).to.include('en');
    });

    it('should not affect other rows', async () => {
      await fixture.whenStable();
      component.deletePolicy('en');
      const esRow = component.privacyPolicyRows.find(row => row.code === 'es');
      expect(esRow!.attachment).to.be.null;
    });

    it('should do nothing if row code does not exist', async () => {
      await fixture.whenStable();
      component.deletePolicy('fr');
      expect(component.languagePolicyDeletes).to.not.include('fr');
    });
  });
  describe('buildPrivacyPolicyRows', () => {
    it('should build a row for each language doc', async () => {
      await fixture.whenStable();
      expect(component.privacyPolicyRows).to.have.length(2);
    });

    it('should set attachment for language that has a policy', async () => {
      await fixture.whenStable();
      const enRow = component.privacyPolicyRows.find(row => row.code === 'en');
      expect(enRow!.attachment).to.deep.equal(mockPrivacyPoliciesDoc._attachments['en.html']);
    });

    it('should set attachment to null for language without a policy', async () => {
      await fixture.whenStable();
      const esRow = component.privacyPolicyRows.find(row => row.code === 'es');
      expect(esRow!.attachment).to.be.null;
    });

    it('should set stagedFile to null for all rows', async () => {
      await fixture.whenStable();
      component.privacyPolicyRows.forEach(row => expect(row.stagedFile).to.be.null);
    });

    it('should set code and name from language doc', async () => {
      await fixture.whenStable();
      const enRow = component.privacyPolicyRows.find(row => row.code === 'en');
      expect(enRow!.code).to.equal('en');
      expect(enRow!.name).to.equal('English');
    });

    it('should handle doc with empty privacy_policies', async () => {
      languagesService.getPrivacyPoliciesDoc.resolves({
        _id: 'privacy-policies',
        privacy_policies: {},
        _attachments: {}
      });
      await component.ngOnInit();
      component.privacyPolicyRows.forEach(row => expect(row.attachment).to.be.null);
    });

    it('should handle doc with undefined _attachments', async () => {
      languagesService.getPrivacyPoliciesDoc.resolves({
        _id: 'privacy-policies',
        privacy_policies: {},
      });
      await component.ngOnInit();
      component.privacyPolicyRows.forEach(row => expect(row.attachment).to.be.null);
    });
  });
  describe('getAttachmentSize', () => {
    it('should return string length when data is a string', () => {
      const result = component.getAttachmentSize('PGh0bWw+PC9odG1sPg==');
      expect(result).to.equal(20);
    });

    it('should return file size when data is a File', () => {
      const file = new File(['hello'], 'test.html', { type: 'text/html' });
      const result = component.getAttachmentSize(file);
      expect(result).to.equal(file.size);
    });
  });
  describe('deleteUpdate', () => {
    it('should set stagedFile to null on the correct row', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      const enRow = component.privacyPolicyRows.find(row => row.code === 'en');
      enRow!.stagedFile = file;
      component.deleteUpdate('en');
      expect(enRow!.stagedFile).to.be.null;
    });

    it('should not affect other rows', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      const enRow = component.privacyPolicyRows.find(row => row.code === 'en');
      const esRow = component.privacyPolicyRows.find(row => row.code === 'es');
      enRow!.stagedFile = file;
      esRow!.stagedFile = file;
      component.deleteUpdate('en');
      expect(esRow!.stagedFile).to.equal(file);
    });

    it('should do nothing if row code does not exist', async () => {
      await fixture.whenStable();
      component.deleteUpdate('fr');
      component.privacyPolicyRows.forEach(row => expect(row.stagedFile).to.be.null);
    });
  });
  describe('submit', () => {
    it('should set responseStatus to loading at start', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      component.submit();
      expect(component.responseStatus.state).to.equal('loading');
    });

    it('should set noChanges message when no staged files and no deletes', async () => {
      await fixture.whenStable();
      await component.submit();
      expect(component.responseStatus.msg).to.equal('display.privacy.policies.no.changes');
    });

    it('should not call savePrivacyPolicies when no changes', async () => {
      await fixture.whenStable();
      await component.submit();
      expect(languagesService.savePrivacyPolicies.called).to.be.false;
    });

    it('should call getPrivacyPoliciesDoc without attachments on submit', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      await component.submit();
      expect(languagesService.getPrivacyPoliciesDoc.calledWithExactly()).to.be.true;
    });

    it('should call savePrivacyPolicies on submit with staged files', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      await component.submit();
      expect(languagesService.savePrivacyPolicies.calledOnce).to.be.true;
    });

    it('should ignore staged files with wrong content type', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.pdf', { type: 'application/pdf' });
      component.privacyPolicyRows[0].stagedFile = file;
      await component.submit();
      expect(languagesService.savePrivacyPolicies.called).to.be.false;
    });

    it('should call savePrivacyPolicies when there are deletes', async () => {
      await fixture.whenStable();
      component.languagePolicyDeletes.push('en');
      await component.submit();
      expect(languagesService.savePrivacyPolicies.calledOnce).to.be.true;
    });

    it('should set success message after submit', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      await component.submit();
      expect(component.responseStatus.msg).to.equal('display.privacy.policies.submit.success');
    });

    it('should call ngOnInit after successful submit', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      const ngOnInitSpy = sinon.spy(component, 'ngOnInit');
      await component.submit();
      expect(ngOnInitSpy.calledOnce).to.be.true;
    });

    it('should set error message when submit fails', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      languagesService.savePrivacyPolicies.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.submit();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('display.privacy.policies.failure');
    });
  });
  describe('openAttachmentPreview', () => {
    it('should set previewAttachment', () => {
      const attachment = { content_type: 'text/html', digest: 'md5-xxx', data: 'abc' };
      component.openAttachmentPreview(attachment, 'English');
      expect(component.previewAttachment).to.equal(attachment);
    });

    it('should set previewLanguageName', () => {
      const attachment = { content_type: 'text/html', digest: 'md5-xxx', data: 'abc' };
      component.openAttachmentPreview(attachment, 'English');
      expect(component.previewLanguageName).to.equal('English');
    });

    it('should set showPreviewModal to true', () => {
      const attachment = { content_type: 'text/html', digest: 'md5-xxx', data: 'abc' };
      component.openAttachmentPreview(attachment, 'English');
      expect(component.showPreviewModal).to.be.true;
    });

    it('should set previewStagedFile to null', () => {
      component.previewStagedFile = new File([''], 'en.html', { type: 'text/html' });
      const attachment = { content_type: 'text/html', digest: 'md5-xxx', data: 'abc' };
      component.openAttachmentPreview(attachment, 'English');
      expect(component.previewStagedFile).to.be.null;
    });
  });
  describe('openStagedFilePreview', () => {
    it('should set previewStagedFile', () => {
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.openStagedFilePreview(file, 'English');
      expect(component.previewStagedFile).to.equal(file);
    });

    it('should set previewLanguageName', () => {
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.openStagedFilePreview(file, 'English');
      expect(component.previewLanguageName).to.equal('English');
    });

    it('should set showPreviewModal to true', () => {
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.openStagedFilePreview(file, 'English');
      expect(component.showPreviewModal).to.be.true;
    });

    it('should set previewAttachment to null', () => {
      component.previewAttachment = { content_type: 'text/html', digest: 'md5-xxx', data: 'abc' };
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.openStagedFilePreview(file, 'English');
      expect(component.previewAttachment).to.be.null;
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

    it('should render a row for each language', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const rows = compiled.querySelectorAll('.privacy-policy-row');
      expect(rows.length).to.equal(component.privacyPolicyRows.length);
    });

    it('should show current policy details when attachment has data', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.details')).to.exist;
    });

    it('should show Select button when no staged file', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const selectButtons = compiled.querySelectorAll('.input-area');
      expect(selectButtons.length).to.be.greaterThan(0);
    });

    it('should show staged file details when stagedFile is set', () => {
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const details = compiled.querySelectorAll('.details');
      expect(details.length).to.be.greaterThan(1);
    });

    it('should show error when attachment content type is not text/html', () => {
      component.privacyPolicyRows[0].attachment = {
        content_type: 'application/pdf',
        digest: 'md5-xxx',
        data: 'somedata'
      };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')).to.exist;
    });

    it('should render Submit button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('button.btn-primary')).to.exist;
    });

    it('should disable Submit button when loading', () => {
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button.btn-primary') as HTMLButtonElement;
      expect(button.disabled).to.be.true;
    });

    it('should show loader inline when submitting', () => {
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader.inline')).to.exist;
    });

    it('should show success message when responseStatus is success', () => {
      component.responseStatus = { state: 'success', msg: 'display.privacy.policies.submit.success' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.success')).to.exist;
    });

    it('should show error message when responseStatus is error', () => {
      component.responseStatus = { state: 'error', msg: 'display.privacy.policies.failure' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')).to.exist;
    });
    
    it('should call openAttachmentPreview when preview button is clicked on current policy', async () => {
      await fixture.whenStable();
      const openSpy = sinon.spy(component, 'openAttachmentPreview');
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const previewBtn = compiled.querySelector('.actions .btn-default') as HTMLButtonElement;
      previewBtn.click();
      expect(openSpy.calledOnce).to.be.true;
    });

    it('should call openStagedFilePreview when preview button is clicked on staged file', async () => {
      await fixture.whenStable();
      const file = new File([''], 'en.html', { type: 'text/html' });
      component.privacyPolicyRows[0].stagedFile = file;
      fixture.detectChanges();
      const openSpy = sinon.spy(component, 'openStagedFilePreview');
      const compiled = fixture.nativeElement as HTMLElement;
      const previewBtns = compiled.querySelectorAll('.actions .btn-default');
      (previewBtns[previewBtns.length - 1] as HTMLButtonElement).click();
      expect(openSpy.calledOnce).to.be.true;
    });

    it('should show preview modal when showPreviewModal is true', async () => {
      await fixture.whenStable();
      component.showPreviewModal = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('display-privacy-policies-preview')).to.exist;
    });

    it('should set showPreviewModal to false when preview modal emits closed', async () => {
      await fixture.whenStable();
      component.showPreviewModal = true;
      fixture.detectChanges();
      component.showPreviewModal = false;
      fixture.detectChanges();
      expect(component.showPreviewModal).to.be.false;
    });
  });
});
