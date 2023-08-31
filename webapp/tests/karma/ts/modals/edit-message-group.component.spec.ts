import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { EditGroupService } from '@mm-services/edit-group.service';
import { SettingsService } from '@mm-services/settings.service';
import { EditMessageGroupComponent } from '@mm-modals/edit-message-group/edit-message-group.component';

describe('EditMessageGroupComponent', () => {
  let component: EditMessageGroupComponent;
  let fixture: ComponentFixture<EditMessageGroupComponent>;
  let matDialogRef;
  let consoleErrorStub;
  let editGroupService;
  let settingsService;
  let clock;

  beforeEach(waitForAsync(() => {
    matDialogRef = { close: sinon.stub() };
    consoleErrorStub = sinon.stub(console, 'error');
    editGroupService = { edit: sinon.stub().resolves() };
    settingsService = { get: sinon.stub().resolves({}) };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [ EditMessageGroupComponent ],
        providers: [
          { provide: MatDialogRef, useValue: matDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
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

  it('should close modal', () => {
    component.close();

    expect(matDialogRef.close.calledOnce).to.be.true;
  });

  it('should ngOnInit should load settings', fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(settingsService.get.callCount).to.equal(1);
  }));

  describe('submit', () => {
    it('should not crash when no group or report provided', async () => {
      component.group = undefined;
      component.report = undefined;
      await component.submit();
    });

    it('should call editGroupService', async () => {
      component.report = { _id: 'the_report' };
      component.group = { rows: [{ message: 'message', task_id: 22 }] };

      await component.submit();

      expect(editGroupService.edit.calledOnce).to.be.true;
      expect(editGroupService.edit.args[0]).to.deep.equal([ 'the_report', component.group ]);
    });

    it('should catch edit errors', async () => {
      sinon.resetHistory();
      editGroupService.edit.rejects({ some: 'err' });
      component.report = { _id: 'the_report' };
      component.group = { rows: [{ message: 'message' }] };

      await component.submit();

      expect(editGroupService.edit.calledOnce).to.be.true;
      expect(editGroupService.edit.args[0]).to.deep.equal([ 'the_report', component.group ]);
      expect(component.error).to.equal('Error updating group');
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0][0]).to.equal('Error updating group');
    });
  });

  describe('addTask', () => {
    it('should add task', () => {
      const NOW = 10000;
      clock = sinon.useFakeTimers(NOW);
      component.report = { _id: 'report' };
      component.group = {
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
        ],
      };

      component.addTask();

      expect(component.group.number).to.equal(3);
      expect(component.group.rows.length).to.equal(4);
      expect(component.group.rows).to.deep.equal([
        { due: 'yesterday', group: 3, state: 'state' },
        { due: 'day before', group: 3, state: 'state' },
        { due: 'day before', group: 3, state: 'state' },
        {
          due: new Date(NOW).toISOString(),
          added: true,
          group: 3,
          state: 'scheduled',
          messages: [{ message: '' }],
        },
      ]);
    });

    it('should not load settings on every add', fakeAsync(() => {
      component.group = { number: 11, rows: [] };

      component.addTask();
      component.addTask();
      component.addTask();
      component.addTask();
      tick();

      expect(settingsService.get.notCalled).to.be.true;
      expect(component.group.rows.length).to.equal(4);
    }));
  });

  describe('deleteTask', () => {
    it('should not crash on no input', () => {
      component.report = { _id: 'report' };
      component.group = {
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
        ],
      };

      component.deleteTask(false);

      expect(component.report).to.deep.equal({ _id: 'report' });
      expect(component.group).to.deep.equal({
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
        ],
      });
    });

    it('should not crash on bad index', () => {
      component.report = { _id: 'report' };
      component.group = {
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
        ],
      };

      component.deleteTask(1000);

      expect(component.report).to.deep.equal({ _id: 'report' });
      expect(component.group).to.deep.equal({
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
        ],
      });
    });

    it('should delete task', () => {
      component.report = { _id: 'report' };
      component.group = {
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state' },
        ],
      };

      component.deleteTask(1);

      expect(component.report).to.deep.equal({ _id: 'report' });
      expect(component.group).to.deep.equal({
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state', deleted: true },
          { due: 'day before', group: 3, state: 'state' },
        ],
      });

      component.deleteTask(2);

      expect(component.report).to.deep.equal({ _id: 'report' });
      expect(component.group).to.deep.equal({
        number: 3,
        rows: [
          { due: 'yesterday', group: 3, state: 'state' },
          { due: 'day before', group: 3, state: 'state', deleted: true },
          { due: 'day before', group: 3, state: 'state', deleted: true },
        ],
      });
    });
  });

});
