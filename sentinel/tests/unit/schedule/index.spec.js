const { assert, expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const later = require('later');
const moment = require('moment');

const scheduling = require('../../../src/lib/scheduling');
const config = require('../../../src/config');
const logger = require('../../../src/lib/logger');
const transitionsLib = config.getTransitionsLib();
const reminders = require('../../../src/schedule/reminders');
const replications = require('../../../src/schedule/replications');
const outbound = require('../../../src/schedule/outbound');
const purgeLib = require('../../../src/lib/purging');
const purging = require('../../../src/schedule/purging');
const backgroundCleanup = require('../../../src/schedule/background-cleanup');

let unit;
let clock;
let realSetTimeout;
const nextTick = (millis) => new Promise(resolve => realSetTimeout(resolve, millis));
const oneInterval = 5 * 60 * 1000;

const ALL_SCHEDULED_TASKS = [
  'dueTasks',
  'reminders',
  'replications',
  'outbound',
  'purging',
  'transitionsDisabledReminder',
  'backgroundCleanup',
];

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
      assertOngoingTasks(ALL_SCHEDULED_TASKS);

      // calling init again does't restart every task when promises weren't resolved
      clock.tick(oneInterval);
      assert.equal(transitionsLib.dueTasks.execute.callCount, 1);
      assert.equal(reminders.execute.callCount, 1);
      assert.equal(replications.execute.callCount, 1);
      assert.equal(outbound.execute.callCount, 1);
      assert.equal(purging.execute.callCount, 1);
      assert.equal(backgroundCleanup.execute.callCount, 1);
      assert.equal(unit.__get__('sendable').callCount, 1);
      assertOngoingTasks(ALL_SCHEDULED_TASKS);

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
      assertOngoingTasks(ALL_SCHEDULED_TASKS);

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
          assertOngoingTasks(ALL_SCHEDULED_TASKS);

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
          assertOngoingTasks(ALL_SCHEDULED_TASKS);
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
      assertOngoingTasks(ALL_SCHEDULED_TASKS);
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
          assertOngoingTasks(ALL_SCHEDULED_TASKS);
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
          assertOngoingTasks(ALL_SCHEDULED_TASKS);
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
      assertOngoingTasks(ALL_SCHEDULED_TASKS);

      return nextTick()
        .then(() => {
          assertOngoingTasks();
          clock.tick(oneInterval);
          assertOngoingTasks(ALL_SCHEDULED_TASKS);
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

  // Regression test to prevent again jobs launched 1 sec before time
  // to NOT being skipped (https://github.com/medic/cht-core/issues/6634)
  describe('Scheduling without gaps', () => {

    let initMoment;
    let purgeMoment;

    // Difference in seconds without taking into account milliseconds
    const secondsDiff = (moment1, moment2) => {
      return moment1.milliseconds(0).diff(moment2.milliseconds(0), 'seconds');
    };

    beforeEach(() => {
      realSetTimeout = setTimeout;
      // default value in the past so if purge is never called because an
      // unexpected error the math used on this variable will fail
      purgeMoment = moment().subtract(10, 'seconds');
      unit = rewire('../../../src/schedule/index'); // rewire AFTER we fake time setTimeout
      sinon.stub(transitionsLib.dueTasks, 'execute').resolves();
      sinon.stub(reminders, 'execute').resolves();
      sinon.stub(replications, 'execute').resolves();
      sinon.stub(outbound, 'execute').resolves();
      sinon.stub(backgroundCleanup, 'execute').resolves();

      sinon.stub(purgeLib, 'purge').callsFake(() => {
        purgeMoment = moment();
        logger.debug('Purge time: %s', purgeMoment);
      });
    });

    afterEach(() => {
      clearInterval(unit.__get__('interval'));
      sinon.restore();
    });

    it('should not skip job when time is milliseconds before schedule and should launch before next one', () => {
      sinon.stub(scheduling, 'getSchedule')
        .returns(later.parse.cron('*/2 * * * * *', true));  // each 2 seconds, even seconds
      let wait = 0;
      const now = moment();
      if (now.seconds() % 2 === 0) {  // if seconds of the current time has even seconds (e.g. 32)
        wait = 1000;                  // wait 1 second until an odd second is reached    (e.g. 33)
      }
      return nextTick(wait)
        .then(() => {
          // now time has odd seconds + some milliseconds ahead
          initMoment = moment();
          logger.debug('Init time: %s', now);
          unit.init();
        })
        .then(() => nextTick(2200))
        .then(() => {
          // because scheduling was calculated just milliseconds BEFORE of the first
          // schedule, a purge job was launched on time (the next second `init()`
          // was called regardless of the difference in milliseconds)
          expect(secondsDiff(purgeMoment, initMoment)).to.equal(1);
          // actual execution time will vary, but the execution should happen
          // in a even second because the job was launched on time
          expect(purgeMoment.seconds() % 2 === 0).to.be.true;
        });
    }).timeout(4000).slow(2400);  // should be less, but just in case

    it('should not skip job when time is milliseconds ahead schedule and should launch within the same second', () => {
      sinon.stub(scheduling, 'getSchedule')
        .returns(later.parse.cron('*/2 * * * * *', true));  // each 2 seconds, even seconds
      let wait = 0;
      const now = moment();
      if (now.seconds() % 2 === 1) {  // if seconds of the current time has odd seconds (e.g. 31)
        wait = 1000;                  // wait 1 second until an even second is reached  (e.g. 32)
      }
      return nextTick(wait)
        .then(() => {
          // now time has even seconds + some milliseconds ahead
          initMoment = moment();
          logger.debug('Init time: %s', now);
          unit.init();
        })
        .then(() => nextTick(2200))
        .then(() => {
          // because scheduling was calculated just milliseconds AHEAD of the first
          // schedule, a purge job was launched just milliseconds ahead, and depending
          // of machine workload, time will vary, but the execution should happen
          // within the same second or next second, and before the next even second
          expect(secondsDiff(purgeMoment, initMoment) < 2).to.be.true;
          // If milliseconds from initMoment where to close to 1000, the second
          // when the purgeMoment happen may or may not be even, the only warranty
          // is that the schedule was executed and before the next schedule
        });
    }).timeout(4000).slow(2400);  // should be less, but just in case

  });
});
