var _ = require('underscore'),
    sinon = require('sinon'),
    transition = require('../../transitions/update_scheduled_reports'),
    utils = require('../../lib/utils');

exports.tearDown = function(callback) {
    if (utils.getRegistrations.restore) {
        utils.getRegistrations.restore();
    }
    callback();
};

exports['onMatch signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 4);
    test.done();
};

exports['filter signature'] = function(test) {
    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
};

exports['filter tests'] = function(test) {
    var contact = {
        phone: "x"
    };
    test.equals(transition.filter({}), false);
    test.equals(transition.filter({
        patient_id: 'x',
    }), false);
    // has errors
    test.equals(transition.filter({
        form: 'x',
        month: 'x',
        contact: contact,
        errors: ['x']
    }), false);
    // missing year property
    test.equals(transition.filter({
        form: 'x',
        month: 'x',
        contact: contact
    }), false);
    // month, year property
    test.equals(transition.filter({
        form: 'x',
        month: 'x',
        year: 'x',
        contact: contact
    }), true);
    // month, year property and empty errors
    test.equals(transition.filter({
        form: 'x',
        month: 'x',
        year: 'x',
        contact: contact,
        errors: []
    }), true);
    // month_num, year property
    test.equals(transition.filter({
        form: 'x',
        month_num: 'x',
        year: 'x',
        contact: contact
    }), true);
    // week, year property
    test.equals(transition.filter({
        form: 'x',
        week: 'x',
        year: 'x',
        contact: contact
    }), true);
    // week_number, year property
    test.equals(transition.filter({
        form: 'x',
        week_number: 'x',
        year: 'x',
        contact: contact
    }), true);
    test.done();
};

exports['calls audit.bulkSave with correct arguments'] = function(test) {
  test.expect(7);

  var db = {
    medic: {
      view: function() {}
    }
  };

  var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});

  var audit = {
    bulkSave: function(docs, options, callback) {
      test.ok(docs);
      test.ok(docs.length === 0);
      test.ok(options);
      test.ok(typeof(callback) === 'function');
      callback();
    }
  };

  var bulkSave = sinon.spy(audit, 'bulkSave');

  transition.onMatch({
    doc: {
        _id: 'abc',
        form: 'z',
        year: 2013,
        month: 4
    }
  }, db, audit, function(err, complete) {
    test.equals(complete, true);
  });

  test.equals(view.callCount, 1);
  test.equals(bulkSave.callCount, 1);
  test.done();
};

exports['merge duplicates'] = function(test) {
  // TODO
  var db = {
    medic: {
      view: function() {},
      bulkDocs: function(options, callback) {
        callback();
      }
    }
  };
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      {
        _id: 'abc',
        key: [2013,4],
        doc: {
          form: 'z',
          month: 4,
          year: 2013
        },
      },
      {
        _id: 'xyz',
        key: [2013,4],
        doc: {
          form: 'z',
          month: 4,
          year: 2013
        }
      }
    ]
  });
  test.done();
};
