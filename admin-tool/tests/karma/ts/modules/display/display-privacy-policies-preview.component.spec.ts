import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { BrowserModule } from '@angular/platform-browser';
// eslint-disable-next-line @stylistic/max-len
import { DisplayPrivacyPoliciesPreviewComponent } from '@admin-tool-modules/display/display-privacy-policies/display-privacy-policies-preview/display-privacy-policies-preview.component';

describe('DisplayPrivacyPoliciesPreviewComponent', () => {
  let component: DisplayPrivacyPoliciesPreviewComponent;
  let fixture: ComponentFixture<DisplayPrivacyPoliciesPreviewComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed.configureTestingModule({
      imports: [DisplayPrivacyPoliciesPreviewComponent, TranslateModule.forRoot(), BrowserModule],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayPrivacyPoliciesPreviewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  describe('initial state', () => {
    it('should create', () => {
      expect(component).to.exist;
    });

    it('should start with visible false', () => {
      expect(component.visible).to.be.false;
    });

    it('should start with attachment null', () => {
      expect(component.attachment).to.be.null;
    });

    it('should start with stagedFile null', () => {
      expect(component.stagedFile).to.be.null;
    });

    it('should start with content null', () => {
      expect(component.content).to.be.null;
    });

    it('should start with errorKey null', () => {
      expect(component.errorKey).to.be.null;
    });

    it('should start with languageName empty', () => {
      expect(component.languageName).to.equal('');
    });
  });
  describe('ngOnChanges', () => {
    it('should clear content when visible changes to true', () => {
      component.content = '<p>test</p>';
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.content).to.be.null;
    });

    it('should clear errorKey when visible changes to true', () => {
      component.errorKey = 'some.error';
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.errorKey).to.be.null;
    });

    it('should not do anything when visible changes to false', () => {
      component.errorKey = 'some.error';
      component.ngOnChanges({
        visible: { currentValue: false, previousValue: true, firstChange: false, isFirstChange: () => false }
      });
      expect(component.errorKey).to.equal('some.error');
    });

    it('should set errorKey when attachment content_type is not text/html', () => {
      component.attachment = { content_type: 'application/pdf', data: 'abc' };
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.errorKey).to.equal('display.privacy.policies.preview.wrong.type');
    });

    it('should not set content when attachment content_type is not text/html', () => {
      component.attachment = { content_type: 'application/pdf', data: 'abc' };
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.content).to.be.null;
    });

    it('should set content when attachment is valid', () => {
      component.attachment = { content_type: 'text/html', data: btoa('<p>hello</p>') };
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.content).to.exist;
    });

    it('should set errorKey when stagedFile type is not text/html', () => {
      component.stagedFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(component.errorKey).to.equal('display.privacy.policies.preview.wrong.type');
    });

    it('should call readFileAsHtml when stagedFile is valid', () => {
      const readSpy = sinon.spy(component as any, 'readFileAsHtml');
      component.stagedFile = new File(['<p>hello</p>'], 'test.html', { type: 'text/html' });
      component.ngOnChanges({
        visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
      });
      expect(readSpy.calledOnce).to.be.true;
    });
  });
  describe('decodeBase64Html', () => {
    it('should decode a simple base64 string', () => {
      const result = component['decodeBase64Html'](btoa('<p>hello</p>'));
      expect(result).to.equal('<p>hello</p>');
    });

    it('should decode a base64 string with unicode characters', () => {
      const result = component['decodeBase64Html'](btoa(unescape(encodeURIComponent('<p>hola ñ</p>'))));
      expect(result).to.equal('<p>hola ñ</p>');
    });

    it('should return empty string for empty base64', () => {
      const result = component['decodeBase64Html'](btoa(''));
      expect(result).to.equal('');
    });
  });
  describe('readFileAsHtml', () => {
    let fileReaderStub;

    beforeEach(() => {
      fileReaderStub = {
        addEventListener: sinon.stub().callsFake((event, cb) => {
          if (event === 'loadend') {
            fileReaderStub._loadendCb = cb;
          }
          if (event === 'error') {
            fileReaderStub._errorCb = cb;
          }
        }),
        readAsText: sinon.stub().callsFake(() => {
          fileReaderStub.result = '<p>hello</p>';
          fileReaderStub._loadendCb();
        }),
        result: '',
        error: null,
      };
      sinon.stub(window, 'FileReader').returns(fileReaderStub);
    });

    it('should set content on loadend', () => {
      const file = new File(['<p>hello</p>'], 'test.html', { type: 'text/html' });
      component['readFileAsHtml'](file);
      expect(component.content).to.exist;
    });

    it('should call readAsText with utf-8', () => {
      const file = new File(['<p>hello</p>'], 'test.html', { type: 'text/html' });
      component['readFileAsHtml'](file);
      expect(fileReaderStub.readAsText.calledWith(file, 'utf-8')).to.be.true;
    });

    it('should set errorKey on error', () => {
      fileReaderStub.addEventListener.callsFake((event, cb) => {
        if (event === 'error') {
          fileReaderStub._errorCb = cb;
        }
      });
      fileReaderStub.readAsText.callsFake(() => {
        fileReaderStub._errorCb();
      });
      sinon.stub(console, 'error');
      const file = new File([''], 'test.html', { type: 'text/html' });
      component['readFileAsHtml'](file);
      expect(component.errorKey).to.equal('display.privacy.policies.preview.wrong.type');
    });

    it('should call console.error on error', () => {
      fileReaderStub.addEventListener.callsFake((event, cb) => {
        if (event === 'error') {
          fileReaderStub._errorCb = cb;
        }
      });
      fileReaderStub.readAsText.callsFake(() => {
        fileReaderStub._errorCb();
      });
      const consoleStub = sinon.stub(console, 'error');
      const file = new File([''], 'test.html', { type: 'text/html' });
      component['readFileAsHtml'](file);
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

    it('should show backdrop when visible is true', () => {
      component.visible = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal-backdrop')).to.exist;
    });

    it('should not show backdrop when visible is false', () => {
      component.visible = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal-backdrop')).to.not.exist;
    });

    it('should show error message when errorKey is set', () => {
      component.visible = true;
      component.errorKey = 'display.privacy.policies.preview.wrong.type';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-danger')).to.exist;
    });

    it('should not show error message when errorKey is null', () => {
      component.visible = true;
      component.errorKey = null;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-danger')).to.not.exist;
    });

    it('should render content when content is set', () => {
      component.visible = true;
      component.content = '<p>hello</p>';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal-body p')).to.exist;
    });
    
    it('should show close button', () => {
      component.visible = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('button.close')).to.exist;
    });

    it('should call cancel when close button is clicked', () => {
      component.visible = true;
      fixture.detectChanges();
      const cancelSpy = sinon.spy(component, 'cancel');
      const compiled = fixture.nativeElement as HTMLElement;
      const closeBtn = compiled.querySelector('button.close') as HTMLButtonElement;
      closeBtn.click();
      expect(cancelSpy.calledOnce).to.be.true;
    });
  });
});
