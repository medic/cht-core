var migration = require('../js-migrations');

var _migrations = {
  hoursToMinutes: {
    version: '1.0.0',
    up: function(doc) {
      if (!doc.hours) {
        return { error: 'Hours is required' }
      } else {
        doc.minutes = doc.hours * 60;
        delete doc.hours;
        return { error: false, result: doc };
      }
    },
    down: function(doc, cb) {
      doc.hours = doc.minutes / 60;
      delete doc.minutes;
      return { error: false, result: doc };
    }
  },
  minutesToHoursAndMinutes: {
    version: '1.0.2',
    up: function(doc, cb) {
      doc.hours = Math.floor(doc.minutes / 60);
      doc.minutes = doc.minutes % 60;
      return { error: false, result: doc };
    },
    down: function(doc, cb) {
      doc.minutes = doc.hours * 60 + doc.minutes;
      delete doc.hours;
      return { error: false, result: doc };
    }
  },
  roundMinutesToNearestTen: {
    version: '1.1.0',
    up: function(doc, cb) {
      doc.minutes = Math.round(doc.minutes / 10) * 10;
      return { error: false, result: doc };
    }
  },
  missingVersion: {
    up: function(doc, cb) {
      return { error: false, result: doc };
    }
  },
  invalidVersion: {
    version: 'banana',
    up: function(doc, cb) {
      return { error: false, result: doc };
    }
  }
};

exports['simple migration'] = function(test) {
  var migrations = [
    _migrations.hoursToMinutes
  ];
  var result = migration.migrate({ hours: 2 }, migrations);
  test.deepEqual(result, { error: false, result: { minutes: 120 } });
  test.done();
};

exports['multiple migrations'] = function(test) {
  var migrations = [
    _migrations.hoursToMinutes,
    _migrations.minutesToHoursAndMinutes
  ];
  var result = migration.migrate({ hours: 2.25 }, migrations);
  test.deepEqual(result, { error: false, result: { hours: 2, minutes: 15 } });
  test.done();
};

exports['migration order is based on version'] = function(test) {
  var migrations = [
    _migrations.minutesToHoursAndMinutes,
    _migrations.hoursToMinutes
  ];
  var result = migration.migrate({ hours: 2.25 }, migrations);
  test.deepEqual(result, { error: false, result: { hours: 2, minutes: 15 } });
  test.done();
};

exports['migration start is based on from'] = function(test) {
  var migrations = [
    _migrations.minutesToHoursAndMinutes,
    _migrations.hoursToMinutes,
    _migrations.roundMinutesToNearestTen
  ];
  var result = migration.migrate({ minutes: 135 }, migrations, { from: '1.0.0' });
  test.deepEqual(result, { error: false, result: { hours: 2, minutes: 20 } });
  test.done();
};

exports['migration end is based on to'] = function(test) {
  var migrations = [
    _migrations.minutesToHoursAndMinutes,
    _migrations.hoursToMinutes,
    _migrations.roundMinutesToNearestTen
  ];
  var result = migration.migrate({ minutes: 135 }, migrations, { from: '1.0.0', to: '1.0.2' });
  test.deepEqual(result, { error: false, result: { hours: 2, minutes: 15 } });
  test.done();
};

exports['migration down'] = function(test) {
  var migrations = [
    _migrations.minutesToHoursAndMinutes,
    _migrations.hoursToMinutes,
    _migrations.roundMinutesToNearestTen
  ];
  var result = migration.migrate({ hours: 2, minutes: 20 }, migrations, { from: '1.1.0', to: '1.0.0' });
  test.deepEqual(result, { error: false, result: { minutes: 140 } });
  test.done();
};

exports['missing migrations does nothing'] = function(test) {
  var result = migration.migrate({ hours: 2, minutes: 20 });
  test.deepEqual(result, { error: false, result: { hours: 2, minutes: 20 } });
  test.done();
};

exports['empty migrations does nothing'] = function(test) {
  var result = migration.migrate({ hours: 2, minutes: 20 }, []);
  test.deepEqual(result, { error: false, result: { hours: 2, minutes: 20 } });
  test.done();
};

exports['migration returns error'] = function(test) {
  var migrations = [
    _migrations.hoursToMinutes
  ];
  var result = migration.migrate({ minutes: 200 }, migrations);
  test.equal(result.error, 'Hours is required');
  test.done();
};

exports['missing doc'] = function(test) {
  var migrations = [
    _migrations.hoursToMinutes
  ];
  var result = migration.migrate(undefined, migrations);
  test.deepEqual(result, { error: false, result: undefined });
  test.done();
};

exports['migration missing version'] = function(test) {
  var migrations = [
    _migrations.missingVersion
  ];
  var result = migration.migrate({}, migrations);
  test.equal(result.error, 'A migration is missing the required version property');
  test.done();
};

exports['migration invalid version'] = function(test) {
  var migrations = [
    _migrations.invalidVersion
  ];
  var result = migration.migrate({}, migrations);
  test.equal(result.error, 'A migration has an invalid version property');
  test.done();
};

exports['invalid from version'] = function(test) {
  var result = migration.migrate({}, [], { from: 'inversion' });
  test.equal(result.error, 'Invalid from version provided');
  test.done();
};

exports['invalid to version'] = function(test) {
  var result = migration.migrate({}, [], { to: '1.x' });
  test.equal(result.error, 'Invalid to version provided');
  test.done();
};
