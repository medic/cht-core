const config = require('../../src/config');
config.initTransitionLib();

var _ = require('underscore'),
    moment = require('moment'),
    sinon = require('sinon'),
    assert = require('chai').assert,
    reminders = require('../../src/schedule/reminders'),
    db = require('../../src/db');

describe('reminders', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => { process.env.TEST_ENV = true; });

  it('reminders#execute is function', () => {
    assert(_.isFunction(reminders.execute));
  });

  it('config with no reminders calls callback', done => {
    sinon.stub(config, 'get').returns([]);
    sinon.stub(reminders, 'runReminder').throws();
    reminders.execute(err => {
      assert.equal(err, null);
      done();
    });
  });

  it('config with three matching reminder calls runReminder thrice', done => {
      sinon.stub(config, 'get').returns([
          {form:'x', cron:'x', message:'x'},
          {form:'y', cron:'y', message:'y'},
          {form:'z', cron:'z', message:'z'}
      ]);
      const runReminder = sinon.stub(reminders, 'runReminder').callsArgWith(1, null);
      reminders.execute(err => {
          assert.equal(err, null);
          assert.equal(runReminder.callCount, 3);
          done();
      });
  });

  it('runReminder calls sendReminder when valid', done => {
      sinon.stub(reminders, 'matchReminder').callsArgWith(1, null, moment());
      const sendReminders = sinon.stub(reminders, 'sendReminders').callsArgWith(1, null);
      reminders.runReminder({}, function(err) {
          assert.equal(err, null);
          assert.equal(sendReminders.callCount, 1);
          done();
      });
  });

  it('runReminder does not create document when no match', done => {
      sinon.stub(reminders, 'matchReminder').callsArgWith(1, null, false);
      const sendReminders = sinon.stub(reminders, 'sendReminders').callsArgWith(1, null);
      reminders.runReminder({}, function(err) {
          assert.equal(err, null);
          assert.equal(sendReminders.callCount, 0);
          done();
      });
  });

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

  it('sendReminders calls getClinics', done => {
      const getClinics = sinon.stub(reminders, 'getClinics').callsArgWith(1, null, []);

      reminders.sendReminders({}, function(err) {
          assert(getClinics.called);
          assert.equal(err, null);
          done();
      });
  });

  it('getClinics calls db view', done => {
      sinon.stub(db.medic, 'query').callsArgWith(2, null, {
          rows: [
              {
                  doc: {
                      id: 'xxx'
                  }
              }
          ]
      });

      reminders.getClinics({
          reminder: {}
      }, function(err, clinics) {
          assert(_.isArray(clinics));
          assert.equal(clinics.length, 1);
          assert.equal(_.first(clinics).id, 'xxx');
          assert(db.medic.query.called);
          done();
      });
  });

  it('getClinics ignores clinics with matching sent_reminders', done => {
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
                              ts: now.toISOString()
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
                              ts: now.toISOString()
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
                              ts: now.clone().add(1, 'hour').toISOString()
                          }
                      ]
                  }
              }
          ]
      });

      reminders.getClinics({
          reminder:{
              moment: now,
              form: 'XXX'
          }
      }, function(err, clinics) {
          var ids = _.pluck(clinics, 'id');
          assert.deepEqual(['xxx', 'yyy', 'yyz'], ids);
          assert.equal(clinics.length, 3);
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
      sinon.stub(reminders, 'getClinics').callsArgWith(1, null, clinics);
      const sendReminder = sinon.stub(reminders, 'sendReminder').callsArgWithAsync(1, null);
      reminders.sendReminders({}, function() {
          assert.equal(sendReminder.callCount, 2);
          done();
      });
  });

  it('sendReminder saves doc with added task to clinic', done => {
      const now = moment();
      const saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null);
      reminders.sendReminder({
          clinic: {
              contact: {
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
          assert.equal(task.ts, now.toISOString());
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
                  ts: now.clone().add(1, 'minute').toISOString()
              },
              {
                  form: 'XXY',
                  ts: now.toISOString()
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
                  ts: now.toISOString()
              },
              {
                  form: 'XXY',
                  ts: now.toISOString()
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
          assert.equal(call.args[0], 'medic/sent_reminders');

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
