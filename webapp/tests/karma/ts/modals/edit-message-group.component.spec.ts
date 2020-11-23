import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import * as uuid from 'uuid';

import { MmModal } from '@mm-modals/mm-modal/mm-modal';
import { EditGroupService } from '@mm-services/edit-group.service';
import { SettingsService } from '@mm-services/settings.service';
import { EditMessageGroupComponent } from '@mm-modals/edit-message-group/edit-message-group.component';

describe('EditMessageGroupComponent', () => {
  let component: EditMessageGroupComponent;
  let fixture: ComponentFixture<EditMessageGroupComponent>;
  let bdModalRef;
  let editGroupService;
  let settingsService;
  let clock;

  beforeEach(async(() => {
    bdModalRef = {
      hide: sinon.stub(),
      onHidden: new Subject(),
    };

    editGroupService = { edit: sinon.stub().resolves() };
    settingsService = { get: sinon.stub().resolves({}) };


    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          EditMessageGroupComponent,
          MmModal,
        ],
        providers: [
          { provide: BsModalRef, useValue: bdModalRef },
          { provide: SettingsService, useValue: settingsService },
          { provide: EditGroupService, useValue: editGroupService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(EditMessageGroupComponent);
        component = fixture.componentInstance;
      });
  }));

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  describe('submit', () => {
    it('should not crash when no model', async () => {
      component.model = false;
      await component.submit();
    });

    it('should call editGroupService', async () => {
      component.model = {
        report: { _id: 'the_report' },
        group: { rows: [{ message: 'message' }] },
      };
      await component.submit();
      expect(editGroupService.edit.callCount).to.equal(1);
      expect(editGroupService.edit.args[0]).to.deep.equal(['the_report', component.model.group]);
    });

    it('should catch edit errors', async () => {
      editGroupService.edit.rejects({ some: 'err' });
      component.model = {
        report: { _id: 'the_report' },
        group: { rows: [{ message: 'message' }] },
      };
      await component.submit();
      expect(editGroupService.edit.callCount).to.equal(1);
      expect(editGroupService.edit.args[0]).to.deep.equal(['the_report', component.model.group]);
      expect(component.status.error).to.equal('Error updating group');
    });
  });

  describe('addTask', () => {
    it('should add task', () => {
      const NOW = 10000;
      clock = sinon.useFakeTimers(NOW);
      component.model = {
        report: { _id: 'report' },
        group: {
          number: 3,
          rows: [
            { due: 'yesterday', group: 3, state: 'state', id: 1 },
            { due: 'day before', group: 3, state: 'state', id: 2 },
            { due: 'day before', group: 3, state: 'state', id: 3 },
          ]
        }
      };
      sinon.stub(uuid, 'v4').returns('the id');

      component.addTask();
      expect(component.model.group.number).to.equal(3);
      expect(component.model.group.rows.length).to.equal(4);
      expect(component.model.group.rows).to.deep.equal([
        { due: 'yesterday', group: 3, state: 'state', id: 1 },
        { due: 'day before', group: 3, state: 'state', id: 2 },
        { due: 'day before', group: 3, state: 'state', id: 3 },
        {
          due: new Date(NOW).toISOString(),
          added: true,
          group: 3,
          state: 'scheduled',
          messages: [{ message: '' }],
          id: 'the id',
        },
      ]);
    });
  });

});
