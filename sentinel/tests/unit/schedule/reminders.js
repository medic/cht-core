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

const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;

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

    it('should run every valid reminder, in sequence', (done) => {
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
        done();
      });
    });

    it('should throw errors', (done) => {
      reminders.__set__('isConfigValid', sinon.stub().returns(true));
      const runReminder = sinon.stub().resolves();
      runReminder.withArgs(2).rejects({ some: 'err' });
      reminders.__set__('runReminder', runReminder);
      sinon.stub(config, 'get').returns([1, 2, 3, 4]);

      reminders.execute(err => {
        assert.deepEqual(err, { some: 'err' });
        assert.equal(reminders.__get__('isConfigValid').callCount, 4);
        assert.equal(runReminder.callCount, 2);
        assert.deepEqual(runReminder.args, [[1], [2]]);
        done();
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
    it('should call sendReminder when valid and create log', () => {
      const date = moment(1230);
      const reminder = { form: 'formA', some: 'config' };
      reminders.__set__('matchReminder', sinon.stub().resolves(date));
      reminders.__set__('sendReminders', sinon.stub().resolves());
      sinon.stub(db.sentinel, 'put').resolves();
      clock.tick(1260);

      return runReminder(reminder).then(() => {
        assert.equal(reminders.__get__('matchReminder').callCount, 1);
        assert.deepEqual(reminders.__get__('matchReminder').args[0], [reminder]);
        assert.equal(reminders.__get__('sendReminders').callCount, 1);
        assert.deepEqual(reminders.__get__('sendReminders').args[0], [reminder, date]);
        assert.equal(db.sentinel.put.callCount, 1);
        assert.deepEqual(db.sentinel.put.args[0], [{ _id: 'reminderlog:formA:1230', reminder, reported_date: 1260 }]);
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
    beforeEach(() => {
      matchReminder = reminders.__get__('matchReminder');
      sinon.stub(db.sentinel, 'allDocs');
    });
    it('should return false if no schedule', () => {
      const schedule = { prev: sinon.stub()};
      const reminder = { text_expression: 'none', form: 'formA' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      db.sentinel.allDocs.resolves({ rows: [] });
      clock.tick(oneDay);

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{
          descending: true,
          limit: 1,
          startkey: `reminderlog:formA:${oneDay}`,
          endkey: `reminderlog:formA:0`
        }]);
      });
    });

    it('should query allDocs with correct keys', () => {
      const schedule = { prev: sinon.stub()};
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      db.sentinel.allDocs.resolves({ rows: [] });
      const now =  oneDay + oneHour + oneHour / 2;
      const since = now - oneHour/2 - oneDay;
      clock.tick(now);

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{
          descending: true,
          limit: 1,
          startkey: `reminderlog:formB:${now}`,
          endkey: `reminderlog:formB:${since}`
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
      db.sentinel.allDocs.resolves({ rows: [{ id: `reminderlog:formB:${lastSchedule}` }] });

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.sentinel.allDocs.callCount, 1);
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
      db.sentinel.allDocs.resolves({ rows: [{ id: `reminderlog:formB:${lastReminder}` }]});

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
      db.sentinel.allDocs.resolves({ rows: [] });

      return matchReminder(reminder).then(result => {
        assert.deepEqual(result, moment(prevSchedule));
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(oneDay / 2).toDate()]);
      });
    });

    it('matches reminder with moment if in last hour', () => {
      clock.tick(oneDay);
      const ts = moment().startOf('hour');
      reminders.__set__('getReminderWindow', sinon.stub().resolves(moment().subtract(1, 'hour')));

      return matchReminder({ cron: moment().format('0 HH * * *')})
        // will generate cron job matching the current hour
        .then(matches => {
          assert(matches);
          assert.equal(matches.valueOf(), ts.valueOf());
        });
    });

    it('does not match reminder if in next minute', () => {
      clock.tick(oneDay);
      const past = moment().subtract(1, 'hour');
      const now = moment();
      reminders.__set__('getReminderWindow', sinon.stub().resolves(past));
      return matchReminder({  cron: now.clone().add(1, 'minute').format('m HH * * *') })
        // generate cron job 1 minute into future
        .then(matches => {
          assert.equal(matches, false);
        });
    });

    it('does not match if previous to reminder', () => {
      clock.tick(oneDay);
      const now = moment().subtract(2, 'hours');
      reminders.__set__('getReminderWindow', sinon.stub().resolves( moment().subtract(1, 'hour')));

      return matchReminder({ cron: now.format('59 HH * * *')}).then(matches => {
        // will generate cron job matching the previous hour
        assert.equal(matches, false);
      });
    });

    it('getReminderWindow returns a day ago when no results from db', () => {
      const time = moment().startOf('hour').subtract(1, 'day');
      db.sentinel.allDocs.resolves({ rows: [] });

      return reminders.__get__('getReminderWindow')({}).then(start => {
        assert(start);
        assert.equal(start.valueOf(), time.valueOf());
      });
    });

    it('getReminderWindow calls view looking for old events and returns date found', () => {
      const now = moment();
      db.sentinel.allDocs.resolves({ rows: [{
        id: `reminderlog:XXX:${now.clone().subtract(1, 'hour').valueOf()}`
        }] });

      return reminders.__get__('getReminderWindow')({ form: 'XXX'}).then(start => {
        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0][0], {
          descending: true,
          limit: 1,
          startkey: `reminderlog:XXX:${Math.floor(moment().valueOf() / 1000)}`,
          endkey: `reminderlog:XXX:${now.clone().startOf('hour').subtract(1, 'day').valueOf()}`
        });
        assert.equal(start.toISOString(), now.clone().subtract(1, 'hour').toISOString());
      });
    });
  });

  describe('sendReminders', () => {
    it('should call getLeafPlaces', () => {
      reminders.__set__('getLeafPlaces', sinon.stub().resolves([]));

      return reminders.__get__('sendReminders')().then(() => {
        assert(reminders.__get__('getLeafPlaces').called);
      });
    });

    describe('getLeafPlaces', () => {
      it('it calls db view and hydrates docs', () => {
        sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'xxx' }] });
        sinon.stub(db.medic, 'allDocs')
          .withArgs({ keys: ['reminder:frm:5000:xxx'] }).resolves({ rows: [{ key: 'reminder:frm:5000:xxx', error: 'not_found' }] })
          .withArgs({ keys: ['xxx'], include_docs: true }).resolves({ rows: [{ doc: { _id: 'xxx', contact: { _id: 'maria' }}, id: 'xxx' }] });

        sinon.stub(config, 'get').returns([
          { id: 'person', person: true, parents: [ 'clinic' ] },     // not queried because we send reminders only to places
          { id: 'clinic', parents: [ 'health_center' ] },            // queried
          { id: 'health_center', parents: [ 'district_hospital' ] }, // not queried because its not a leaf
          { id: 'district_hospital' }
        ]);
        reminders.__set__('lineage', { hydrateDocs: sinon.stub().resolves([{ _id: 'xxx', contact: 'maria' }]) });

        return reminders
          .__get__('getLeafPlaces')({ form: 'frm' }, moment(5000))
          .then(places => {
            assert(Array.isArray(places));
            assert.equal(places.length, 1);
            assert.deepEqual(places, [{ _id: 'xxx', contact: 'maria' }]);
            assert.equal(db.medic.query.callCount, 1);
            assert.equal(db.medic.query.args[0][0], 'medic-client/contacts_by_type');
            assert.deepEqual(db.medic.query.args[0][1].keys, [[ 'clinic' ]]);
            assert.equal(reminders.__get__('lineage').hydrateDocs.callCount, 1);
            assert.deepEqual(reminders.__get__('lineage').hydrateDocs.args[0], [[{ _id: 'xxx', contact: { _id: 'maria' } }]]);
          });
      });

      it('it ignores places with matching reminders', () => {
        const now = moment(1234);
        sinon.stub(db.medic, 'query').resolves({ rows: [
            { id: 'xxx' },
            { id: 'yyx' },
            { id: 'yyy' },
            { id: 'yyz' }
          ] });
        sinon.stub(db.medic, 'allDocs');
        db.medic.allDocs
          .withArgs({ keys: ['reminder:frm:1234:xxx', 'reminder:frm:1234:yyx', 'reminder:frm:1234:yyy', 'reminder:frm:1234:yyz'] })
          .resolves({ rows: [
              { key: 'reminder:frm:1234:xxx', error: 'not_found' },
              { key: 'reminder:frm:1234:yyx', id: 'reminder:frm:1234:yyx', value: { rev: '1-something'} },
              { key: 'reminder:frm:1234:yyy', error: 'not_found' },
              { key: 'reminder:frm:1234:yyz', error: 'not_found' },
            ] });
        db.medic.allDocs
          .withArgs({ keys: ['xxx', 'yyy', 'yyz'], include_docs: true })
          .resolves({ rows: [
              { doc: { _id: 'xxx', contact: 'one' } },
              { doc: { _id: 'yyy', contact: 'two' } },
              { doc: { _id: 'yyz', contact: 'three' } }
          ]});
        reminders.__set__('lineage', { hydrateDocs: sinon.stub().callsFake(d => d) });

        return reminders
          .__get__('getLeafPlaces')({ form: 'frm' }, now)
          .then(places => {
            assert.deepEqual(places.map(place => place._id), ['xxx', 'yyy', 'yyz']);
          });
      });
    });

    describe('canSend', () => {
      it('should return true if no sent forms', () => {
        const now = moment();
        const canSend = reminders.__get__('canSend')({ form: 'XXX' }, now, { _id: 'doc', contact: 'aaa' });
        assert.equal(canSend, true);
      });

      it('should return false if a sent_forms within lockout period of reminder', () => {
        const now = moment();
        const reminder = {
          form: 'XXX',
          mute_after_form_for: '3 days'
        };
        const place = {
          contact: {},
          sent_forms: {
            XXX: now.clone().subtract(2, 'days').toISOString()
          }
        };
        const canSend = reminders.__get__('canSend')(reminder, now, place);
        assert.equal(canSend, false);
      });

      it('should return true if a sent_forms outside of lockout period of reminder', () => {
        const now = moment();
        const reminder = {
          form: 'XXX',
          mute_after_form_for: '3 days'
        };
        const place = {
          contact: {},
          sent_forms: {
            XXX: now.clone().subtract(3, 'days').subtract(1, 'minute').toISOString()
          }
        };
        const canSend = reminders.__get__('canSend')(reminder, now, place);
        assert.equal(canSend, true);
      });
    });

    it('should do nothing if no places found', () => {
      sinon.stub(config, 'get').returns([ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ]);
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      const lineage = { hydrateDocs: sinon.stub() };
      const messages = { addMessage: sinon.stub() };
      sinon.stub(db.medic, 'allDocs');
      sinon.stub(db.medic, 'bulkDocs');
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      return reminders
        .__get__('sendReminders')({ form: 'frm' }, moment(1000))
        .then(() => {
          assert.equal(db.medic.bulkDocs.callCount, 0);
          assert.equal(lineage.hydrateDocs.callCount, 0);
          assert.equal(db.medic.allDocs.callCount, 0);
          assert.equal(messages.addMessage.callCount, 0);
          assert.equal(db.medic.query.callCount, 1);
          assert.deepEqual(db.medic.query.args[0], [
            'medic-client/contacts_by_type',
            { keys: [['tier2']] }
          ]);
        });
    });

    it('should exclude places that already have a reminder', () => {
      const now = moment(1000);
      const reminder = { form: 'rform' };
      sinon.stub(config, 'get').returns([ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ]);
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'doc1' }, { id: 'doc2' }] });
      const lineage = { hydrateDocs: sinon.stub() };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs');
      sinon.stub(db.medic, 'allDocs')
        .withArgs({ keys: ['reminder:rform:1000:doc1', 'reminder:rform:1000:doc2'] })
        .resolves({ rows: [
            { id: 'reminder:rform:1000:doc1', value: { rev: '1-something' } },
            { id: 'reminder:rform:1000:doc2', value: { rev: '2-something' } }
            ]});
      return reminders.__get__('sendReminders')(reminder, now).then(() => {
        assert.equal(db.medic.bulkDocs.callCount, 0);
        assert.equal(lineage.hydrateDocs.callCount, 0);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: ['reminder:rform:1000:doc1', 'reminder:rform:1000:doc2'] }]);
        assert.equal(messages.addMessage.callCount, 0);
      });
    });

    it('should exclude places that have no contact or are muted', () => {
      const now = moment(123);
      const reminder = { form: 'vform' };
      sinon.stub(config, 'get').returns([ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ]);
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'doc1' }, { id: 'doc2' }] });
      const lineage = { hydrateDocs: sinon.stub() };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs');
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs
        .withArgs({ keys: ['reminder:vform:123:doc1', 'reminder:vform:123:doc2'] })
        .resolves({ rows: [
            { id: 'reminder:vform:123:doc1', error: 'not_found' },
            // deleted reminder counts as no reminder
            { id: 'reminder:vform:123:doc2', value: { rev: '2-something', deleted: true } }
          ]});
      db.medic.allDocs
        .withArgs({ keys: ['doc1', 'doc2'], include_docs: true })
        .resolves({ rows: [
            { doc: { _id: 'doc1', type: 'tier2' } },
            { doc: { _id: 'doc1', type: 'tier2', contact: { _id: 'c' }, muted: 1234 } },
          ]});

      return reminders.__get__('sendReminders')(reminder, now).then(() => {
        assert.equal(db.medic.bulkDocs.callCount, 0);
        assert.equal(lineage.hydrateDocs.callCount, 0);
        assert.equal(db.medic.allDocs.callCount, 2);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: ['reminder:vform:123:doc1', 'reminder:vform:123:doc2'] }]);
        assert.deepEqual(db.medic.allDocs.args[1], [{ keys: ['doc1', 'doc2'], include_docs: true }]);
        assert.equal(messages.addMessage.callCount, 0);
      });
    });

    it('should exclude places that have a form sent in mute interval ', () => {
      const now = moment(oneHour);
      const reminder = { form: 'vform', mute_after_form_for: '10 minute' };
      sinon.stub(config, 'get').returns([ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ]);
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'doc1' }, { id: 'doc2' }] });
      const lineage = { hydrateDocs: sinon.stub() };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs');
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs
        .withArgs({ keys: [`reminder:vform:${oneHour}:doc1`, `reminder:vform:${oneHour}:doc2`] })
        .resolves({ rows: [
            { id: `reminder:vform:${oneHour}:doc1`, error: 'not_found' },
            // deleted reminder counts as no reminder
            { id: `reminder:vform:${oneHour}:doc2`, value: { rev: '2-something', deleted: true } }
          ]});
      db.medic.allDocs
        .withArgs({ keys: ['doc1', 'doc2'], include_docs: true })
        .resolves({ rows: [
            { doc: { _id: 'doc1', type: 'tier2', sent_forms: { vform: oneHour - oneMinute }, contact: { _id: 'c' } } },
            { doc: { _id: 'doc1', type: 'tier2', contact: { _id: 'c' }, sent_forms: { vform: oneHour - 5 * oneMinute, other: 123 } } },
          ]});

      return reminders.__get__('sendReminders')(reminder, now).then(() => {
        assert.equal(db.medic.bulkDocs.callCount, 0);
        assert.equal(lineage.hydrateDocs.callCount, 0);
        assert.equal(db.medic.allDocs.callCount, 2);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: [`reminder:vform:${oneHour}:doc1`, `reminder:vform:${oneHour}:doc2`] }]);
        assert.deepEqual(db.medic.allDocs.args[1], [{ keys: ['doc1', 'doc2'], include_docs: true }]);
        assert.equal(messages.addMessage.callCount, 0);
      });
    });

    it('should create reminder docs for valid places', () => {
      const now = moment(oneDay);
      const reminder = { form: 'frm', mute_after_form_for: '10 minute', message: 'I shot the sheriff' };
      sinon.stub(config, 'get').returns([ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ]);
      sinon.stub(db.medic, 'query').resolves({ rows: [
          { id: 'doc1' }, { id: 'doc2' }, { id: 'doc3' }, { id: 'doc4' }, { id: 'doc5' }, { id: 'doc6' }, { id: 'doc7' }, { id: 'doc8' }
        ] });
      const lineage = {
        hydrateDocs: sinon.stub().callsFake(d => Promise.resolve(d)),
        minifyLineage: sinon.stub(),
      };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs').resolves();
      sinon.stub(db.medic, 'allDocs');

      db.medic.allDocs.onCall(0).resolves({ rows: [
          { key: `reminder:frm:${oneDay}:doc1`, error: 'not_found' },
          { id: `reminder:frm:${oneDay}:doc2`, value: { rev: '2-something', deleted: true } },
          { id: `reminder:frm:${oneDay}:doc3`, value: { rev: '1-something' } },
          { key: `reminder:frm:${oneDay}:doc4`, error: 'not_found' },
          { key: `reminder:frm:${oneDay}:doc5`, error: 'not_found' },
          { key: `reminder:frm:${oneDay}:doc6`, error: 'not_found' },
          { key: `reminder:frm:${oneDay}:doc7`, error: 'not_found' },
          { key: `reminder:frm:${oneDay}:doc8`, error: 'not_found' },
        ]});
      db.medic.allDocs.onCall(1).resolves({ rows: [
          { doc: { _id: 'doc1', contact: 'contact1' }}, // no reminder
          { doc: { _id: 'doc2', contact: 'contact2' }}, // deleted reminder,
          { doc: { _id: 'doc4' }}, // no contact,
          { doc: { _id: 'doc5', contact: 'contact5', muted: true }}, // muted
          { doc: { _id: 'doc6', contact: 'contact6', sent_forms: { other: oneDay - 3 * oneMinute } }}, // other sent forms
          { doc: { _id: 'doc7', contact: 'contact7', sent_forms: { other: 100, frm: oneDay - 20 * oneMinute } }}, // old sent form
          { doc: { _id: 'doc8', contact: 'contact8', sent_forms: { rnd: oneDay, frm: oneDay - 4 * oneMinute } }}, // has sent form
        ] });

      return reminders.__get__('sendReminders')(reminder, now).then(() => {
        assert.equal(db.medic.allDocs.callCount, 2);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: [
          `reminder:frm:${oneDay}:doc1`,
          `reminder:frm:${oneDay}:doc2`,
          `reminder:frm:${oneDay}:doc3`,
          `reminder:frm:${oneDay}:doc4`,
          `reminder:frm:${oneDay}:doc5`,
          `reminder:frm:${oneDay}:doc6`,
          `reminder:frm:${oneDay}:doc7`,
          `reminder:frm:${oneDay}:doc8`,
          ] }]);
        assert.deepEqual(db.medic.allDocs.args[1], [{ keys: ['doc1', 'doc2', 'doc4', 'doc5', 'doc6', 'doc7', 'doc8'], include_docs: true }]);
        assert.equal(lineage.hydrateDocs.callCount, 1);
        assert.deepEqual(lineage.hydrateDocs.args[0], [[
          { _id: 'doc1', contact: 'contact1' }, // no reminder
          { _id: 'doc2', contact: 'contact2' }, // deleted reminder,
          { _id: 'doc6', contact: 'contact6', sent_forms: { other: oneDay - 3 * oneMinute } }, // other sent forms
          { _id: 'doc7', contact: 'contact7', sent_forms: { other: 100, frm: oneDay - 20 * oneMinute } }, // old sent form
        ]]);

        assert.equal(messages.addMessage.callCount, 4);
        assert.equal(db.medic.bulkDocs.callCount, 1);
        assert.deepEqual(db.medic.bulkDocs.args[0][0].map(doc => doc._id), [
          `reminder:frm:${oneDay}:doc1`, `reminder:frm:${oneDay}:doc2`, `reminder:frm:${oneDay}:doc6`,
          `reminder:frm:${oneDay}:doc7`,
        ]);
      });
    });

    it('should call messages with correct params', () => {

    });
  });
});
