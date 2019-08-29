const config = require('../../../src/config');
config.initTransitionLib();

const moment = require('moment');
const sinon = require('sinon');
const assert = require('chai').assert;
const rewire = require('rewire');
const db = require('../../../src/db');
const later = require('later');
let reminders;
let clock;

describe('reminders', () => {
  afterEach(() => {
    sinon.restore();
    clock.restore();
  });
  beforeEach(() => {
    process.env.TEST_ENV = true;
    clock = sinon.useFakeTimers();
    reminders = rewire('../../../src/schedule/reminders');
  });


  describe('execute', () => {
    it('config with no reminders calls callback', done => {
      sinon.stub(config, 'get').returns([]);
      reminders.__set__('runReminder', sinon.stub().rejects());
      reminders.execute(err => {
        assert.equal(err, null);
        assert.equal(reminders.__get__('runReminder').callCount, 0);
        done();
      });
    });

    it('should run every valid reminder, in sequence', () => {
      const isConfigValid = sinon.stub().callsFake(c => c.valid);
      const runReminder = sinon.stub().resolves();
      reminders.__set__('isConfigValid', isConfigValid);
      reminders.__set__('runReminder', runReminder);
      sinon.stub(config, 'get').returns([
        { form: 'a', valid: true },
        { form: 'b', valid: false },
        { form: 'c', valid: true },
        { form: 'd', valid: true },
      ]);

      reminders.execute(err => {
        assert.equal(err, null);
        assert.equal(isConfigValid.callCount, 4);
        assert.equal(runReminder.callCount, 3);
        assert.deepEqual(runReminder.args, [[{ form: 'a', valid: true }],[{ form: 'c', valid: true }],[{ form: 'd', valid: true }]]);
      });
    });

    it('should throw errors', () => {
      reminders.__set__('isConfigValid', sinon.stub().returns(true));
      const runReminder = sinon.stub().resolves();
      runReminder.withArgs(2).rejects({ some: 'err' });
      reminders.__set__('runReminder', runReminder);
      sinon.stub(config, 'get').returns([1, 2, 3, 4]);

      reminders.execute(err => {
        assert.deepEqual(err, { some: 'err' });
        assert.equal(reminders.__get__('isConfigValid').callCount, 2);
        assert.equal(runReminder.callCount, 2);
        assert.deepEqual(runReminder.args, [[1], [2]]);
      });
    });
  });

  describe('isConfigValid', () => {
    let isConfigValid;
    beforeEach(() => {
      isConfigValid = reminders.__get__('isConfigValid');
    });

    it('should return false for falsy config', () => {
      assert.equal(isConfigValid(), false);
      assert.equal(isConfigValid(false), false);
    });

    it('should return false for invalid configs', () => {
      assert.equal(isConfigValid({}), false);
      assert.equal(isConfigValid({ form: 'test' }), false);
      assert.equal(isConfigValid({ form: 'test', message: 'aaa' }), false);
      assert.equal(isConfigValid({ form: 'test', message: 'aaa', text_expression: false }), false);
      assert.equal(isConfigValid({ form: 'test', translation_key: '', cron: 'bbbb' }), false);
      assert.equal(isConfigValid({ message: 'aaa' }), false);
      assert.equal(isConfigValid({ cron: 'aaa' }), false);
    });

    it('should return true for valid configs', () => {
      assert.equal(isConfigValid({ form: 'a', message: 'b', cron: 'c' }), true);
      assert.equal(isConfigValid({ form: 'a', message: 'b', text_expression: 'c' }), true);
      assert.equal(isConfigValid({ form: 'a', translation_key: 'o', cron: 'c' }), true);
      assert.equal(isConfigValid({ form: 'a', translation_key: 'o', text_expression: 'c' }), true);
    });
  });

  describe('getSchedule', () => {
    let getSchedule;
    beforeEach(() => {
      sinon.stub(later, 'schedule');
      sinon.stub(later.parse, 'text');
      sinon.stub(later.parse, 'cron');
      getSchedule = reminders.__get__('getSchedule');
    });
    it('should do nothing for empty config', () => {
      assert.equal(getSchedule(), undefined);
      assert.equal(later.schedule.callCount, 0);
      assert.equal(later.parse.text.callCount, 0);
      assert.equal(later.parse.cron.callCount, 0);
    });

    it('should return schedule for cron', () => {
      later.parse.cron.returns('parsed cron');
      later.schedule.returns('schedule');
      assert.equal(getSchedule({ cron: 'something' }), 'schedule');
      assert.equal(later.parse.cron.callCount, 1);
      assert.deepEqual(later.parse.cron.args[0], ['something']);
      assert.equal(later.parse.text.callCount, 0);
      assert.equal(later.schedule.callCount, 1);
      assert.deepEqual(later.schedule.args[0], ['parsed cron']);
    });

    it('should return schedule for text_expression', () => {
      later.parse.text.returns('parsed expression');
      later.schedule.returns('schedule');
      assert.equal(getSchedule({ text_expression: 'other' }), 'schedule');
      assert.equal(later.parse.text.callCount, 1);
      assert.deepEqual(later.parse.text.args[0], ['other']);
      assert.equal(later.parse.cron.callCount, 0);
      assert.equal(later.schedule.callCount, 1);
      assert.deepEqual(later.schedule.args[0], ['parsed expression']);
    });

    it('should prioritize text_expression', () => {
      later.parse.text.returns('parsed expression');
      later.schedule.returns('schedule');
      assert.equal(getSchedule({ text_expression: 'text', cron: 'cron'}), 'schedule');
      assert.equal(later.parse.text.callCount, 1);
      assert.deepEqual(later.parse.text.args[0], ['text']);
      assert.equal(later.parse.cron.callCount, 0);
      assert.equal(later.schedule.callCount, 1);
      assert.deepEqual(later.schedule.args[0], ['parsed expression']);
    });
  });

  describe('runReminder', () => {
    let runReminder;
    beforeEach(() => {
      runReminder = reminders.__get__('runReminder');
    });
    it('should call sendReminder when valid', () => {
      const date = moment();
      const reminder = { form: 'a' };
      reminders.__set__('matchReminder', sinon.stub().resolves(date));
      reminders.__set__('sendReminders', sinon.stub().resolves());

      return runReminder(reminder).then(() => {
        assert.equal(reminders.__get__('matchReminder').callCount, 1);
        assert.deepEqual(reminders.__get__('matchReminder').args[0], [reminder]);
        assert.equal(reminders.__get__('sendReminders').callCount, 1);
        assert.deepEqual(reminders.__get__('sendReminders').args[0], [{ reminder, date }]);
      });
    });

    it('should not call sendReminder when no match', () => {
      const reminder = { form: 'a' };
      reminders.__set__('matchReminder', sinon.stub().resolves(false));
      reminders.__set__('sendReminders', sinon.stub());

      return runReminder(reminder).then(() => {
        assert.equal(reminders.__get__('matchReminder').callCount, 1);
        assert.equal(reminders.__get__('sendReminders').callCount, 0);
      });
    });
  });

  describe('matchReminder', () => {
    let matchReminder;
    const oneDay = 60 * 60 * 24 * 1000;
    const oneHour = 60 * 60 * 1000;
    beforeEach(() => {
      matchReminder = reminders.__get__('matchReminder');
      sinon.stub(db.medic, 'allDocs');
    });
    it('should return false if no schedule', () => {
      const schedule = { prev: sinon.stub()};
      const reminder = { text_expression: 'none', form: 'formA' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      db.medic.allDocs.resolves({ rows: [] });
      clock.tick(oneDay);

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0], [{
          descending: true,
          limit: 1,
          startkey: `reminder:formA:${oneDay}:\ufff0`,
          endkey: `reminder:formA:0:`
        }]);
      });
    });

    it('should query allDocs with correct keys', () => {
      const schedule = { prev: sinon.stub()};
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      db.medic.allDocs.resolves({ rows: [] });
      const now =  oneDay + oneHour + oneHour / 2;
      const since = now - oneHour/2 - oneDay;
      clock.tick(now);

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0], [{
          descending: true,
          limit: 1,
          startkey: `reminder:formB:${now}:\ufff0`,
          endkey: `reminder:formB:${since}:`
        }]);
        assert.equal(schedule.prev.callCount, 1);
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(since).toDate()]);
      });
    });

    it('should return false if no schedule in time interval', () => {
      const schedule = { prev: sinon.stub().returns(0) };
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      clock.tick(oneDay);
      const lastSchedule = oneDay / 2;
      db.medic.allDocs.resolves({ rows: [{ id: `reminder:formB:${lastSchedule}` }] });

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.equal(schedule.prev.callCount, 1);
        assert.deepEqual(schedule.prev.args[0], [1, moment(oneDay).toDate(), moment(lastSchedule).toDate()]);
      });
    });

    it('should return correct prev schedule', () => {
      const prevSchedule = new Date(oneDay + oneHour);
      const schedule = { prev: sinon.stub().returns(prevSchedule) };
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      const now = oneDay + oneDay / 2;
      const lastReminder = oneDay + 2 * oneHour;
      clock.tick(now);
      db.medic.allDocs.resolves({ rows: [{ id: `reminder:formB:${lastReminder}` }]});

      return matchReminder(reminder).then(result => {
        assert.deepEqual(result, moment(prevSchedule));
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(lastReminder).toDate()]);
      });
    });

    it('should return correct prev schedule when no results', () => {
      const prevSchedule = new Date(oneDay/3);
      const schedule = { prev: sinon.stub().returns(prevSchedule) };
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      const now = oneDay + oneDay / 2;
      clock.tick(now);
      db.medic.allDocs.resolves({ rows: [] });

      return matchReminder(reminder).then(result => {
        assert.deepEqual(result, moment(prevSchedule));
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(oneDay / 2).toDate()]);
      });
    });
  });
});

/*
describe('reminders', () => {












  it('matches reminder with moment if in last hour', done => {
    var ts = moment().startOf('hour');
    sinon.stub(reminders, 'getReminderWindow').callsArgWithAsync(1, null, moment().subtract(1, 'hour'));

    reminders.matchReminder({
      reminder: {
        cron: moment().format('0 HH * * *') // will generate cron job matching the current hour
      }
    }, function(err, matches) {
      assert.equal(err, null);
      assert(matches);
      assert.equal(matches.valueOf(), ts.valueOf());
      done();
    });
  });

  it('runReminder decorates options with moment if found', done => {
    const now = moment();
    sinon.stub(reminders, 'matchReminder').callsArgWith(1, null, now);
    const sendReminders = sinon.stub(reminders, 'sendReminders').callsArgWith(1, null);
    reminders.runReminder({}, function() {
      var moment = sendReminders.getCall(0).args[0].moment;
      assert(moment);
      assert.equal(moment.valueOf(), now.valueOf());
      done();
    });
  });

  it('does not match reminder if in next minute', done => {
    const past = moment().subtract(1, 'hour');
    const now = moment();
    sinon.stub(reminders, 'getReminderWindow').callsArgWithAsync(1, null, past);
    reminders.matchReminder({
      reminder: {
        // generate cron job 1 minute into future
        cron: now.clone().add(1, 'minute').format('m HH * * *')
      }
    }, function(err, matches) {
      assert.equal(err, null);
      assert.equal(matches, false);
      done();
    });
  });

  it('does not match if previous to reminder', () => {
    var now = moment().subtract(2, 'hours');
    sinon.stub(reminders, 'getReminderWindow').callsArgWithAsync(1, null, moment().subtract(1, 'hour'));

    reminders.matchReminder({
      reminder: {
        cron: now.format('59 HH * * *') // will generate cron job matching the previous hour
      }
    }, function(err, matches) {
      assert.equal(err, null);
      assert.equal(matches, false);
    });
  });

  it('sendReminders calls getLeafPlaces', done => {
    const getLeafPlaces = sinon.stub(reminders, 'getLeafPlaces').callsArgWith(1, null, []);

    reminders.sendReminders({}, function(err) {
      assert(getLeafPlaces.called);
      assert.equal(err, null);
      done();
    });
  });

  it('getLeafPlaces calls db view and hydrates docs', done => {
    sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [ { doc: { id: 'xxx' } } ]
    });
    sinon.stub(config, 'get').returns([
      { id: 'person', person: true, parents: [ 'clinic' ] },     // not queried because we send reminders only to places
      { id: 'clinic', parents: [ 'health_center' ] },            // queried
      { id: 'health_center', parents: [ 'district_hospital' ] }, // not queried because its not a leaf
      { id: 'district_hospital' }
    ]);
    sinon.stub(reminders._lineage, 'hydrateDocs').resolves([{ id: 'xxx', contact: 'maria' }]);

    reminders.getLeafPlaces({ reminder: {} }, function(err, clinics) {
      assert(_.isArray(clinics));
      assert.equal(clinics.length, 1);
      assert.deepEqual(clinics, [{ id: 'xxx', contact: 'maria' }]);
      assert.equal(db.medic.query.callCount, 1);
      assert.equal(db.medic.query.args[0][0], 'medic-client/contacts_by_type');
      assert.deepEqual(db.medic.query.args[0][1].keys, [[ 'clinic' ]]);
      assert.equal(reminders._lineage.hydrateDocs.callCount, 1);
      assert.deepEqual(reminders._lineage.hydrateDocs.args[0], [[{ id: 'xxx' }]]);
      done();
    });
  });

  it('getLeafPlaces ignores clinics with matching sent_reminders', done => {
    const now = moment().startOf('hour');

    sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [
        {
          doc: {
            id: 'xxx'
          }
        },
        {
          doc: {
            id: 'yyx',
            tasks: [
              {
                form: 'XXX',
                timestamp: now.toISOString()
              }
            ]
          }
        },
        {
          doc: {
            id: 'yyy',
            tasks: [
              {
                form: 'YYY',
                timestamp: now.toISOString()
              }
            ]
          }
        },
        {
          doc: {
            id: 'yyz',
            tasks: [
              {
                form: 'XXX',
                timestamp: now.clone().add(1, 'hour').toISOString()
              }
            ]
          }
        }
      ]
    });

    reminders.getLeafPlaces({
      reminder:{
        moment: now,
        form: 'XXX'
      }
    }, function(err, clinics) {
      var ids = _.pluck(clinics, 'id');
      assert.deepEqual(['xxx', 'yyy', 'yyz'], ids);
      done();
    });
  });

  it('sendReminders calls sendReminder for each clinic', done => {
    const clinics = [
      {
        id: 'xxx'
      },
      {
        id: 'yyy'
      }
    ];
    sinon.stub(reminders, 'getLeafPlaces').callsArgWith(1, null, clinics);
    const sendReminder = sinon.stub(reminders, 'sendReminder').callsArgWithAsync(1, null);
    reminders.sendReminders({}, function() {
      assert.equal(sendReminder.callCount, 2);
      done();
    });
  });

  it('sendReminder saves doc with added task to clinic, minifies doc first', done => {
    const now = moment();
    const saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null);
    sinon.spy(reminders._lineage, 'minify');
    reminders.sendReminder({
      clinic: {
        contact: {
          _id: 'contact',
          phone: '+1234'
        }
      },
      reminder: {
        form: 'XXX',
        message: 'hi {{year}} {{week}}'
      },
      moment: now,
      db: db
    }, function() {
      assert(saveDoc.called);

      const clinic = saveDoc.getCall(0).args[0];
      assert(clinic.tasks);

      const task = _.first(clinic.tasks);
      const message = _.first(task.messages);
      assert.equal(message.to, '+1234');
      const year = now.format('YYYY');
      const week = now.format('w');
      assert.equal(message.message, `hi ${year} ${week}`);
      assert.equal(task.form, 'XXX');
      assert.equal(task.type, 'reminder');
      assert.equal(task.timestamp, now.toISOString());
      assert.deepEqual(clinic.contact, { _id: 'contact'});
      assert.equal(reminders._lineage.minify.callCount, 1);
      done();
    });
  });

  it('canSend returns true if no tasks matching reminder', () => {
    const now = moment();
    const canSend = reminders.canSend({
      reminder: {
        form: 'XXX'
      },
      moment: now
    }, {
      tasks: [
        {
          form: 'XXX',
          timestamp: now.clone().add(1, 'minute').toISOString()
        },
        {
          form: 'XXY',
          timestamp: now.toISOString()
        }
      ]
    });

    assert.equal(canSend, true);
  });

  it('canSend returns false if a task matches reminder', () => {
    const now = moment();
    const canSend = reminders.canSend({
      reminder: {
        form: 'XXX'
      },
      moment: now
    }, {
      tasks: [
        {
          form: 'XXX',
          timestamp: now.toISOString()
        },
        {
          form: 'XXY',
          timestamp: now.toISOString()
        }
      ]
    });

    assert.equal(canSend, false);
  });

  it('canSend returns false if a sent_forms within lockout period of reminder', () => {
    const now = moment();
    const canSend = reminders.canSend({
      reminder: {
        form: 'XXX',
        mute_after_form_for: '3 days'
      },
      moment: now
    }, {
      sent_forms: {
        XXX: now.clone().subtract(2, 'days').toISOString()
      },
      tasks: []
    });

    assert.equal(canSend, false);
  });

  it('canSend returns true if a sent_forms outside of lockout period of reminder', () => {
    const now = moment();
    const canSend = reminders.canSend({
      reminder: {
        form: 'XXX',
        mute_after_form_for: '3 days'
      },
      moment: now
    }, {
      sent_forms: {
        XXX: now.clone().subtract(3, 'days').subtract(1, 'minute').toISOString()
      },
      tasks: []
    });

    assert.equal(canSend, true);
  });

  it('getReminderWindow returns a day ago when no results from db', done => {
    const time = moment().startOf('hour').subtract(1, 'day');
    sinon.stub(db.medic, 'query').callsArgWith(2, null, {rows: []});

    reminders.getReminderWindow({}, function(err, start) {
      assert.equal(err, null);
      assert(start);
      assert.equal(start.valueOf(), time.valueOf());
      done();
    });
  });

  it('getReminderWindow calls view looking for old events and returns date found', done => {
    const now = moment();

    var view = sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [
        {
          key: [ 'XXX', now.clone().subtract(1, 'hour').toISOString() ]
        }
      ]
    });

    reminders.getReminderWindow({
      reminder: {
        form: 'XXX'
      }
    }, function(err, start) {
      const call = view.getCall(0);
      const viewOpts = call.args[1];

      assert.equal(view.callCount, 1);
      assert.equal(call.args[0], 'medic-sms/sent_reminders');

      assert.equal(viewOpts.limit, 1);
      assert(viewOpts.startkey);
      assert.equal(viewOpts.startkey[0], 'XXX');

      // time within 1000ms
      assert.deepEqual(Math.floor(moment(viewOpts.startkey[1]).valueOf() / 1000), Math.floor(moment().valueOf() / 1000));

      assert.deepEqual(viewOpts.endkey, ['XXX', now.clone().startOf('hour').subtract(1, 'day').toISOString()]);
      assert.equal(viewOpts.descending, true);
      assert.equal(start.toISOString(), now.clone().subtract(1, 'hour').toISOString());
      done();
    });
  });
});
*/
