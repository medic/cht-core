
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import { SessionService } from '@mm-services/session.service';
import { ChangesService } from '@mm-services/changes.service';

describe('Error log component', () => {
  let component: ErrorLogComponent;
  let fixture: ComponentFixture<ErrorLogComponent>;
  let sessionService;
  let changesService;

  beforeEach(() => {
    sessionService = {
      isOnlineOnly: sinon.stub().returns(false),
      userCtx: sinon.stub().resolves()
    };

    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };

    return TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ErrorLogComponent
      ],
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: ChangesService, useValue: changesService },
        provideMockStore(),
      ]
    })
      .compileComponents().then(() => {
        fixture = TestBed.createComponent(ErrorLogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  it('should create component', fakeAsync(() => {
    expect(component).to.exist;
  }));

  it('should initialize data on ngAfterViewInit', fakeAsync(() => {
    const mockUserCtx = { name: 'test_user' };
    sessionService.userCtx.returns(mockUserCtx);

    component.ngAfterViewInit();

    expect(component.userCtx).to.eql(mockUserCtx);
    expect(component.url).to.exist;
    expect(component.currentDate).to.eql(Date.now());
  }));

  it('should unsubscribe from observables on component destroy', () => {
    const unsubscribeSpy = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.callCount).to.equal(1);
  });

  describe('friendly message and details', () => {
    const query = (selector) => fixture.nativeElement.querySelector(selector);

    afterEach(() => sinon.restore());

    it('should show the plain message and hide the details for offline users', () => {
      sessionService.isOnlineOnly.returns(false);

      component.ngAfterViewInit();
      fixture.detectChanges();

      expect(query('.error-message').textContent).to.contain('error.log.message');
      expect(query('.error-details')).to.be.null;
      expect(query('.error-details-toggle').textContent.trim()).to.equal('error.log.details.show');
      expect(query('.error-details-toggle').getAttribute('aria-expanded')).to.equal('false');
    });

    it('should show the details straight away for online users and admins', () => {
      sessionService.isOnlineOnly.returns(true);

      component.ngAfterViewInit();
      fixture.detectChanges();

      expect(query('.error-details')).to.exist;
      expect(query('.error-details-toggle').textContent.trim()).to.equal('error.log.details.hide');
    });

    it('should toggle the details', () => {
      component.errorStack = 'TypeError: boom';
      component.showDetails = false;
      fixture.detectChanges();

      query('.error-details-toggle').click();
      fixture.detectChanges();

      expect(query('.error-details')).to.exist;
      expect(query('pre').textContent).to.contain('TypeError: boom');

      query('.error-details-toggle').click();
      fixture.detectChanges();

      expect(query('.error-details')).to.be.null;
    });

    it('should only show the reload button when a reload function is given', () => {
      expect(query('.error-reload')).to.be.null;

      const reload = sinon.stub();
      component.reload = reload;
      fixture.detectChanges();
      query('.error-reload').click();

      expect(reload.callCount).to.equal(1);
    });

    it('should copy the details as plain text', async () => {
      const writeText = sinon.stub(navigator.clipboard, 'writeText').resolves();
      component.errorFor = 'tasks';
      component.errorStack = 'TypeError: boom';
      component.userName = 'chw_1';

      await component.copyDetails();

      expect(writeText.callCount).to.equal(1);
      const text = writeText.args[0][0];
      expect(text).to.contain('Error fetching tasks');
      expect(text).to.contain('User Name: chw_1');
      expect(text).to.contain('TypeError: boom');
      expect(component.copied).to.equal(true);
    });

    it('should fall back to a hidden textarea when the clipboard API fails', async () => {
      sinon.stub(navigator.clipboard, 'writeText').rejects(new Error('not allowed'));
      const execCommand = sinon.stub(document, 'execCommand').returns(true);
      component.errorStack = 'TypeError: boom';

      await component.copyDetails();

      expect(execCommand.calledOnceWith('copy')).to.equal(true);
      expect(component.copied).to.equal(true);
      expect(document.querySelector('textarea[readonly]')).to.be.null;
    });
  });

});
