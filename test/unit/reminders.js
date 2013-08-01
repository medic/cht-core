var _ = require('underscore'),
    sinon = require('sinon'),
    config = require('../../config'),
    reminders = require('../../schedule/reminders');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    callback();
};

exports['reminders#execute is function'] = function(test) {
    test.ok(_.isFunction(reminders.execute));
    test.done();
}

exports['config with no schedules calls callback'] = function(test) {
    sinon.stub(config, 'get').returns([]);
    sinon.stub(reminders, 'runSchedule').throws();
    reminders.execute({}, function(err) {
        test.equals(err, null);
        reminders.runSchedule.restore();
        config.get.restore();
        test.done();
    });
};

exports['config with three matching schedule calls runSchedule thrice'] = function(test) {
    var runSchedule;

    sinon.stub(config, 'get').returns([
        {
            schedule: '0 8 * * 1',
            message: 'abcd'
        },
        {
            schedule: '0 8 * * 1',
            message: 'abcd'
        },
        {
            schedule: '0 8 * * 1',
            message: 'abcd'
        }
    ]);
    runSchedule = sinon.stub(reminders, 'runSchedule').callsArgWith(1, null);
    reminders.execute({}, function(err) {
        test.equals(err, null);
        test.equals(runSchedule.callCount, 3);

        runSchedule.restore();
        config.get.restore();

        test.done();
    });
};
