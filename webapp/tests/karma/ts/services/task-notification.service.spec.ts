import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import moment from 'moment';

import { TasksNotificationService } from '@mm-services/task-notifications.service';
import { TranslateService } from '@mm-services/translate.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';

describe('TasksNotificationService', () => {
  let service;
  let consoleErrorMock;
  let translateService;
  let rulesEngine;
  let formatDateService;
  let settingsService;
  let authService;

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
          dueDate: moment().format('YYYY-MM-DD'),
          endDate: moment().add(2, 'days').format('YYYY-MM-DD')
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
          dueDate: moment().format('YYYY-MM-DD'),
          endDate: moment().add(2, 'days').format('YYYY-MM-DD')
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
      },
      {
        _id: 'task3',
        state: 'Ready',
        emission: {
          title: 'Task 2 Due tomorrow',
          contact: { name: 'Owl Phil3', _id: 'contact2' },
          dueDate: moment().add(1, 'days').format('YYYY-MM-DD'),
          endDate: moment().add(2, 'days').format('YYYY-MM-DD')
        },
        stateHistory: [
          {
            state: 'Draft',
            timestamp: moment().subtract(100, 'milliseconds').valueOf()
          },
          {
            state: 'Ready',
            timestamp: moment().add(200, 'milliseconds').valueOf()
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
      has: sinon.stub().withArgs('can_get_task_notifications').resolves(true)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService },
        { provide: RulesEngineService, useValue: rulesEngine },
        { provide: FormatDateService, useValue: formatDateService },
        { provide: SettingsService, useValue: settingsService },
        { provide: AuthService, useValue: authService },
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
    expect(maxNotifications).to.equal(8);
  });

  it('should fetch notifications', async () => {
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.has.lengthOf(3);
    expect(notifications[0]._id).to.equal('task3');
    expect(notifications[1]._id).to.equal('task2');
    expect(notifications[2]._id).to.equal('task1');
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(3);
    expect(consoleErrorMock.callCount).to.equal(0);

    notifications.forEach((notification) => {
      const task = getTask(notification._id);
      expect(notification).to.be.an('object');
      expect(notification).to.eql({
        _id: task._id,
        readyAt: task.stateHistory[1].timestamp,
        title: task.emission.title,
        contentText: 'android.notification.tasks.contentText',
        endDate: moment(task.emission.endDate).valueOf(),
        dueDate: moment(task.emission.dueDate).valueOf()
      });
    });
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

  it('should fetch notifications for future tasks', async () => {
    const futureTask = {
      _id: 'task_future',
      state: 'Ready',
      emission: {
        title: 'Future Task',
        contact: { name: 'Owl Phil Future', _id: 'contact_future' },
        dueDate: moment().add(1, 'days').format('YYYY-MM-DD'),
        endDate: moment().add(2, 'days').format('YYYY-MM-DD')
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
    expect(notifications).to.be.an('array').that.has.lengthOf(1);
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(1);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should handle errors in fetchNotifications', async () => {
    rulesEngine.fetchTaskDocsForAllContacts.rejects(new Error('Fetch error'));
    const notifications = await service.fetchNotifications();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(consoleErrorMock.callCount).to.equal(1);
  });

  it('should not get() notifications without necessary permissions', async () => {
    authService.has.resolves(false);
    const notifications = await service.get();
    expect(notifications).to.be.an('array').that.is.empty;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(0);
    expect(translateService.instant.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should get() notifications', async () => {
    const notifications = await service.get();
    expect(notifications).to.be.an('array').that.has.lengthOf(3);
    expect(authService.has.calledOnceWith('can_get_task_notifications')).to.be.true;
    expect(rulesEngine.fetchTaskDocsForAllContacts.callCount).to.equal(1);
    expect(translateService.instant.callCount).to.equal(3);
    expect(consoleErrorMock.callCount).to.equal(0);
    notifications.forEach((notification) => {
      const task = getTask(notification._id);
      expect(notification).to.be.an('object');
      expect(notification).to.eql({
        _id: task._id,
        readyAt: task.stateHistory[1].timestamp,
        title: task.emission.title,
        contentText: 'android.notification.tasks.contentText',
        endDate: moment(task.emission.endDate).valueOf(),
        dueDate: moment(task.emission.dueDate).valueOf()
      });
    });
  });

});
