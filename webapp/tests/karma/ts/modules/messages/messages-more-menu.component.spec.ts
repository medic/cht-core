import { ComponentFixture, TestBed, flush, fakeAsync } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { MessagesMoreMenuComponent } from '@mm-modules/messages/messages-more-menu.component';
import { CommonModule } from '@angular/common';

describe('Messages More Menu Component', () => {
  let component: MessagesMoreMenuComponent;
  let fixture: ComponentFixture<MessagesMoreMenuComponent>;
  let sessionService;
  let authService;
  let responsiveService;

  beforeEach(async () => {
    authService = {
      has: sinon.stub().resolves(false),
      any: sinon.stub().resolves(false),
      online: sinon.stub().returns(false),
    };
    sessionService = { isAdmin: sinon.stub().returns(false) };
    responsiveService = { isMobile: sinon.stub().returns(false) };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          CommonModule,
        ],
        providers: [
          { provide: AuthService, useValue: authService },
          { provide: SessionService, useValue: sessionService },
          { provide: ResponsiveService, useValue: responsiveService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(MessagesMoreMenuComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('displayExportOption', () => {
    it('should display export option when user has all conditions okay', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(true);
      authService.online.returns(true);
      responsiveService.isMobile.returns(false);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.true;
    }));

    it('should not display export option when user not have export permission', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(false);
      authService.online.returns(true);
      responsiveService.isMobile.returns(false);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));

    it('should not display export option when user is offline', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(true);
      authService.online.returns(false);
      responsiveService.isMobile.returns(false);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));

    it('should not display export option when user is in mobile', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(true);
      authService.online.returns(true);
      responsiveService.isMobile.returns(true);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));
  });
});
