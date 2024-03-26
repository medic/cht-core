import sinon from 'sinon';
import { expect } from 'chai';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { DOCUMENT } from '@angular/common';

import { ErrorComponent } from '@mm-modules/error/error.component';
import { NavigationService } from '@mm-services/navigation.service';

describe('ErrorComponent', () => {
  let component: ErrorComponent;
  let fixture: ComponentFixture<ErrorComponent>;
  let navigationService;
  let routerMock;
  let documentMock;

  beforeEach(async () => {
    navigationService = { getPreviousUrl: sinon.stub() };
    routerMock = {
      navigate: sinon.stub(),
      navigateByUrl: sinon.stub(),
    };
    documentMock = {
      body: document.createElement('body'),
      createElement: sinon.stub().returns(document.createElement('div')),
      createComment: sinon.stub().returns(document.createElement('div')),
      querySelectorAll: sinon.stub().returns([document.createElement('div')]),
      querySelector: sinon.stub().returns(document.createElement('div')),
      defaultView: { location: { reload: sinon.stub() } },
    };

    await TestBed
      .configureTestingModule({
        declarations: [ ErrorComponent ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        providers: [
          provideMockStore({ selectors: [] }),
          { provide: NavigationService, useValue: navigationService },
          { provide: Router, useValue: routerMock },
          { provide: ActivatedRoute, useValue: {} },
          { provide: DOCUMENT, useValue: documentMock },
        ]
      })
      .compileComponents();
    fixture = TestBed.createComponent(ErrorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create component', () => {
    expect(component).to.exist;
  });

  describe('exit()', () => {
    it('should navigate to previous URL', () => {
      navigationService.getPreviousUrl.returns('/path/to/page');

      component.exit();

      expect(routerMock.navigate.notCalled).to.be.true;
      expect(routerMock.navigateByUrl.calledOnce).to.be.true;
      expect(routerMock.navigateByUrl.args[0]).to.have.deep.members([ '/path/to/page' ]);
    });

    it('should navigate to home and reload when no previous URL', () => {
      navigationService.getPreviousUrl.returns(undefined);

      component.exit();

      expect(routerMock.navigateByUrl.notCalled).to.be.true;
      expect(routerMock.navigate.calledOnce).to.be.true;
      expect(routerMock.navigate.args[0]).to.have.deep.members([ [ '/home' ] ]);
      expect(documentMock.defaultView.location.reload.notCalled).to.be.true;
    });

    it('should navigate to home and reload  when previous URL is root', () => {
      navigationService.getPreviousUrl.returns('/');

      component.exit();

      expect(routerMock.navigateByUrl.notCalled).to.be.true;
      expect(routerMock.navigate.calledOnce).to.be.true;
      expect(routerMock.navigate.args[0]).to.have.deep.members([ [ '/home' ] ]);
      expect(documentMock.defaultView.location.reload.notCalled).to.be.true;
    });

    it('should navigate back to home and reload  when previous URL is home', () => {
      navigationService.getPreviousUrl.returns('/home');

      component.exit();

      expect(routerMock.navigateByUrl.notCalled).to.be.true;
      expect(routerMock.navigate.calledOnce).to.be.true;
      expect(routerMock.navigate.args[0]).to.have.deep.members([ [ '/home' ] ]);
      expect(documentMock.defaultView.location.reload.notCalled).to.be.true;
    });

    it('should navigate back to home and reload  when previous URL is the error page', () => {
      navigationService.getPreviousUrl.returns('/error/404');

      component.exit();

      expect(routerMock.navigateByUrl.notCalled).to.be.true;
      expect(routerMock.navigate.calledOnce).to.be.true;
      expect(routerMock.navigate.args[0]).to.have.deep.members([ [ '/home' ] ]);
      expect(documentMock.defaultView.location.reload.notCalled).to.be.true;
    });
  });
});
