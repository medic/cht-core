import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { ComponentFixture, fakeAsync, TestBed, flush, waitForAsync } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { expect } from 'chai';
import sinon from 'sinon';

import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { DbService } from '@mm-services/db.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

describe('DeleteDocConfirmComponent', () => {
  let component: DeleteDocConfirmComponent;
  let fixture: ComponentFixture<DeleteDocConfirmComponent>;
  let store: MockStore;
  let matDialogRef;
  let dbService;
  let localDb;
  let router;
  let translateService;
  let globalActions;
  let mockedSelectors;

  beforeEach(waitForAsync(() => {
    matDialogRef = { close: sinon.stub() };
    localDb = { put: sinon.stub().resolves(true) };
    dbService = { get: sinon.stub().returns(localDb) };
    router = {
      url: '',
      navigate: sinon.stub()
    };
    globalActions = {
      setSnackbarContent: sinon.spy(GlobalActions.prototype, 'setSnackbarContent')
    };
    mockedSelectors = [
      { selector: Selectors.getSelectMode, value: false },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          DeleteDocConfirmComponent,
          ModalLayoutComponent,
          PanelHeaderComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: DbService, useValue: dbService },
          { provide: Router, useValue: router },
          { provide: MatDialogRef, useValue: matDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DeleteDocConfirmComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        translateService = TestBed.inject(TranslateService);
        sinon.stub(translateService, 'instant').returnsArg(0);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create DeleteDocConfirmComponent', () => {
    expect(component).to.exist;
  });

  it('should close modal', () => {
    component.close();

    expect(matDialogRef.close.calledOnce).to.be.true;
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
      component.doc = {
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
        },
      };
      fixture.detectChanges();

      component.submit();

      expect(component.doc).to.not.have.key('patient');
      expect(component.doc.contact).to.deep.equal(minifiedContact);
      expect(component.doc.contact.parent).to.not.have.key('name');
      expect(localDb.put.callCount).to.equal(1);
      expect(localDb.put.args[0][0]).to.deep.equal({
        _deleted: true,
        id: 'id',
        rev: 'rev',
        type: 'data_record',
        contact: {
          _id: 'id',
          parent: {
            _id: 'id123',
            parent: { _id: 'id456' }
          }
        }
      });
    });

    it('should not navigate if it is selectMode', fakeAsync(() => {
      router.url = '/reports/id';
      store.overrideSelector(Selectors.getSelectMode, true);
      store.refreshState();
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
      component.doc = {
        id: 'id',
        type: 'data_record',
        parent: { _id: 'id123' },
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
      component.doc = {
        id: 'id',
        type: 'data_record',
        parent: {
          _id: 'id123',
        },
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
      component.doc = {
        id: 'id',
        type: 'data_record',
        parent: {},
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
      component.doc = {
        id: 'id',
        type: 'data_record',
        parent: { _id: '12345' },
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
