var sinon = require('sinon'),
    db = require('../../db'),
    config = require('../../config'),
    migration = require('../../migrations/namespace-form-fields');

exports.tearDown = function (callback) {
  if (db.medic.view.restore) {
    db.medic.view.restore();
  }
  if (db.medic.get.restore) {
    db.medic.get.restore();
  }
  if (db.medic.insert.restore) {
    db.medic.insert.restore();
  }
  if (config.get.restore) {
    config.get.restore();
  }
  if (config.load.restore) {
    config.load.restore();
  }
  callback();
};

var forms =  {
  P: {
    meta: {
      code: 'P',
      label: {
        en: 'Pregnancy Registration LMP'
      }
    },
    fields: {
      last_menstrual_period: {
        labels: {
          tiny: {
            en: 'LMP'
          },
          description: {
            en: 'Weeks since last menstrual period'
          },
          short: {
            en: 'Weeks since LMP'
          }
        },
        type: 'integer'
      },
      patient_name: {
        labels: {
          tiny: {
            en: 'N'
          },
          description: {
            en: 'Patient Name'
          },
          short: {
            en: 'Name'
          }
        },
        type: 'string'
      }
    },
    public_form: true,
    use_sentinel: true
  }
};

exports['run does nothing if no data records'] = function(test) {
  test.expect(2);
  sinon.stub(config, 'load').callsArg(0);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  sinon.stub(config, 'get').returns({});
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['run does nothing if report already migrated'] = function(test) {
  test.expect(3);
  var doc = {
    _id: 'a',
    reported_date: '123',
    form: 'P',
    fields: { name: 'michael' }
  };
  sinon.stub(config, 'load').callsArg(0);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { id: 'a' } ] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, doc);
  sinon.stub(config, 'get').returns({});
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 1);
    test.done();
  });
};

exports['run does nothing if no form'] = function(test) {
  test.expect(3);
  var doc = {
    _id: 'a',
    reported_date: '123'
  };
  sinon.stub(config, 'load').callsArg(0);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { id: 'a' } ] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, doc);
  sinon.stub(config, 'get').returns({});
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 1);
    test.done();
  });
};

exports['run migrates report'] = function(test) {
  test.expect(8);
  var doc = {
    _id: 'a',
    reported_date: '123',
    form: 'P',
    last_menstrual_period: 22,
    patient_name: 'sarah'
  };
  var expected = {
    last_menstrual_period: 22,
    patient_name: 'sarah'
  };
  var getConfig = sinon.stub(config, 'load').callsArg(0);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { id: 'a' } ] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, doc);
  sinon.stub(config, 'get').returns(forms);
  var insert = sinon.stub(db.medic, 'insert').callsArgWith(1, null, null);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 1);
    test.equals(getConfig.callCount, 1);
    test.equals(insert.callCount, 1);
    test.same(insert.args[0][0].fields, expected);
    test.same(insert.args[0][0].last_menstrual_period, undefined);
    test.same(insert.args[0][0].patient_name, undefined);
    test.done();
  });
};