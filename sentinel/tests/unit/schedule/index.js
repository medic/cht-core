const assert = require('chai').assert;
const sinon = require('sinon');
const rewire = require('rewire');

const config = require('../../../src/config');
const transitionsLib = config.getTransitionsLib();
const reminders = require('../../../src/schedule/reminders');
const replications = require('../../../src/schedule/replications');
const outbound = require('../../../src/schedule/outbound');
const purging = require('../../../src/schedule/purging');
const backgroundCleanup = require('../../../src/schedule/background-cleanup');

let unit;
let clock;
let realSetTimeout;
const nextTick = () => new Promise(resolve => realSetTimeout(() => resolve()));
const oneInterval = 5 * 60 * 1000;

describe('scheduler', () => {
  describe('init', () => {
    beforeEach(() => {
      realSetTimeout = setTimeout;
      clock = sinon.useFakeTimers();
      unit = rewire('../../../src/schedule/index'); // rewire AFTER we fake time setTimeout
      sinon.stub(transitionsLib.dueTasks, 'execute');
      sinon.stub(reminders, 'execute');
      sinon.stub(replications, 'execute');
      sinon.stub(outbound, 'execute');
      sinon.stub(purging, 'execute');
      sinon.stub(backgroundCleanup, 'execute');
    });

    afterEach(() => {
      clearInterval(unit.__get__('interval'));
      clock.restore();
      sinon.restore();
    });

    const assertOngoingTasks = (tasks = []) =>  assert.deepEqual(unit.__get__('ongoingTasks'), new Set(tasks));

    it('should execute all tasks when inited', () => {
      unit.__set__('sendable', sinon.stub().returns(true));
      transitionsLib.dueTasks.execute.resolves();
      reminders.execute.resolves();
      replications.execute.resolves();
      outbound.execute.resolves();
      purging.execute.resolves();
      backgroundCleanup.execute.resolves();
      unit.init();

      assert.equal(unit.__get__('sendable').callCount, 1);
      assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
      assert.equal(reminders.execute.callCount, 1);
      assert.equal(replications.execute.callCount, 1);
      assert.equal(outbound.execute.callCount, 1);
      assert.equal(purging.execute.callCount, 1);
      assert.equal(backgroundCleanup.execute.callCount, 1);
      assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);

      // calling init again does't restart every task when promises weren't resolved
      clock.tick(oneInterval);
      assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
      assert.equal(reminders.execute.callCount, 1);
      assert.equal(replications.execute.callCount, 1);
      assert.equal(outbound.execute.callCount, 1);
      assert.equal(purging.execute.callCount, 1);
      assert.equal(backgroundCleanup.execute.callCount, 1);
      assert.equal(unit.__get__('sendable').callCount, 1);
      assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);

      return nextTick().then(() => {
        // task promises were resolved and everything is cleared
        assertOngoingTasks();
      });
    });

    it('should only execute dueTasks when sendable', () => {
      const sendable = sinon.stub()
        .onCall(0).returns(false)
        .onCall(1).returns(true)
        .onCall(2).returns(false);
      unit.__set__('sendable', sendable);

      transitionsLib.dueTasks.execute.resolves();
      reminders.execute.resolves();
      replications.execute.resolves();
      outbound.execute.resolves();
      purging.execute.resolves();
      backgroundCleanup.execute.resolves();
      unit.init();

      assert.equal(unit.__get__('sendable').callCount, 1);
      assert.equal(transitionsLib.dueTasks.execute.callCount, 0);
      assert.equal(reminders.execute.callCount, 1);
      assert.equal(replications.execute.callCount, 1);
      assert.equal(outbound.execute.callCount, 1);
      assert.equal(purging.execute.callCount, 1);
      assert.equal(backgroundCleanup.execute.callCount, 1);
      assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);

      return nextTick()
        .then(() => {
          // task promises were resolved
          assertOngoingTasks();

          // restart tasks again
          clock.tick(oneInterval);
          assert.equal(unit.__get__('sendable').callCount, 2);
          assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
          assert.equal(reminders.execute.callCount, 2);
          assert.equal(replications.execute.callCount, 2);
          assert.equal(outbound.execute.callCount, 2);
          assert.equal(purging.execute.callCount, 2);
          assert.equal(backgroundCleanup.execute.callCount, 2);
          assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);

          return nextTick();
        })
        .then(() => {
          assertOngoingTasks();
          // restart tasks again
          clock.tick(oneInterval);

          assert.equal(unit.__get__('sendable').callCount, 3);
          assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
          assert.equal(reminders.execute.callCount, 3);
          assert.equal(replications.execute.callCount, 3);
          assert.equal(outbound.execute.callCount, 3);
          assert.equal(purging.execute.callCount, 3);
          assert.equal(backgroundCleanup.execute.callCount, 3);
          assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);
        });
    });

    it('should not restart executing ongoing tasks', () => {
      unit.__set__('sendable', sinon.stub().returns(true));
      // this time, we have lots of due tasks, lots of reminders and lots of background cleanup
      replications.execute.resolves();
      outbound.execute.resolves();
      purging.execute.resolves();

      let dueTasksTaskResolve;
      let remindersTaskResolve;
      let backgroundCleanupTaskResolve;

      transitionsLib.dueTasks.execute
        .onCall(0).callsFake(() => new Promise(resolve => dueTasksTaskResolve = resolve))
        .onCall(1).resolves();
      reminders.execute.callsFake(() => new Promise(resolve => remindersTaskResolve = resolve));
      backgroundCleanup.execute.callsFake(() => new Promise(resolve => backgroundCleanupTaskResolve = resolve));

      unit.init();
      assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);
      assert.equal(unit.__get__('sendable').callCount, 1);
      assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
      assert.equal(reminders.execute.callCount, 1);
      assert.equal(replications.execute.callCount, 1);
      assert.equal(outbound.execute.callCount, 1);
      assert.equal(purging.execute.callCount, 1);
      assert.equal(backgroundCleanup.execute.callCount, 1);

      return nextTick()
        .then(() => {
          assertOngoingTasks(['dueTasks', 'reminders', 'backgroundCleanup']);

          clock.tick(oneInterval);
          assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);
          assert.equal(unit.__get__('sendable').callCount, 1);
          assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
          assert.equal(reminders.execute.callCount, 1);
          assert.equal(replications.execute.callCount, 2);
          assert.equal(outbound.execute.callCount, 2);
          assert.equal(purging.execute.callCount, 2);
          assert.equal(backgroundCleanup.execute.callCount, 1);

          return nextTick();
        })
        .then(() => {
          assertOngoingTasks(['dueTasks', 'reminders', 'backgroundCleanup']);

          // resolve the due tasks task
          dueTasksTaskResolve();
          return nextTick();
        })
        .then(() => {
          // dueTasks task is now not ongoing
          assertOngoingTasks(['reminders', 'backgroundCleanup']);

          clock.tick(oneInterval);
          assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);
          assert.equal(unit.__get__('sendable').callCount, 2);
          assert.equal(transitionsLib.dueTasks.execute.callCount, 2);
          assert.equal(reminders.execute.callCount, 1);
          assert.equal(replications.execute.callCount, 3);
          assert.equal(outbound.execute.callCount, 3);
          assert.equal(purging.execute.callCount, 3);
          assert.equal(backgroundCleanup.execute.callCount, 1);

          remindersTaskResolve();
          return nextTick();
        })
        .then(() => {
          assertOngoingTasks(['backgroundCleanup']);
          backgroundCleanupTaskResolve();
          return nextTick();
        })
        .then(() => {
          assertOngoingTasks();
        });
    });

    it('should catch tasks errors', () => {
      unit.__set__('sendable', sinon.stub().returns(true));
      transitionsLib.dueTasks.execute.rejects({ err: 1 });
      reminders.execute.resolves();
      replications.execute.resolves();
      outbound.execute.rejects({ err: 2 });
      purging.execute.resolves();
      backgroundCleanup.execute.resolves();
      unit.init();

      assert.equal(unit.__get__('sendable').callCount, 1);
      assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
      assert.equal(reminders.execute.callCount, 1);
      assert.equal(replications.execute.callCount, 1);
      assert.equal(outbound.execute.callCount, 1);
      assert.equal(purging.execute.callCount, 1);
      assert.equal(backgroundCleanup.execute.callCount, 1);
      assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);

      return nextTick()
        .then(() => {
          assertOngoingTasks();
          clock.tick(oneInterval);
          assertOngoingTasks(['dueTasks', 'reminders', 'replications', 'outbound', 'purging', 'backgroundCleanup']);
        });
    });
  });

  describe('sendable', () => {

    beforeEach(() => unit = rewire('../../../src/schedule/index')); // rewire and fake timers don't play nice
    afterEach(() => sinon.restore());

    const mockConfigGet = ({
      schedule_morning_hours,
      schedule_morning_minutes,
      schedule_evening_hours,
      schedule_evening_minutes
    }) => {
      sinon.stub(config, 'get')
        .withArgs('schedule_morning_hours').returns(schedule_morning_hours)
        .withArgs('schedule_morning_minutes').returns(schedule_morning_minutes)
        .withArgs('schedule_evening_hours').returns(schedule_evening_hours)
        .withArgs('schedule_evening_minutes').returns(schedule_evening_minutes);
    };

    it('config defaults if empty', () => {
      mockConfigGet({});
      const getDate = sinon.stub(transitionsLib.date, 'getDate');

      getDate.returns('2013-01-01T00:00:00.000');
      assert.equal(unit.__get__('sendable')(), true, '1');

      getDate.returns('2013-01-01T06:00:00.000');
      assert.equal(unit.__get__('sendable')(), true, '2');

      getDate.returns('2013-01-01T23:00:00.000');
      assert.equal(unit.__get__('sendable')(), true, '3');
    });

    it('only sendable within configured hours', () => {
      mockConfigGet({
        schedule_morning_hours: 9,
        schedule_evening_hours: 17
      });
      const getDate = sinon.stub(transitionsLib.date, 'getDate');

      getDate.returns('2013-01-01T01:00:00.000');
      assert.equal(unit.__get__('sendable')(), false, '1');

      getDate.returns('2013-01-01T08:59:59.000');
      assert.equal(unit.__get__('sendable')(), false, '2');

      getDate.returns('2013-01-01T09:00:00.000');
      assert.equal(unit.__get__('sendable')(), true, '3');

      getDate.returns('2013-01-01T12:00:00.000');
      assert.equal(unit.__get__('sendable')(), true, '4');

      getDate.returns('2013-01-01T17:00:00.000');
      assert.equal(unit.__get__('sendable')(), true, '5');

      getDate.returns('2013-01-01T18:00:00.000');
      assert.equal(unit.__get__('sendable')(), false, '6');
    });

    it('only sendable within configured hours and minutes', () => {
      mockConfigGet({
        schedule_morning_hours: 9,
        schedule_morning_minutes: 35,
        schedule_evening_hours: 17,
        schedule_evening_minutes: 1
      });
      const getDate = sinon.stub(transitionsLib.date, 'getDate');

      getDate.returns('2013-01-01T01:00:00.000');
      assert.equal(unit.__get__('sendable')(), false, '1');

      getDate.returns('2013-01-01T09:34:59.000');
      assert.equal(unit.__get__('sendable')(), false, '2');

      getDate.returns('2013-01-01T09:35:00.000');
      assert.equal(unit.__get__('sendable')(), true, '3');

      getDate.returns('2013-01-01T12:11:00.000');
      assert.equal(unit.__get__('sendable')(), true, '4');

      getDate.returns('2013-01-01T17:01:00.000');
      assert.equal(unit.__get__('sendable')(), true, '5');

      getDate.returns('2013-01-01T17:02:00.000');
      assert.equal(unit.__get__('sendable')(), false, '6');
    });
  });

});
