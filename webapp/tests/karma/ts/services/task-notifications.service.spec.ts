import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import moment from 'moment';

import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { TasksNotificationService } from '@mm-services/task-notifications.service';
import { TranslateService } from '@mm-services/translate.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';
import { DbService } from '@mm-services/db.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

describe('TasksNotificationService', () => {
  let service;
  let consoleErrorMock;
  let translateService;
  let rulesEngine;
  let formatDateService;
  let settingsService;
  let authService;
  let http;
  let changesService;
  let sessionService;

  let tasks;
  let clock;
  const getTask = (id: string) => tasks.find((task) => task._id === id);

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');
    clock = sinon.useFakeTimers(moment().valueOf());
    tasks = [
      {
        _id: 'task1',
        state: 'Ready',
        emission: {
          title: 'Task 1',
          contact: { name: 'Owl Phil', _id: 'contact1' },
          dueDate: moment().format('YYYY-MM-DD')
        },
        stateHistory: [
          {
            state: 'Draft',
            timestamp: moment().subtract(100, 'milliseconds').valueOf()
          },
          {
            state: 'Ready',
            timestamp: moment().valueOf()
          }
        ],

      },
      {
        _id: 'task2',
        state: 'Ready',
        emission: {
          title: 'Task 2',
          contact: { name: 'Owl Phil2', _id: 'contact2' },
          dueDate: moment().format('YYYY-MM-DD')
        },
        stateHistory: [
          {
            state: 'Draft',
            timestamp: moment().subtract(100, 'milliseconds').valueOf()
          },
          {
            state: 'Ready',
            timestamp: moment().add(100, 'milliseconds').valueOf()
          }
        ],
      }
    ];
    rulesEngine = {
      fetchTaskDocsForAllContacts: sinon.stub().resolves(tasks),
      isEnabled: sinon.stub().resolves(true),
    };

    translateService = {
      instant: sinon.stub().returnsArg(0),
    };

    formatDateService = {
      relative: sinon.stub().returnsArg(0),
    };

    settingsService = {
      get: sinon.stub().resolves({}),
    };

    authService = {
      has: sinon.stub().resolves()
    };
    http = { get: sinon.stub().returns(of([])) };
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    sessionService = { userCtx: sinon.stub(), isOnlineOnly: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService },
        { provide: RulesEngineService, useValue: rulesEngine },
        { provide: FormatDateService, useValue: formatDateService },
        { provide: SettingsService, useValue: settingsService },
        { provider: AuthService, useValue: authService },
        { provide: ChangesService, useValue: changesService },
        { provide: DbService, useValue: { get: sinon.stub().resolves({}) } },
        { provide: HttpClient, useValue: http },
        { provide: SessionService, useValue: sessionService },
      ]
    });
    service = TestBed.inject(TasksNotificationService);
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).to.be.ok;
  });

  it('should initialize max notifications value from settings', async () => {
    settingsService.get.resolves({
      tasks: {
        max_task_notifications: 20
      }
    });
    const maxNotifications = await service.getMaxNotificationSettings();
    expect(settingsService.get.callCount).to.equal(1);
    expect(maxNotifications).to.equal(20);
  });

  it('should return default max notifications value if settings value is not valid', async () => {
    settingsService.get.resolves({ max_task_notifications: '2o' });
    const maxNotifications = await service.getMaxNotificationSettings();
    expect(settingsService.get.callCount).to.equal(1);
    expect(maxNotifications).to.equal(10);
  });

  it('should fetch notifications', async () => {
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);
    expect(notifications[0]._id).to.equal('task2');
    expect(notifications[1]._id).to.equal('task1');
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(2);
    expect(consoleErrorMock.callCount).to.equal(0);

    notifications.forEach((notification) => {
      const task = getTask(notification._id);
      expect(notification).to.be.an('object');
      expect(notification).to.eql({
        _id: task._id,
        readyAt: task.stateHistory[1].timestamp,
        title: task.emission.title,
        contentText: 'android.notification.tasks.contentText',
        dueDate: task.emission.dueDate
      });
    });
  });

  it('should return max number of notifications', async () => {
    settingsService.get.resolves({
      tasks: {
        max_task_notifications: 1
      }
    });
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(1);
    expect(notifications[0]._id).to.equal('task2');
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
      state: 'Ready',
      emission: {
        title: 'Task 3',
        contact: { name: 'Owl Phil3', _id: 'contact3' },
        dueDate: moment().format('YYYY-MM-DD')
      },
      stateHistory: [
        {
          state: 'Ready',
          timestamp: moment().add(120, 'milliseconds').valueOf(),
        }
      ]
    };
    rulesEngine.fetchTaskDocsForAllContacts.resolves([...tasks, newTask]);
    const updatedNotifications = await service.fetchNotifications();
    expect(updatedNotifications).to.be.an('array').that.has.lengthOf(1);
    expect(updatedNotifications[0]._id).to.equal(newTask._id);
  });

  it('should return task notification due today on a new day', async () => {
    const taskDueTomorrow = {
      _id: 'task_tomorrow',
      state: 'Ready',
      emission: {
        title: 'Task 3',
        contact: { name: 'Future Owl', _id: 'contact_future' },
        dueDate: moment().add(1, 'day').format('YYYY-MM-DD')
      },
      stateHistory: [
        {
          state: 'Ready',
          timestamp: moment().subtract(1, 'day').valueOf(),
        }
      ]
    };

    rulesEngine.fetchTaskDocsForAllContacts.resolves([...tasks, taskDueTomorrow]);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);

    clock.tick(DAY_IN_MS);

    const updatedNotifications = await service.fetchNotifications();
    expect(updatedNotifications).to.be.an('array').that.has.lengthOf(3);
  });

  it('should return empty array if rules engine is disabled', async () => {
    rulesEngine.isEnabled.resolves(false);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(0);
    expect(translateService.instant.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should fetch notifications with no tasks ready', async () => {
    rulesEngine.fetchTaskDocsForAllContacts.resolves([]);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should fetch notifications for overdue tasks', async () => {
    const pastTask = {
      _id: 'task_past',
      state: 'Ready',
      emission: {
        title: 'Past Task',
        contact: { name: 'Owl Phil', _id: 'contact3' },
        dueDate: moment().subtract(1, 'days').format('YYYY-MM-DD')
      },
      stateHistory: [
        {
          state: 'Ready',
          timestamp: moment().subtract(1, 'days').valueOf(),
        }
      ]
    };
    rulesEngine.fetchTaskDocsForAllContacts.resolves([pastTask]);
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(1);
    expect(notifications[0]._id).to.eql(pastTask._id);
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(1);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should not fetch notifications for future tasks', async () => {
    const futureTask = {
      _id: 'task_future',
      state: 'Ready',
      emission: {
        title: 'Future Task',
        contact: { name: 'Owl Phil Future', _id: 'contact_future' },
        dueDate: moment().add(1, 'days').format('YYYY-MM-DD')
      },
      stateHistory: [
        {
          state: 'Ready',
          timestamp: moment().subtract(1, 'days').valueOf(),
        }
      ]
    };
    rulesEngine.fetchTaskDocsForAllContacts.resolves([futureTask]);

    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(0);
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should handle errors in fetchNotifications', async () => {
    rulesEngine.fetchTaskDocsForAllContacts.rejects(new Error('Fetch error'));
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(consoleErrorMock.callCount).to.equal(1);
  });

  it('should not get() notifications without necessary permissions', async () => {
    sessionService.userCtx.returns({ roles: ['chw'] });
    settingsService.get.resolves({
      permissions: {
        can_get_task_notifications: ['supervisor']
      },
    });
    const notifications = await service.get();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(0);
    expect(translateService.instant.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should get() notifications', async () => {
    sessionService.userCtx.returns({ roles: ['chw'] });
    settingsService.get.resolves({
      permissions: {
        can_get_task_notifications: ['chw']
      },
    });
    const notifications = await service.get();
    expect(notifications).to.be.an('array').that.has.lengthOf(2);
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(2);
    expect(consoleErrorMock.callCount).to.equal(0);

    notifications.forEach((notification) => {
      const task = getTask(notification._id);
      expect(notification).to.be.an('object');
      expect(notification).to.eql({
        _id: task._id,
        readyAt: task.stateHistory[1].timestamp,
        title: task.emission.title,
        contentText: 'android.notification.tasks.contentText',
        dueDate: task.emission.dueDate
      });
    });
  });

});
