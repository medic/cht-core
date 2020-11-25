import { provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';

import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { DbService } from '@mm-services/db.service';
import { MmModal } from '@mm-modals/mm-modal/mm-modal';

describe('DeleteDocConfirmComponent', () => {
  let component: DeleteDocConfirmComponent;
  let fixture: ComponentFixture<DeleteDocConfirmComponent>;
  let bdModalRef;
  let dbService;

  beforeEach(async(() => {
    bdModalRef = { hide: sinon.stub(), onHide: new Subject() };
    dbService = { get: () => ({ put: sinon.stub().resolves(true) }) };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule
        ],
        declarations: [
          DeleteDocConfirmComponent,
          MmModal
        ],
        providers: [
          provideMockStore(),
          { provide: BsModalRef, useValue: bdModalRef },
          { provide: DbService, useValue: dbService }
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DeleteDocConfirmComponent);
        component = fixture.componentInstance;
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

  it('minifies reports when they deleted', () => {
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

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });
});
