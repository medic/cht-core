import { provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { async, ComponentFixture, fakeAsync, TestBed, flush } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';

import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { DbService } from '@mm-services/db.service';
import { MmModal } from '@mm-modals/mm-modal/mm-modal';
import { GlobalActions } from '@mm-actions/global';

describe('DeleteDocConfirmComponent', () => {
  let component: DeleteDocConfirmComponent;
  let fixture: ComponentFixture<DeleteDocConfirmComponent>;
  let bdModalRef;
  let dbService;
  let router;
  let translateService;
  let globalActions;

  beforeEach(async(() => {
    bdModalRef = { hide: sinon.stub(), onHide: new Subject() };
    dbService = { get: () => ({ put: sinon.stub().resolves(true) }) };
    router = {
      url: '',
      navigate: sinon.stub()
    };
    globalActions = {
      setSnackbarContent: sinon.spy(GlobalActions.prototype, 'setSnackbarContent')
    };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          DeleteDocConfirmComponent,
          MmModal
        ],
        providers: [
          provideMockStore(),
          { provide: BsModalRef, useValue: bdModalRef },
          { provide: DbService, useValue: dbService },
          { provide: Router, useValue: router },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DeleteDocConfirmComponent);
        component = fixture.componentInstance;
        translateService = TestBed.inject(TranslateService);
        sinon.stub(translateService, 'instant').returnsArg(0);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create DeleteDocConfirmComponent', () => {
    expect(component).to.exist;
  });

  it('close() should call hide from BsModalRef', () => {
    component.close();

    expect(bdModalRef.hide.callCount).to.equal(1);
  });

  describe('submit()', () => {
    it('should minify reports when they deleted', () => {
      const minifiedContact = {
        _id: 'id',
        parent: {
          _id: 'id123',
          parent: { _id: 'id456' }
        }
      };
      component.model = {
        doc: {
          id: 'id',
          patient: {},
          rev: 'rev',
          type: 'data_record',
          contact: {
            _id: 'id',
            parent: {
              _id: 'id123',
              parent: { _id: 'id456' }
            }
          }
        }
      };
      fixture.detectChanges();

      component.submit();

      expect(component.model.doc).to.not.have.key('patient');
      expect(component.model.doc.contact).to.deep.equal(minifiedContact);
      expect(component.model.doc.contact.parent).to.not.have.key('name');
    });

    it('should not navigate if it is selectMode', fakeAsync(() => {
      router.url = '/reports/id';
      component.selectMode = true;
      fixture.detectChanges();

      component.submit();
      flush();

      expect(router.navigate.callCount).to.equal(0);
      expect(translateService.instant.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.args[0][0]).to.equal('document.deleted');
    }));

    it('should not navigate if url is not from reports or contacts', fakeAsync(() => {
      router.url = '/something';
      component.selectMode = false;
      component.model = {
        doc: {
          id: 'id',
          type: 'data_record',
          parent: {
            _id: 'id123',
          }
        }
      };
      fixture.detectChanges();

      component.submit();
      flush();

      expect(router.navigate.callCount).to.equal(0);
      expect(translateService.instant.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.args[0][0]).to.equal('document.deleted');
    }));

    it('should navigate if it is not selectMode and url is from reports', fakeAsync(() => {
      router.url = '/reports/id';
      component.selectMode = false;
      component.model = {
        doc: {
          id: 'id',
          type: 'data_record',
          parent: {
            _id: 'id123',
          }
        }
      };
      fixture.detectChanges();

      component.submit();
      flush();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0][0]).to.have.members(['reports', '']);
      expect(translateService.instant.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.args[0][0]).to.equal('document.deleted');
    }));

    it('should navigate if it is not selectMode and url is from contact with not parent place', fakeAsync(() => {
      router.url = '/contacts/id';
      component.selectMode = false;
      component.model = {
        doc: {
          id: 'id',
          type: 'data_record',
          parent: {}
        }
      };
      fixture.detectChanges();

      component.submit();
      flush();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0][0]).to.have.members(['contacts', '']);
      expect(translateService.instant.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.args[0][0]).to.equal('document.deleted');
    }));

    it('should navigate to parent place if it is not selectMode and url is from contact', fakeAsync(() => {
      router.url = '/contacts/id';
      component.selectMode = false;
      component.model = {
        doc: {
          id: 'id',
          type: 'data_record',
          parent: {
            _id: '12345'
          }
        }
      };
      fixture.detectChanges();

      component.submit();
      flush();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0][0]).to.have.members(['contacts', '12345']);
      expect(translateService.instant.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.callCount).to.equal(1);
      expect(globalActions.setSnackbarContent.args[0][0]).to.equal('document.deleted');
    }));
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });
});
