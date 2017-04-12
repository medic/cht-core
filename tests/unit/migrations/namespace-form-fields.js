var sinon = require('sinon'),
    db = require('../../../db'),
    config = require('../../../config'),
    utils = require('../utils'),
    migration = require('../../../migrations/namespace-form-fields');

exports.tearDown = function (callback) {
  utils.restore(
    db.medic.view,
    db.medic.bulk,
    config.get,
    config.load
  );
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
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { total_rows: 0, rows: [] });
  sinon.stub(config, 'get').returns({});
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['run does nothing if report already migrated'] = function(test) {
  test.expect(2);
  var doc = {
    _id: 'a',
    reported_date: '123',
    form: 'P',
    fields: { name: 'michael' }
  };
  sinon.stub(config, 'load').callsArg(0);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { total_rows: 1, rows: [ { doc: doc } ] });
  sinon.stub(config, 'get').returns({});
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['run does nothing if no form'] = function(test) {
  test.expect(2);
  var doc = {
    _id: 'a',
    reported_date: '123'
  };
  sinon.stub(config, 'load').callsArg(0);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { total_rows: 1, rows: [ { doc: doc } ] });
  sinon.stub(config, 'get').returns({});
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['run migrates report'] = function(test) {
  test.expect(7);
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
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { total_rows: 1, rows: [ { doc: doc } ] });
  sinon.stub(config, 'get').returns(forms);
  var bulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, null, null);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getConfig.callCount, 1);
    test.equals(bulk.callCount, 1);
    test.same(bulk.args[0][0].docs[0].fields, expected);
    test.same(bulk.args[0][0].docs[0].last_menstrual_period, undefined);
    test.same(bulk.args[0][0].docs[0].patient_name, undefined);
    test.done();
  });
};

exports['run migrates in batches'] = function(test) {
  test.expect(10);
  var BATCH_SIZE = 1;
  var docs = [
      {
        _id: 'a',
        reported_date: '123',
        form: 'P',
        last_menstrual_period: 22,
        patient_name: 'sarah'
      },
      {
        _id: 'b',
        reported_date: '456',
        form: 'P',
        last_menstrual_period: 12,
        patient_name: 'jane'
      }
  ];
  var expected = [
    {
      last_menstrual_period: 22,
      patient_name: 'sarah'
    },
    {
      last_menstrual_period: 12,
      patient_name: 'jane'
    }
  ];
  var getConfig = sinon.stub(config, 'load').callsArg(0);

  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null,
    { total_rows: 2, rows: [ { doc: docs[0] } ] });
  getView.onCall(1).callsArgWith(3, null,
    { total_rows: 2, rows: [ { doc: docs[1] } ] });

  sinon.stub(config, 'get').returns(forms);

  var bulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, null, null);

  migration._runWithBatchSize(BATCH_SIZE, function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(getConfig.callCount, 1);
    test.equals(bulk.callCount, 2);

    test.same(bulk.args[0][0].docs[0].fields, expected[0]);
    test.same(bulk.args[0][0].docs[0].last_menstrual_period, undefined);
    test.same(bulk.args[0][0].docs[0].patient_name, undefined);

    test.same(bulk.args[1][0].docs[0].fields, expected[1]);
    test.same(bulk.args[1][0].docs[0].last_menstrual_period, undefined);
    test.same(bulk.args[1][0].docs[0].patient_name, undefined);

    test.done();
  });
};
