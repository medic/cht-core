import { TestBed } from '@angular/core/testing';
import { TasksNotificationService } from '@mm-services/task-notifications.service';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import moment from 'moment';

import { TranslateService } from '@mm-services/translate.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { DBSyncService } from '@mm-services/db-sync.service';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

describe('TasksNotificationService', () => {
  let service;
  let consoleErrorMock;
  let translateService;
  let rulesEngine;
  let dbSyncService;

  let tasks;

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');
    localStorage.clear();
    tasks = [
      {
        _id: 'task1',
        authoredOn: moment().valueOf(),
        state: 'Ready',
        emission: {
          title: 'Task 1',
          contact: { name: 'Owl Phil', _id: 'contact1' },
          dueDate: moment().format('YYYY-MM-DD')
        }
      },
      {
        _id: 'task2',
        authoredOn: moment().add(100, 'milliseconds').valueOf(),
        state: 'Ready',
        emission: {
          title: 'Task 2',
          contact: { name: 'Owl Phil2', _id: 'contact2' },
          dueDate: moment().format('YYYY-MM-DD')
        }
      }
    ];
    rulesEngine = {
      fetchTaskDocsForAllContacts: sinon.stub().resolves(tasks),
      isEnabled: sinon.stub().resolves(true),
    };
    dbSyncService = { sync: sinon.stub().resolves(true) };

    translateService = {
      instant: sinon.stub().returnsArg(0),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService },
        { provide: RulesEngineService, useValue: rulesEngine },
        { provide: DBSyncService, useValue: dbSyncService },
      ]
    });
    service = TestBed.inject(TasksNotificationService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should be created', async () => {
    expect(service).to.be.ok;
  });

  it('should fetch notifications', async () => {
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);
    expect(notifications[0]._id).to.equal('task2');
    expect(notifications[1]._id).to.equal('task1');
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(2);
    expect(dbSyncService.sync.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);

    notifications.forEach((notification) => {
      assert.property(notification, '_id');
      assert.property(notification, 'authoredOn');
      assert.property(notification, 'state');
      assert.property(notification, 'title');
      assert.property(notification, 'contentText');
      assert.property(notification, 'dueDate');
    });
  });

  it('should not return same notifications twice', async () => {
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);
    const secondCallNotifications = await service.fetchNotifications();
    expect(secondCallNotifications).to.be.an('array').that.has.lengthOf(0);
  });

  it('should return notification if new task is generated', async () => {
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);
    const newTask = {
      _id: 'task3',
      authoredOn: moment().add(120, 'milliseconds').valueOf(),
      state: 'Ready',
      emission: {
        title: 'Task 3',
        contact: { name: 'Owl Phil3', _id: 'contact3' },
        dueDate: moment().format('YYYY-MM-DD')
      }
    };
    rulesEngine.fetchTaskDocsForAllContacts.resolves([...tasks, newTask]);
    const updatedNotifications = await service.fetchNotifications();
    expect(updatedNotifications).to.be.an('array').that.has.lengthOf(1);
    expect(updatedNotifications[0]._id).to.equal(newTask._id);
  });

  it('should return task notification due today on a new day', async () => {
    const taskDueTomorrow = {
      _id: 'task_tomorrow',
      authoredOn: moment().subtract(1, 'day').valueOf(),
      state: 'Ready',
      emission: {
        title: 'Task 3',
        contact: { name: 'Future Owl', _id: 'contact_future' },
        dueDate: moment().add(1, 'day').format('YYYY-MM-DD')
      }
    };
    rulesEngine.fetchTaskDocsForAllContacts.resolves([...tasks, taskDueTomorrow]);
    const clock = sinon.useFakeTimers(moment().valueOf());
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);

    clock.tick(DAY_IN_MS);

    const updatedNotifications = await service.fetchNotifications();
    expect(updatedNotifications).to.be.an('array').that.has.lengthOf(1);
    clock.restore();
  });

  it('should return empty array if rules engine is disabled', async () => {
    rulesEngine.isEnabled.resolves(false);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(0);
    expect(translateService.instant.callCount).to.equal(0);
    expect(dbSyncService.sync.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should fetch notifications with no tasks', async () => {
    rulesEngine.fetchTaskDocsForAllContacts.resolves([]);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(0);
    expect(dbSyncService.sync.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should fetch notifications with no tasks due today', async () => {
    const pastTask = {
      _id: 'task_past',
      authoredOn: moment().subtract(1, 'days').valueOf(),
      state: 'Ready',
      emission: {
        title: 'Past Task',
        contact: { name: 'Owl Phil', _id: 'contact3' },
        dueDate: moment().subtract(1, 'days').format('YYYY-MM-DD')
      }
    };
    rulesEngine.fetchTaskDocsForAllContacts.resolves([pastTask]);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(0);
    expect(dbSyncService.sync.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('no notifications with tasks not in Ready state', async () => {
    const incompleteTask = {
      _id: 'task_draft',
      authoredOn: moment().valueOf(),
      state: 'Draft',
      emission: {
        title: 'Incomplete Task',
        contact: { name: 'Owl Phil', _id: 'contact4' },
        dueDate: moment().add(1, 'days').format('YYYY-MM-DD')
      }
    };
    rulesEngine.fetchTaskDocsForAllContacts.resolves([incompleteTask]);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(0);
    expect(dbSyncService.sync.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should handle errors in fetchNotifications', async () => {
    rulesEngine.fetchTaskDocsForAllContacts.rejects(new Error('Fetch error'));
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(consoleErrorMock.callCount).to.equal(1);
  });

  it('should get() notifications', async () => {
    const notifications = await service.get();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(2);
    expect(dbSyncService.sync.callCount).to.equal(1);
    expect(consoleErrorMock.callCount).to.equal(0);

    notifications.forEach((notification) => {
      assert.property(notification, '_id');
      assert.property(notification, 'authoredOn');
      assert.property(notification, 'state');
      assert.property(notification, 'title');
      assert.property(notification, 'contentText');
      assert.property(notification, 'dueDate');
    });
  });

  it('should handle errors/failed DBsync', async () => {
    dbSyncService.sync.rejects(new Error('DB sync error'));
    const notifications = await service.get();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);
    expect(consoleErrorMock.callCount).to.equal(1);
  });

});
