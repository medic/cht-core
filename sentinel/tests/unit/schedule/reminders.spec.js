const config = require('../../../src/config');
config.initTransitionLib();

const moment = require('moment');
const sinon = require('sinon');
const assert = require('chai').assert;
const rewire = require('rewire');
const db = require('../../../src/db');
const request = require('request-promise-native');

let reminders;
let clock;

const oneDay = 24 * 60 * 60 * 1000;

describe('reminders', () => {

  afterEach(() => {
    sinon.restore();
    clock.restore();
    db.couchUrl = 'someURL';
  });
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    reminders = rewire('../../../src/schedule/reminders');
  });

  describe('execute', () => {
    it('config with no reminders calls callback', () => {
      sinon.stub(config, 'get').returns([]);
      reminders.__set__('runReminder', sinon.stub().rejects());
      return reminders.execute().then(() => {
        assert.equal(reminders.__get__('runReminder').callCount, 0);
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

      return reminders.execute().then(() => {
        assert.equal(isConfigValid.callCount, 4);
        assert.equal(runReminder.callCount, 3);
        assert.deepEqual(
          runReminder.args,
          [[{ form: 'a', valid: true }], [{ form: 'c', valid: true }], [{ form: 'd', valid: true }]]
        );
      });
    });

    it('should throw errors', () => {
      reminders.__set__('isConfigValid', sinon.stub().returns(true));
      const runReminder = sinon.stub().resolves();
      runReminder.withArgs(2).rejects({ some: 'err' });
      reminders.__set__('runReminder', runReminder);
      sinon.stub(config, 'get').returns([1, 2, 3, 4]);

      return reminders.execute().catch(err => {
        assert.deepEqual(err, { some: 'err' });
        assert.equal(reminders.__get__('isConfigValid').callCount, 4);
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
      assert.equal(isConfigValid({ form: 'a', message: 'o', text_expression: 'c', contact_types: ['clinic'] }), true);
    });

    it('should return true for configured contact types', () => {
      sinon.stub(config, 'getAll').returns({ contact_types: [ { id: 'house' } ] });
      assert.equal(isConfigValid({ form: 'a', message: 'o', text_expression: 'c', contact_types: ['house'] }), true);
    });

    it('should return false when given invalid contact type', () => {
      assert.equal(isConfigValid({ form: 'a', message: 'b', cron: 'c', contact_types: [] }), false);
      assert.equal(isConfigValid({ form: 'a', message: 'b', cron: 'c', contact_types: [ 'unknown' ] }), false);
    });
  });

  describe('getSchedule', () => {
    let getSchedule;
    beforeEach(() => {
      getSchedule = reminders.__get__('getSchedule');
    });

    it('should return date from next schedule for cron', () => {
      clock.setSystemTime(moment('2021-06-17T10:48:54.000Z').valueOf());
      assert.equal(getSchedule({ cron: '0 * * * *' }).next().toISOString(), '2021-06-17T11:00:00.000Z');
    });

    it('should return date from next schedule for text_expression', () => {
      clock.setSystemTime(moment('2021-06-17T10:48:54.000Z').valueOf());
      assert.equal(getSchedule({ text_expression: 'every 5 mins' }).next().toISOString(), '2021-06-17T10:50:00.000Z');
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
        assert.deepEqual(
          db.sentinel.put.args[0],
          [{ _id: 'reminderlog:formA:1230', reminder, reported_date: 1260, duration: 0, type: 'reminderlog' }]
        );
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

    it('should throw sendReminder errors', () => {
      const reminder = { form: 'a' };
      reminders.__set__('matchReminder', sinon.stub().resolves('aa'));
      reminders.__set__('sendReminders', sinon.stub().rejects({ some: 'error' }));

      return runReminder(reminder).catch(err => {
        assert.equal(reminders.__get__('matchReminder').callCount, 1);
        assert.equal(reminders.__get__('sendReminders').callCount, 1);
        assert.deepEqual(err, { some: 'error' });
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
      const tick = oneDay;
      const schedule = { prev: sinon.stub()};
      const reminder = { text_expression: 'none', form: 'formA' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      db.sentinel.allDocs.resolves({ rows: [] });
      clock.tick(tick);

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{
          descending: true,
          limit: 1,
          startkey: `reminderlog:formA:${tick}`,
          endkey: `reminderlog:formA:0`
        }]);
      });
    });

    it('should query allDocs with correct keys', () => {
      const schedule = { prev: sinon.stub()};
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      db.sentinel.allDocs.resolves({ rows: [] });
      const now = oneDay;
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
          endkey: `reminderlog:formB:${now - oneDay}`
        }]);
        assert.equal(schedule.prev.callCount, 1);
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(0).toDate()]);
      });
    });

    it('should return false if no schedule in time interval', () => {
      const now = 5000;
      const lastSchedule = 2500;
      const schedule = { prev: sinon.stub().returns(0) };
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      clock.tick(now);
      db.sentinel.allDocs.resolves({ rows: [{ id: `reminderlog:formB:${lastSchedule}` }] });

      return matchReminder(reminder).then(result => {
        assert.equal(result, false);
        assert.equal(reminders.__get__('getSchedule').callCount, 1);
        assert.deepEqual(reminders.__get__('getSchedule').args[0], [reminder]);
        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.equal(schedule.prev.callCount, 1);
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(lastSchedule).toDate()]);
      });
    });

    it('should return correct prev schedule', () => {
      const prevSchedule = new Date(4000);
      const schedule = { prev: sinon.stub().returns(prevSchedule) };
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      const now = 5000;
      const lastReminder = 3500;
      clock.tick(now);
      db.sentinel.allDocs.resolves({ rows: [{ id: `reminderlog:formB:${lastReminder}` }]});

      return matchReminder(reminder).then(result => {
        assert.deepEqual(result, moment(prevSchedule));
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(lastReminder).toDate()]);
      });
    });

    it('should return correct prev schedule when no results', () => {
      const prevSchedule = new Date(4000);
      const schedule = { prev: sinon.stub().returns(prevSchedule) };
      const reminder = { text_expression: 'none', form: 'formB' };
      reminders.__set__('getSchedule', sinon.stub().returns(schedule));
      const now = oneDay;
      clock.tick(now);
      db.sentinel.allDocs.resolves({ rows: [] });

      return matchReminder(reminder).then(result => {
        assert.deepEqual(result, moment(prevSchedule));
        assert.deepEqual(schedule.prev.args[0], [1, moment(now).toDate(), moment(now-oneDay).toDate()]);
      });
    });

    it('matches reminder with moment if in last hour', () => {
      clock.tick(oneDay);
      const ts = moment().startOf('hour');
      reminders.__set__('getReminderWindowStart', sinon.stub().resolves(moment().subtract(1, 'hour')));

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
      reminders.__set__('getReminderWindowStart', sinon.stub().resolves(past));
      return matchReminder({  cron: now.clone().add(1, 'minute').format('m HH * * *') })
        // generate cron job 1 minute into future
        .then(matches => {
          assert.equal(matches, false);
        });
    });

    it('does not match if previous to reminder', () => {
      clock.tick(oneDay);
      const now = moment().subtract(2, 'hours');
      reminders.__set__('getReminderWindowStart', sinon.stub().resolves( moment().subtract(1, 'hour')));

      return matchReminder({ cron: now.format('59 HH * * *')}).then(matches => {
        // will generate cron job matching the previous hour
        assert.equal(matches, false);
      });
    });

    it('getReminderWindow returns a day ago when no results from db', () => {
      const time = moment().startOf('hour').subtract(1, 'day');
      db.sentinel.allDocs.resolves({ rows: [] });

      return reminders.__get__('getReminderWindowStart')({}).then(start => {
        assert(start);
        assert.equal(start.valueOf(), time.valueOf());
      });
    });

    it('getReminderWindow calls view looking for old events and returns date found', () => {
      const now = moment();
      const anHourAgo = moment().subtract(1, 'hour');

      db.sentinel.allDocs.resolves({ rows: [{
        id: `reminderlog:XXX:${anHourAgo.valueOf()}`
      }] });

      return reminders.__get__('getReminderWindowStart')({ form: 'XXX'}).then(start => {
        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0][0], {
          descending: true,
          limit: 1,
          startkey: `reminderlog:XXX:${Math.floor(now.valueOf() / 1000)}`,
          endkey: `reminderlog:XXX:${now.clone().startOf('hour').subtract(1, 'day').valueOf()}`
        });
        assert.equal(start.toISOString(), anHourAgo.toISOString());
      });
    });
  });

  describe('sendReminders', () => {
    it('should call getPlaces', () => {
      reminders.__set__('getValidPlacesBatch', sinon.stub().resolves([]));

      return reminders.__get__('sendReminders')({}).then(() => {
        assert(reminders.__get__('getValidPlacesBatch').called);
      });
    });

    describe('getValidPlacesBatch', () => {
      it('it calls db view and hydrates docs', () => {
        sinon.stub(request, 'get').resolves({ rows: [{ id: 'xxx' }] });
        sinon.stub(db.medic, 'allDocs')
          .withArgs({ keys: ['reminder:frm:5000:xxx'] })
          .resolves({ rows: [{ key: 'reminder:frm:5000:xxx', error: 'not_found' }] })
          .withArgs({ keys: ['xxx'], include_docs: true })
          .resolves({ rows: [{ doc: { _id: 'xxx', contact: { _id: 'maria' }}, id: 'xxx' }] });
        reminders.__set__('lineage', { hydrateDocs: sinon.stub().resolves([{ _id: 'xxx', contact: 'maria' }]) });

        return reminders
          .__get__('getValidPlacesBatch')({ form: 'frm' }, moment(5000), JSON.stringify([['clinic']]))
          .then(({places, nextDocId}) => {
            assert(Array.isArray(places));
            assert.equal(nextDocId, 'xxx');
            assert.equal(places.length, 1);
            assert.deepEqual(places, [{ _id: 'xxx', contact: 'maria' }]);
            assert.equal(request.get.callCount, 1);
            assert.deepEqual(request.get.args[0], [
              'someURL/_design/medic-client/_view/contacts_by_type',
              { qs: { limit: 1000, keys: '[["clinic"]]' }, json: true },
            ]);
            assert.equal(reminders.__get__('lineage').hydrateDocs.callCount, 1);
            assert.deepEqual(
              reminders.__get__('lineage').hydrateDocs.args[0],
              [[{ _id: 'xxx', contact: { _id: 'maria' } }]]
            );
          });
      });

      it('it ignores places with matching reminders', () => {
        const now = moment(1234);
        sinon.stub(request, 'get').resolves({ rows: [
          { id: 'xxx' },
          { id: 'yyx' },
          { id: 'yyy' },
          { id: 'yyz' }
        ] });

        sinon.stub(db.medic, 'allDocs');
        db.medic.allDocs
          .withArgs({ keys:
            ['reminder:frm:1234:xxx', 'reminder:frm:1234:yyx', 'reminder:frm:1234:yyy', 'reminder:frm:1234:yyz']
          })
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
          .__get__('getValidPlacesBatch')({ form: 'frm' }, now, JSON.stringify([['clinic']]))
          .then(({places, nextDocId}) => {
            assert.deepEqual(places.map(place => place._id), ['xxx', 'yyy', 'yyz']);
            assert.equal(nextDocId, 'yyz');
          });
      });

      it('should use provided startDocId and skips the doc with provided startDocId in processing', () => {
        sinon.stub(request, 'get').resolves({ rows: [ { id: 'somedocid' }, { id: 'xxx' }] });
        sinon.stub(db.medic, 'allDocs')
          .withArgs({ keys: ['reminder:frm:5000:xxx'] })
          .resolves({ rows: [{ key: 'reminder:frm:5000:xxx', error: 'not_found' }] })
          .withArgs({ keys: ['xxx'], include_docs: true })
          .resolves({ rows: [{ doc: { _id: 'xxx', contact: { _id: 'maria' }}, id: 'xxx' }] });

        reminders.__set__('lineage', { hydrateDocs: sinon.stub().resolves([{ _id: 'xxx', contact: 'maria' }]) });

        return reminders
          .__get__('getValidPlacesBatch')({ form: 'frm' }, moment(5000), JSON.stringify([['clinic']]), 'somedocid')
          .then(({places, nextDocId}) => {
            assert(Array.isArray(places));
            assert.equal(nextDocId, 'xxx');
            assert.equal(places.length, 1);
            assert.deepEqual(places, [{ _id: 'xxx', contact: 'maria' }]);
            assert.equal(request.get.callCount, 1);
            assert.deepEqual(request.get.args[0], [
              'someURL/_design/medic-client/_view/contacts_by_type',
              { qs: { limit: 1000, keys: '[["clinic"]]', start_key_doc_id: 'somedocid' }, json: true },
            ]);
            assert.equal(reminders.__get__('lineage').hydrateDocs.callCount, 1);
            assert.deepEqual(
              reminders.__get__('lineage').hydrateDocs.args[0],
              [[{ _id: 'xxx', contact: { _id: 'maria' } }]]
            );
          });
      });
    });

    it('should do nothing if no places found', () => {
      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      sinon.stub(request, 'get').resolves({ rows: [] });
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
          assert.equal(request.get.callCount, 1);
          assert.deepEqual(request.get.args[0], [
            'someURL/_design/medic-client/_view/contacts_by_type',
            { qs: { limit: 1000, keys: JSON.stringify([['tier2']]) }, json: true },
          ]);
        });
    });

    it('should exclude places that already have a reminder', () => {
      const now = moment(1000);
      const reminder = { form: 'rform' };
      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [{ id: 'doc1' }, { id: 'doc2' }] })
        .onCall(1).resolves({ rows: [{ id: 'doc2' }] });

      const lineage = { hydrateDocs: sinon.stub().resolves([]) };
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
        assert.equal(lineage.hydrateDocs.callCount, 1);
        assert.deepEqual(lineage.hydrateDocs.args[0], [[]]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(
          db.medic.allDocs.args[0],
          [{ keys: ['reminder:rform:1000:doc1', 'reminder:rform:1000:doc2'] }]
        );
        assert.equal(messages.addMessage.callCount, 0);
      });
    });

    it('should exclude places that have no contact, are muted or have a legacy matching reminder', () => {
      const now = moment(123);
      const reminder = { form: 'vform' };
      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [{ id: 'doc1' }, { id: 'doc2' }, { id: 'doc3' }, { id: 'doc4' }, { id: 'doc5' }] })
        .onCall(1).resolves({ rows: [{ id: 'doc5' }] });
      const lineage = { hydrateDocs: sinon.stub().callsFake(d => Promise.resolve(d)), minifyLineage: sinon.stub() };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs
        .withArgs({ keys: [
          'reminder:vform:123:doc1',
          'reminder:vform:123:doc2',
          'reminder:vform:123:doc3',
          'reminder:vform:123:doc4',
          'reminder:vform:123:doc5'
        ] })
        .resolves({ rows: [
          { id: 'reminder:vform:123:doc1', error: 'not_found' },
          // deleted reminder counts as no reminder
          { id: 'reminder:vform:123:doc2', value: { rev: '2-something', deleted: true } },
          { id: 'reminder:vform:123:doc3', error: 'not_found' },
          { id: 'reminder:vform:123:doc4', error: 'not_found' },
          { id: 'reminder:vform:123:doc5', error: 'not_found' },
        ]});
      db.medic.allDocs
        .withArgs({ keys: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'], include_docs: true })
        .resolves({ rows: [
          { doc: { _id: 'doc1', type: 'tier2' } },
          { doc: { _id: 'doc2', type: 'tier2', contact: { _id: 'c' }, muted: 1234 } },
          // has a matching legacy reminder
          {
            doc: { _id: 'doc3', type: 'tier2', contact: { _id: 'c' },
              tasks: [{ form: 'vform', timestamp: now.toISOString() }] }
          },
          // not matching legacy reminder
          {
            doc: { _id: 'doc4', type: 'tier2', contact: { _id: 'c' },
              tasks: [{ form: 'otherform', timestamp: now.toISOString() }] }
          },
          // not matching legacy reminder
          {
            doc: { _id: 'doc5', type: 'tier2', contact: { _id: 'c' },
              tasks: [{ form: 'vform', timestamp: 'random' }] }
          },
        ]});

      return reminders.__get__('sendReminders')(reminder, now).then(() => {
        assert.equal(db.medic.bulkDocs.callCount, 1);
        assert.equal(lineage.hydrateDocs.callCount, 1);
        assert.equal(db.medic.allDocs.callCount, 2);
        assert.deepEqual(
          db.medic.allDocs.args[0],
          [{ keys: [
            'reminder:vform:123:doc1',
            'reminder:vform:123:doc2',
            'reminder:vform:123:doc3',
            'reminder:vform:123:doc4',
            'reminder:vform:123:doc5'
          ] }]
        );
        assert.deepEqual(
          db.medic.allDocs.args[1],
          [{ keys: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'], include_docs: true }]
        );
        assert.equal(messages.addMessage.callCount, 2);
        assert.sameMembers(
          db.medic.bulkDocs.args[0][0].map(r => r._id),
          ['reminder:vform:123:doc4', 'reminder:vform:123:doc5']
        );
      });
    });

    it('should exclude places that have a form sent in mute interval', () => {
      const now = 60 * 60 * 1000; // one hour
      clock.tick(now);
      const reminderDate = 30 * 60 * 1000; // 30 minutes
      const reminder = { form: 'vform', mute_after_form_for: '10 minute' }; // 10 * 60 * 1000
      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [
          { id: 'doc1' }, // has new form
          { id: 'doc2' }, // has old form
          { id: 'doc3' } // has no form
        ]})
        .onCall(1).resolves({ rows: [{ id: 'doc3' }] });

      sinon.stub(db.medic, 'query').resolves({ rows: [
        { key: ['vform', 'doc1'], value: { sum: 100, min: 10, max: 25 * 60 * 1000 } }, // 25 + 10 minutes > 30 minutes
        { key: ['vform', 'doc2'], value: { sum: 100, min: 10, max: 1000 } }, // 1 sec + 10 minutes < 30 minutes
      ]});
      const lineage = { hydrateDocs: sinon.stub().callsFake(d => d), minifyLineage: sinon.stub() };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs
        .withArgs({ keys: [
          `reminder:vform:${reminderDate}:doc1`,
          `reminder:vform:${reminderDate}:doc2`,
          `reminder:vform:${reminderDate}:doc3`
        ] })
        .resolves({ rows: [
          { id: `reminder:vform:${reminderDate}:doc1`, error: 'not_found' },
          // deleted reminder counts as no reminder
          { id: `reminder:vform:${reminderDate}:doc2`, value: { rev: '2-something', deleted: true } },
          { id: `reminder:vform:${reminderDate}:doc3`, error: 'not_found' },
        ]});
      db.medic.allDocs
        .withArgs({ keys: ['doc2', 'doc3'], include_docs: true })
        .resolves({ rows: [
          { doc: { _id: 'doc2', type: 'tier2', contact: { _id: 'c' } } },
          { doc: { _id: 'doc3', type: 'tier2', contact: { _id: 'c' } } },
        ]});

      return reminders.__get__('sendReminders')(reminder, moment(reminderDate)).then(() => {
        assert.equal(db.medic.bulkDocs.callCount, 1);
        assert.equal(lineage.hydrateDocs.callCount, 1);
        assert.equal(db.medic.allDocs.callCount, 2);
        assert.deepEqual(
          db.medic.allDocs.args[0],
          [{ keys: [
            `reminder:vform:${reminderDate}:doc1`,
            `reminder:vform:${reminderDate}:doc2`,
            `reminder:vform:${reminderDate}:doc3`
          ] }]
        );
        assert.deepEqual(db.medic.allDocs.args[1], [{ keys: ['doc2', 'doc3'], include_docs: true }]);
        assert.equal(request.get.callCount, 2);
        assert.deepEqual(request.get.args[0], [
          'someURL/_design/medic-client/_view/contacts_by_type',
          { qs: { limit: 1000, keys: JSON.stringify([['tier2']]) }, json: true },
        ]);
        assert.deepEqual(request.get.args[1], [
          'someURL/_design/medic-client/_view/contacts_by_type',
          { qs: { limit: 1000, keys: JSON.stringify([['tier2']]), start_key_doc_id: 'doc3' }, json: true },
        ]);

        assert.equal(db.medic.query.callCount, 1);
        assert.deepEqual(db.medic.query.args[0], [
          'medic/reports_by_form_and_parent',
          {
            keys: [['vform', 'doc1'], ['vform', 'doc2'], ['vform', 'doc3']],
            group: true
          }
        ]);
        assert.equal(messages.addMessage.callCount, 2);
      });
    });

    it('should create reminder docs for valid places', () => {
      const reminderDate = 30 * 60 * 1000;
      const reminder = { form: 'frm', mute_after_form_for: '10 minute', message: 'I shot the sheriff' };
      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [
          { id: 'doc1' },
          { id: 'doc2' },
          { id: 'doc3' },
          { id: 'doc4' },
          { id: 'doc5' },
          { id: 'doc6' },
          { id: 'doc7' },
          { id: 'doc8' },
        ]})
        .onCall(1).resolves({ rows: [
          { id: 'doc8' }, // not processed the second time
          { id: 'doc9' }, // has matching legacy reminder
          { id: 'doc10' }, // has not matching legacy reminders
          { id: 'doc11' }, // has other legacy reminders
        ] })
        .onCall(2).resolves({ rows: [{ id: 'doc11' }] });

      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: [
          { key: ['frm', 'doc6'], value: {} }, // this is very broken
          { key: ['frm', 'doc7'], value: { max: 1000 } }, // old form
          { key: ['frm', 'doc8'], value: { max: 25 * 60 * 1000 } }, // new form
        ] })
        .onCall(1).resolves({ rows: [] }); // 2nd batch has no reminder forms sent

      const lineage = {
        hydrateDocs: sinon.stub().callsFake(d => Promise.resolve(d)),
        minifyLineage: sinon.stub(),
      };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.medic, 'allDocs');

      db.medic.allDocs.onCall(0).resolves({ rows: [
        { key: `reminder:frm:${reminderDate}:doc1`, error: 'not_found' },
        { id: `reminder:frm:${reminderDate}:doc2`, value: { rev: '2-something', deleted: true } },
        { id: `reminder:frm:${reminderDate}:doc3`, value: { rev: '1-something' } },
        { key: `reminder:frm:${reminderDate}:doc4`, error: 'not_found' },
        { key: `reminder:frm:${reminderDate}:doc5`, error: 'not_found' },
        { key: `reminder:frm:${reminderDate}:doc6`, error: 'not_found' },
        { key: `reminder:frm:${reminderDate}:doc7`, error: 'not_found' },
        { key: `reminder:frm:${reminderDate}:doc8`, error: 'not_found' },
      ]});
      db.medic.allDocs.onCall(1).resolves({ rows: [
        { doc: { _id: 'doc1', contact: 'contact1' }}, // no reminder
        { doc: { _id: 'doc2', contact: 'contact2' }}, // deleted reminder,
        { doc: { _id: 'doc4' }}, // no contact,
        { doc: { _id: 'doc5', contact: 'contact5', muted: true }}, // muted
        { doc: { _id: 'doc6', contact: 'contact6' } },
        { doc: { _id: 'doc7', contact: 'contact7' }}, // old sent form
      ] });
      db.medic.allDocs.onCall(2).resolves({ rows: [
        { key: `reminder:frm:${reminderDate}:doc9`, error: 'not_found' },
        { key: `reminder:frm:${reminderDate}:doc10`, error: 'not_found' },
        { key: `reminder:frm:${reminderDate}:doc11`, error: 'not_found' },
      ] });
      db.medic.allDocs.onCall(3).resolves({ rows: [
        // matching legacy reminder
        { doc: {
          _id: 'doc9', contact: 'contact9', tasks: [{ form: 'frm', timestamp: moment(reminderDate).toISOString() }]
        }},
        // not matching legacy reminder
        { doc: {
          _id: 'doc10', contact: 'contact10', tasks: [{ form: 'frm', timestamp: 'august 2016' }]
        }},
        // not matching legacy reminder
        { doc: {
          _id: 'doc11', contact: 'contact11',
          tasks: [{ form: 'frm', timestamp: 'a' }, { form: 'f', timestamp: moment(reminderDate).toISOString() }]
        }},
      ] });

      return reminders.__get__('sendReminders')(reminder, moment(reminderDate)).then(() => {
        assert.equal(db.medic.allDocs.callCount, 4);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: [
          `reminder:frm:${reminderDate}:doc1`,
          `reminder:frm:${reminderDate}:doc2`,
          `reminder:frm:${reminderDate}:doc3`,
          `reminder:frm:${reminderDate}:doc4`,
          `reminder:frm:${reminderDate}:doc5`,
          `reminder:frm:${reminderDate}:doc6`,
          `reminder:frm:${reminderDate}:doc7`,
          `reminder:frm:${reminderDate}:doc8`,
        ] }]);
        assert.deepEqual(
          db.medic.allDocs.args[1],
          [{ keys: ['doc1', 'doc2', 'doc4', 'doc5', 'doc6', 'doc7'], include_docs: true }]
        );
        assert.deepEqual(db.medic.allDocs.args[2], [{ keys: [
          `reminder:frm:${reminderDate}:doc9`,
          `reminder:frm:${reminderDate}:doc10`,
          `reminder:frm:${reminderDate}:doc11`,
        ] }]);
        assert.deepEqual(db.medic.allDocs.args[3], [{ keys: ['doc9', 'doc10', 'doc11'], include_docs: true }]);

        assert.equal(lineage.hydrateDocs.callCount, 2);
        assert.deepEqual(lineage.hydrateDocs.args[0], [[
          { _id: 'doc1', contact: 'contact1' }, // no reminder
          { _id: 'doc2', contact: 'contact2' }, // deleted reminder,
          { _id: 'doc6', contact: 'contact6' },
          { _id: 'doc7', contact: 'contact7' }, // old sent form
        ]]);

        assert.deepEqual(lineage.hydrateDocs.args[1], [[
          { _id: 'doc10', contact: 'contact10', tasks: [{ form: 'frm', timestamp: 'august 2016' }] },
          { _id: 'doc11', contact: 'contact11', tasks: [
            { form: 'frm', timestamp: 'a' }, { form: 'f', timestamp: moment(reminderDate).toISOString() }
          ] }
        ]]);

        assert.equal(messages.addMessage.callCount, 6);
        assert.equal(db.medic.bulkDocs.callCount, 2);
        assert.deepEqual(db.medic.bulkDocs.args[0][0].map(doc => doc._id), [
          `reminder:frm:${reminderDate}:doc1`,
          `reminder:frm:${reminderDate}:doc2`,
          `reminder:frm:${reminderDate}:doc6`,
          `reminder:frm:${reminderDate}:doc7`,
        ]);
        assert.deepEqual(db.medic.bulkDocs.args[1][0].map(doc => doc._id), [
          `reminder:frm:${reminderDate}:doc10`,
          `reminder:frm:${reminderDate}:doc11`,
        ]);
      });
    });

    it('should create reminder docs for hardcoded contact types', () => {
      const reminderDate = 30 * 60 * 1000;
      const reminder = {
        form: 'frm',
        mute_after_form_for: '10 minute',
        message: 'I shot the sheriff',
        contact_types: [ 'health_center' ]
      };
      sinon.stub(config, 'getAll').returns({}); // no configured contact types
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [ { id: 'doc1' } ]})
        .onCall(1).resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { id: `reminder:frm:${reminderDate}:doc3`, value: { rev: '1-something' } },
      ]});
      return reminders.__get__('sendReminders')(reminder, moment(reminderDate)).then(() => {
        assert.equal(request.get.args[0][1].qs.keys, '[["health_center"]]');
      });
    });

    it('should create reminder docs for configured contact types', () => {
      const reminderDate = 30 * 60 * 1000;
      const reminder = {
        form: 'frm',
        mute_after_form_for: '10 minute',
        message: 'I shot the sheriff',
        contact_types: [ 'tier2', 'tier3' ]
      };
      sinon.stub(config, 'getAll').returns({ contact_types: [
        { id: 'tier3', parents: [ 'tier1' ] },
        { id: 'tier2', parents: [ 'tier1' ] },
        { id: 'tier1' }
      ] });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [ { id: 'doc1' } ]})
        .onCall(1).resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { id: `reminder:frm:${reminderDate}:doc3`, value: { rev: '1-something' } },
      ]});
      return reminders.__get__('sendReminders')(reminder, moment(reminderDate)).then(() => {
        assert.equal(request.get.args[0][1].qs.keys, '[["tier2"],["tier3"]]');
      });
    });

    it('should call messages with correct params', () => {
      const reminderDate = 5000;
      const date = moment(reminderDate);
      const reminder = { form: 'form', message: 'Hello, darkness, my old friend' };

      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [ { id: 'doc1' }, { id: 'doc2' }]})
        .onCall(1).resolves({ rows: [{ id: 'doc2' }] });
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      const lineage = {
        hydrateDocs: sinon.stub().callsFake(d => Promise.resolve(d)),
        minifyLineage: sinon.stub().callsFake(d => d),
      };
      const messages = { addMessage: sinon.stub() };
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.medic, 'allDocs');

      db.medic.allDocs.onCall(0).resolves({ rows: [
        { key: `reminder:form:${oneDay}:doc1`, error: 'not_found' },
        { key: `reminder:form:${oneDay}:doc2`, error: 'not_found' },
      ]});
      db.medic.allDocs.onCall(1).resolves({ rows: [
        { doc: { _id: 'doc1', contact: 'contact1' } },
        { doc: { _id: 'doc2', contact: 'contact2' } }
      ]});

      clock.tick(oneDay);

      return reminders.__get__('sendReminders')(reminder, date).then(() => {
        assert.equal(db.medic.allDocs.callCount, 2);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: [
          `reminder:form:${reminderDate}:doc1`,
          `reminder:form:${reminderDate}:doc2`
        ] }]);
        assert.deepEqual(db.medic.allDocs.args[1], [{ keys: ['doc1', 'doc2'], include_docs: true }]);
        assert.deepEqual(lineage.hydrateDocs.args[0], [[
          { _id: 'doc1', contact: 'contact1' },
          { _id: 'doc2', contact: 'contact2' },
        ]]);
        assert.equal(messages.addMessage.callCount, 2);
        assert.deepEqual(messages.addMessage.args[0], [
          {
            _id: `reminder:form:${reminderDate}:doc1`,
            contact: 'contact1',
            form: 'form',
            place: { _id: 'doc1', parent: undefined },
            reported_date: oneDay,
            tasks: [],
            type: 'reminder'
          },
          reminder,
          'reporting_unit',
          {
            patient: { _id: 'doc1', contact: 'contact1' },
            templateContext: {
              week: `${date.week()}`,
              year: `${date.year()}`
            }
          }
        ]);
        assert.deepEqual(messages.addMessage.args[1], [
          {
            _id: `reminder:form:${reminderDate}:doc2`,
            contact: 'contact2',
            form: 'form',
            place: { _id: 'doc2', parent: undefined },
            reported_date: oneDay,
            tasks: [],
            type: 'reminder'
          },
          reminder,
          'reporting_unit',
          {
            patient: { _id: 'doc2', contact: 'contact2' },
            templateContext: {
              week: `${date.week()}`,
              year: `${date.year()}`
            }
          }
        ]);
      });
    });

    it('should generate correct message and minify before save', () => {
      const reminderDate = 5000;
      const date = moment(reminderDate);
      const reminder = { form: 'form', message: 'Please send {{form}} for {{name}} {{type}} {{week}}-{{year}}' };

      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ rows: [ { id: 'doc1' }, { id: 'doc2' }] })
        .onCall(1).resolves({ rows: [ { id: 'doc2' }] });
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs.onCall(0).resolves({ rows: [
        { key: `reminder:form:${reminderDate}:doc1`, error: 'not_found' },
        { key: `reminder:form:${reminderDate}:doc2`, error: 'not_found' },
      ]});
      db.medic.allDocs.onCall(1).resolves({ rows: [
        { doc: {
          _id: 'doc1', contact: { _id: 'contact1' }, parent: { _id: 'parent1' }, type: 'tier2', name: 'doc 1'
        } },
        { doc: {
          _id: 'doc2', contact: { _id: 'contact2' }, parent: { _id: 'parent1' }, type: 'tier2', name: 'doc 2'
        } },
      ]});

      const hydrateDocs = sinon.stub().resolves([
        {
          _id: 'doc1', contact: { _id: 'contact1', name: 'c1', phone: '1234' },
          parent: { _id: 'parent1', name: 'p1' }, type: 'tier2', name: 'doc 1'
        },
        {
          _id: 'doc2', contact: { _id: 'contact2', name: 'c2', phone: '4567' },
          parent: { _id: 'parent1', name: 'p1' }, type: 'tier2', name: 'doc 2'
        },
      ]);
      reminders.__set__('lineage', {
        hydrateDocs: hydrateDocs,
        minifyLineage: reminders.__get__('lineage').minifyLineage,
      });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      clock.tick(oneDay);
      const addMessage = sinon.spy(reminders.__get__('messages'), 'addMessage');

      return reminders.__get__('sendReminders')(reminder, date).then(() => {
        assert.equal(hydrateDocs.callCount, 1);
        assert.deepEqual(hydrateDocs.args[0], [[
          { _id: 'doc1', contact: { _id: 'contact1' }, parent: { _id: 'parent1' }, type: 'tier2', name: 'doc 1' },
          { _id: 'doc2', contact: { _id: 'contact2' }, parent: { _id: 'parent1' }, type: 'tier2', name: 'doc 2' },
        ]]);
        assert.equal(addMessage.callCount, 2);
        assert.equal(db.medic.bulkDocs.callCount, 1);
        const bulkDocsArgs = db.medic.bulkDocs.args[0][0];
        assert.equal(bulkDocsArgs.length, 2);
        assert.equal(bulkDocsArgs[0]._id, `reminder:form:${reminderDate}:doc1`);
        assert.equal(bulkDocsArgs[0].tasks.length, 1);
        assert.deepInclude(bulkDocsArgs[0].tasks[0], {
          form: 'form',
          type: 'reminder',
          state: 'pending'
        });
        assert.equal(bulkDocsArgs[0].tasks[0].messages.length, 1);
        assert.deepInclude(bulkDocsArgs[0].tasks[0].messages[0], {
          message: `Please send form for doc 1 tier2 1-${date.format('YYYY')}`,
          to: '1234'
        });
        assert.deepEqual(bulkDocsArgs[0].contact, { _id: 'contact1' });
        assert.deepEqual(bulkDocsArgs[0].place, { _id: 'doc1', parent: { _id: 'parent1' } });

        assert.equal(bulkDocsArgs[1]._id, `reminder:form:${reminderDate}:doc2`);
        assert.equal(bulkDocsArgs[1].tasks.length, 1);
        assert.deepInclude(bulkDocsArgs[1].tasks[0], {
          form: 'form',
          type: 'reminder',
          state: 'pending'
        });
        assert.equal(bulkDocsArgs[1].tasks[0].messages.length, 1);
        assert.deepInclude(bulkDocsArgs[1].tasks[0].messages[0], {
          message: `Please send form for doc 2 tier2 1-${date.format('YYYY')}`,
          to: '4567'
        });
        assert.deepEqual(bulkDocsArgs[1].contact, { _id: 'contact2' });
        assert.deepEqual(bulkDocsArgs[1].place, { _id: 'doc2', parent: { _id: 'parent1' } });
      });
    });

    it(
      'should process contacts in batches, calling itself after each batch and skipping already processed contacts',
      () => {
        sinon.stub(config, 'getAll')
          .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
        const batches = [
          ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
          ['doc5', 'doc6', 'doc7', 'doc8', 'doc9'],
          ['doc9', 'doc10', 'doc11', 'doc12', 'doc13'],
          ['doc13', 'doc14', 'doc15', 'doc16', 'doc17'],
          ['doc17']
        ];
        sinon.stub(request, 'get');
        batches.forEach((batch, idx) => request.get.onCall(idx).resolves({ rows: batch.map(id => ({ id })) }));
        sinon.stub(db.medic, 'allDocs')
        // getting reminders requests
          .callsFake(({ keys }) => Promise.resolve({ rows: keys.map(id => ({ key: id, error: 'not_found' })) }))
        // add exception for doc requests
          .withArgs(sinon.match({ include_docs: true }))
          .callsFake(({ keys }) => Promise.resolve(
            { rows: keys.map(id => ({ doc: { _id: id, contact: 'contact' }})) }
          ));
        const lineage = { hydrateDocs: sinon.stub().callsFake(d => Promise.resolve(d)), minifyLineage: sinon.stub() };
        const messages = { addMessage: sinon.stub() };
        sinon.stub(db.medic, 'bulkDocs').resolves([]);
        reminders.__set__('lineage', lineage);
        reminders.__set__('messages', messages);

        const reminderDate = 5000;

        return reminders.__get__('sendReminders')({ form: 'form' }, moment(reminderDate)).then(() => {
          assert.equal(request.get.callCount, 5);
          assert.deepEqual(request.get.args[0][1].qs, { limit: 1000, keys: JSON.stringify([['tier2']]) });
          assert.deepEqual(
            request.get.args[1][1].qs,
            { start_key_doc_id: 'doc5', limit: 1000, keys: JSON.stringify([['tier2']]) }
          );
          assert.deepEqual(
            request.get.args[2][1].qs,
            { start_key_doc_id: 'doc9', limit: 1000, keys: JSON.stringify([['tier2']]) }
          );
          assert.deepEqual(
            request.get.args[3][1].qs,
            { start_key_doc_id: 'doc13', limit: 1000, keys: JSON.stringify([['tier2']]) }
          );
          assert.deepEqual(
            request.get.args[4][1].qs,
            { start_key_doc_id: 'doc17', limit: 1000, keys: JSON.stringify([['tier2']]) }
          );
          assert.equal(db.medic.bulkDocs.callCount, 4);
          assert.deepEqual(db.medic.bulkDocs.args[0][0].map(doc => doc._id), [
            'reminder:form:5000:doc1', 'reminder:form:5000:doc2', 'reminder:form:5000:doc3',
            'reminder:form:5000:doc4', 'reminder:form:5000:doc5'
          ]);
          assert.deepEqual(db.medic.bulkDocs.args[1][0].map(doc => doc._id), [
            'reminder:form:5000:doc6', 'reminder:form:5000:doc7', 'reminder:form:5000:doc8', 'reminder:form:5000:doc9'
          ]);
          assert.deepEqual(db.medic.bulkDocs.args[2][0].map(doc => doc._id), [
            'reminder:form:5000:doc10', 'reminder:form:5000:doc11', 'reminder:form:5000:doc12',
            'reminder:form:5000:doc13'
          ]);
          assert.deepEqual(db.medic.bulkDocs.args[3][0].map(doc => doc._id), [
            'reminder:form:5000:doc14', 'reminder:form:5000:doc15', 'reminder:form:5000:doc16',
            'reminder:form:5000:doc17'
          ]);
          assert.equal(messages.addMessage.callCount, 17);

          assert.equal(db.medic.allDocs.callCount, 8);
          assert.deepEqual(
            db.medic.allDocs.args[0],
            [{ keys: [
              'reminder:form:5000:doc1', 'reminder:form:5000:doc2', 'reminder:form:5000:doc3',
              'reminder:form:5000:doc4', 'reminder:form:5000:doc5'
            ]}]
          );
          assert.deepEqual(
            db.medic.allDocs.args[1],
            [{ keys: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'], include_docs: true }]
          );
          assert.deepEqual(
            db.medic.allDocs.args[2],
            [{ keys: [
              'reminder:form:5000:doc6', 'reminder:form:5000:doc7', 'reminder:form:5000:doc8', 'reminder:form:5000:doc9'
            ]}]
          );
          assert.deepEqual(
            db.medic.allDocs.args[3],
            [{ keys: ['doc6', 'doc7', 'doc8', 'doc9'], include_docs: true }]
          );
          assert.deepEqual(
            db.medic.allDocs.args[4],
            [{ keys: [
              'reminder:form:5000:doc10', 'reminder:form:5000:doc11', 'reminder:form:5000:doc12',
              'reminder:form:5000:doc13'
            ]}]
          );
          assert.deepEqual(
            db.medic.allDocs.args[5],
            [{ keys: ['doc10', 'doc11', 'doc12', 'doc13'], include_docs: true }]
          );
          assert.deepEqual(
            db.medic.allDocs.args[6],
            [{ keys: [
              'reminder:form:5000:doc14', 'reminder:form:5000:doc15', 'reminder:form:5000:doc16',
              'reminder:form:5000:doc17'
            ]}]
          );
          assert.deepEqual(
            db.medic.allDocs.args[7],
            [{ keys: ['doc14', 'doc15', 'doc16', 'doc17'], include_docs: true }]
          );
          assert.equal(lineage.hydrateDocs.callCount, 4);
        });
      }
    );

    it('should throw bulk save errors and stop execution', () => {
      sinon.stub(config, 'getAll')
        .returns({ contact_types: [ { id: 'tier2', parents: [ 'tier1' ] }, { id: 'tier1' } ] });
      const batches = [
        ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
        ['doc5', 'doc6', 'doc7', 'doc8', 'doc9'],
        ['doc9', 'doc10', 'doc11', 'doc12', 'doc13']
      ];
      sinon.stub(request, 'get');
      batches.forEach((batch, idx) => request.get.onCall(idx).resolves({ rows: batch.map(id => ({ id })) }));
      sinon.stub(db.medic, 'allDocs')
      // getting reminders requests
        .callsFake(({ keys }) => Promise.resolve({ rows: keys.map(id => ({ key: id, error: 'not_found' })) }))
        // add exception for doc requests
        .withArgs(sinon.match({ include_docs: true }))
        .callsFake(({ keys }) => Promise.resolve({ rows: keys.map(id => ({ doc: { _id: id, contact: 'contact' }})) }));
      const lineage = { hydrateDocs: sinon.stub().callsFake(d => Promise.resolve(d)), minifyLineage: sinon.stub() };
      const messages = { addMessage: sinon.stub() };
      sinon.stub(db.medic, 'bulkDocs')
        .resolves([{ ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }])
        .onCall(2).resolves([{ ok: true }, { error: 'boom :(' }, { ok: true }, { ok: true }]);
      reminders.__set__('lineage', lineage);
      reminders.__set__('messages', messages);

      const reminderDate = 5000;

      return reminders.__get__('sendReminders')({ form: 'form' }, moment(reminderDate)).catch(err => {
        assert.deepEqual(err.message, 'Errors saving reminders');
        assert.equal(request.get.callCount, 3);
        assert.deepEqual(
          request.get.args[0][1].qs,
          { limit: 1000, keys: JSON.stringify([['tier2']]) }
        );
        assert.deepEqual(
          request.get.args[1][1].qs,
          { start_key_doc_id: 'doc5', limit: 1000, keys: JSON.stringify([['tier2']]) }
        );
        assert.deepEqual(
          request.get.args[2][1].qs,
          { start_key_doc_id: 'doc9', limit: 1000, keys: JSON.stringify([['tier2']]) }
        );

        assert.equal(db.medic.bulkDocs.callCount, 3);
        assert.deepEqual(db.medic.bulkDocs.args[0][0].map(doc => doc._id), [
          'reminder:form:5000:doc1', 'reminder:form:5000:doc2', 'reminder:form:5000:doc3', 'reminder:form:5000:doc4',
          'reminder:form:5000:doc5'
        ]);
        assert.deepEqual(db.medic.bulkDocs.args[1][0].map(doc => doc._id), [
          'reminder:form:5000:doc6', 'reminder:form:5000:doc7', 'reminder:form:5000:doc8', 'reminder:form:5000:doc9'
        ]);
        assert.deepEqual(db.medic.bulkDocs.args[2][0].map(doc => doc._id), [
          'reminder:form:5000:doc10', 'reminder:form:5000:doc11', 'reminder:form:5000:doc12', 'reminder:form:5000:doc13'
        ]);
        assert.equal(messages.addMessage.callCount, 13);

        assert.equal(db.medic.allDocs.callCount, 6);
        assert.deepEqual(
          db.medic.allDocs.args[0],
          [{ keys: [
            'reminder:form:5000:doc1', 'reminder:form:5000:doc2', 'reminder:form:5000:doc3', 'reminder:form:5000:doc4',
            'reminder:form:5000:doc5'
          ]}]
        );
        assert.deepEqual(
          db.medic.allDocs.args[1],
          [{ keys: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'], include_docs: true }]
        );
        assert.deepEqual(
          db.medic.allDocs.args[2],
          [{ keys: [
            'reminder:form:5000:doc6', 'reminder:form:5000:doc7', 'reminder:form:5000:doc8', 'reminder:form:5000:doc9'
          ]}]
        );
        assert.deepEqual(
          db.medic.allDocs.args[3],
          [{ keys: ['doc6', 'doc7', 'doc8', 'doc9'], include_docs: true }]
        );
        assert.deepEqual(
          db.medic.allDocs.args[4],
          [{ keys: [
            'reminder:form:5000:doc10', 'reminder:form:5000:doc11', 'reminder:form:5000:doc12',
            'reminder:form:5000:doc13'
          ]}]
        );
        assert.deepEqual(
          db.medic.allDocs.args[5],
          [{ keys: ['doc10', 'doc11', 'doc12', 'doc13'], include_docs: true }]
        );
        assert.equal(lineage.hydrateDocs.callCount, 3);
      });
    });
  });
});
