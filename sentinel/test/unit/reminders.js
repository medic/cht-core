var _ = require('underscore'),
    moment = require('moment'),
    sinon = require('sinon').sandbox.create(),
    config = require('../../config'),
    reminders = require('../../schedule/reminders');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    callback();
};

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['reminders#execute is function'] = function(test) {
    test.expect(1);
    test.ok(_.isFunction(reminders.execute));
    test.done();
};

exports['config with no reminders calls callback'] = function(test) {
    test.expect(1);
    sinon.stub(config, 'get').returns([]);
    sinon.stub(reminders, 'runReminder').throws();
    reminders.execute({}, function(err) {
        test.equals(err, null);
        test.done();
    });
};

exports['config with three matching reminder calls runReminder thrice'] = function(test) {
    test.expect(2);
    var runReminder;
    sinon.stub(config, 'get').returns([
        {form:'x', cron:'x', message:'x'},
        {form:'y', cron:'y', message:'y'},
        {form:'z', cron:'z', message:'z'}
    ]);
    runReminder = sinon.stub(reminders, 'runReminder').callsArgWith(1, null);
    reminders.execute({}, function(err) {
        test.equals(err, null);
        test.equals(runReminder.callCount, 3);
        test.done();
    });
};

exports['runReminder calls sendReminder when valid'] = function(test) {
    var sendReminders,
        matchReminder;

    matchReminder = sinon.stub(reminders, 'matchReminder').callsArgWith(1, null, moment());
    sendReminders = sinon.stub(reminders, 'sendReminders').callsArgWith(1, null);

    reminders.runReminder({}, function(err) {
        test.equals(err, null);
        test.equals(sendReminders.callCount, 1);
        test.done();
    });
};

exports['runReminder does not create document when no match'] = function(test) {
    var sendReminders,
        matchReminder;

    matchReminder = sinon.stub(reminders, 'matchReminder').callsArgWith(1, null, false);
    sendReminders = sinon.stub(reminders, 'sendReminders').callsArgWith(1, null);

    reminders.runReminder({}, function(err) {
        test.equals(err, null);
        test.equals(sendReminders.callCount, 0);
        test.done();
    });
};

exports['matches reminder with moment if in last hour'] = function(test) {
    var ts = moment().startOf('hour');
    sinon.stub(reminders, 'getReminderWindow').callsArgWithAsync(1, null, moment().subtract(1, 'hour'));

    reminders.matchReminder({
        reminder: {
            cron: moment().format('0 HH * * *') // will generate cron job matching the current hour
        }
    }, function(err, matches) {
        test.equals(err, null);
        test.ok(matches);
        test.equals(matches.valueOf(), ts.valueOf());
        test.done();
    });
};

exports['runReminder decorates options with moment if found'] = function(test) {
    var sendReminders,
        matchReminder,
        now = moment(),
        options = {};

    matchReminder = sinon.stub(reminders, 'matchReminder').callsArgWith(1, null, now);
    sendReminders = sinon.stub(reminders, 'sendReminders').callsArgWith(1, null);

    reminders.runReminder(options, function() {
        var moment = sendReminders.getCall(0).args[0].moment;

        test.ok(moment);
        test.equals(moment.valueOf(), now.valueOf());

        test.done();
    });
};

exports['does not match reminder if in next minute'] = function(test) {
    var past = moment().subtract(1, 'hour'),
        now = moment();

    sinon.stub(reminders, 'getReminderWindow').callsArgWithAsync(1, null, past);

    reminders.matchReminder({
        reminder: {
             // generate cron job 1 minute into future
            cron: now.clone().add(1, 'minute').format('m HH * * *')
        }
    }, function(err, matches) {
        test.equals(err, null);
        test.equals(matches, false);
        test.done();
    });
};

exports['does not match if previous to reminder'] = function(test) {
    var now = moment().subtract(2, 'hours');
    sinon.stub(reminders, 'getReminderWindow').callsArgWithAsync(1, null, moment().subtract(1, 'hour'));

    reminders.matchReminder({
        reminder: {
            cron: now.format('59 HH * * *') // will generate cron job matching the previous hour
        }
    }, function(err, matches) {
        test.equals(err, null);
        test.equals(matches, false);
        test.done();
    });
};

exports['sendReminders calls getClinics'] = function(test) {
    var getClinics = sinon.stub(reminders, 'getClinics').callsArgWith(1, null, []);

    reminders.sendReminders({}, function(err) {
        test.ok(getClinics.called);
        test.equals(err, null);
        test.done();
    });
};

exports['getClinics calls db view'] = function(test) {
    var db = {
        medic: {
            view: function() {}
        }
    };
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [
            {
                doc: {
                    id: 'xxx'
                }
            }
        ]
    });

    reminders.getClinics({
        db: db,
        reminder: {}
    }, function(err, clinics) {
        test.ok(_.isArray(clinics));
        test.equals(clinics.length, 1);
        test.equals(_.first(clinics).id, 'xxx');
        test.ok(db.medic.view.called);
        test.done();
    });
};

exports['getClinics ignores clinics with matching sent_reminders'] = function(test) {
    var db,
        now = moment().startOf('hour');

    db = {
        medic: {
            view: function() {}
        }
    };
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
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
        },
        db: db
    }, function(err, clinics) {
        var ids = _.pluck(clinics, 'id');

        test.same(['xxx', 'yyy', 'yyz'], ids);
        test.equals(clinics.length, 3);
        test.done();
    });
};

exports['sendReminders calls sendReminder for each clinic'] = function(test) {
    var clinics,
        getClinics,
        sendReminder;

    clinics = [
        {
            id: 'xxx'
        },
        {
            id: 'yyy'
        }
    ];

    getClinics = sinon.stub(reminders, 'getClinics').callsArgWith(1, null, clinics);
    sendReminder = sinon.stub(reminders, 'sendReminder').callsArgWithAsync(1, null);

    reminders.sendReminders({}, function() {
        test.equals(sendReminder.callCount, 2);
        test.done();
    });
};

exports['sendReminder saves doc with added task to clinic'] = function(test) {
    var db = {
            medic: {
                insert: function() {}
            }
        },
        now = moment(),
        saveDoc = sinon.stub(db.medic, 'insert').callsArgWithAsync(1, null);

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
        var clinic,
            message,
            task;

        test.ok(saveDoc.called);

        clinic = saveDoc.getCall(0).args[0];
        test.ok(clinic.tasks);

        task = _.first(clinic.tasks);
        message = _.first(task.messages);
        test.equals(message.to, '+1234');
        test.ok(message.message.indexOf(now.format('YYYY')) > 0);
        test.ok(message.message.indexOf(now.format('w')) > 0);

        test.equals(task.form, 'XXX');
        test.equals(task.ts, now.toISOString());

        test.done();
    });
};

exports['canSend returns true if no tasks matching reminder'] = function(test) {
    var canSend,
        now = moment();

    canSend = reminders.canSend({
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

    test.equals(canSend, true);
    test.done();
};

exports['canSend returns false if a task matches reminder'] = function(test) {
    var canSend,
        now = moment();

    canSend = reminders.canSend({
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

    test.equals(canSend, false);
    test.done();
};

exports['canSend returns false if a sent_forms within lockout period of reminder'] = function(test) {
    var canSend,
        now = moment();

    canSend = reminders.canSend({
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

    test.equals(canSend, false);
    test.done();
};

exports['canSend returns true if a sent_forms outside of lockout period of reminder'] = function(test) {
    var canSend,
        now = moment();

    canSend = reminders.canSend({
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

    test.equals(canSend, true);
    test.done();
};

exports['getReminderWindow returns a day ago when no results from db'] = function(test) {
    var db,
        view,
        time = moment().startOf('hour').subtract(1, 'day');

    db = {
        medic: {
            view: function() {}
        }
    };

    view = sinon.stub(db.medic, 'view').callsArgWithAsync(3, null, {
        rows: []
    });

    reminders.getReminderWindow({
        db: db
    }, function(err, start) {
        test.equals(err, null);
        test.ok(start);
        test.equals(start.valueOf(), time.valueOf());
        test.done();
    });
};

exports['getReminderWindow calls view looking for old events and returns date found'] = function(test) {
    var now = moment();

    var db = {
        medic: {
            view: function() {}
        }
    };

    var view = sinon.stub(db.medic, 'view').callsArgWithAsync(3, null, {
        rows: [
            {
                key: [ 'XXX', now.clone().subtract(1, 'hour').toISOString() ]
            }
        ]
    });

    reminders.getReminderWindow({
        reminder: {
            form: 'XXX'
        },
        db: db
    }, function(err, start) {
        var call = view.getCall(0),
            viewOpts = call.args[2];

        test.equals(view.callCount, 1);
        test.equals(call.args[0], 'medic');
        test.equals(call.args[1], 'sent_reminders');

        test.equals(viewOpts.limit, 1);
        test.ok(viewOpts.startkey);
        test.same(viewOpts.startkey[0], 'XXX');

        // time within 1000ms
        test.same(Math.floor(moment(viewOpts.startkey[1]).valueOf() / 1000), Math.floor(moment().valueOf() / 1000));

        test.same(viewOpts.endkey, ['XXX', now.clone().startOf('hour').subtract(1, 'day').toISOString()]);
        test.equals(viewOpts.descending, true);

        test.equals(start.toISOString(), now.clone().subtract(1, 'hour').toISOString());
        test.done();
    });
};
