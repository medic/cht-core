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

exports['filter fails when scheduled form not present'] = function(test) {
    var contact = {
        phone: 'x'
    };
    test.equals(transition.filter({}), false);
    test.equals(transition.filter({
        patient_id: 'x',
    }), false);
    test.done();
};
exports['filter fails when errors are on doc'] = function(test) {
    var contact = {
        phone: 'x'
    };
    test.equals(transition.filter({
        form: 'x',
        fields: {
          month: 'x',
          year: 'y'
        },
        contact: contact,
        errors: ['x']
    }), false);
    test.done();
};
exports['filter fails when no year value on form submission'] = function(test) {
    var contact = {
        phone: 'x'
    };
    test.equals(transition.filter({
        form: 'x',
        fields: {
          month: 'x'
        },
        contact: contact
    }), false);
    test.done();
};

exports['filter passes when'] = function(test) {
    var contact = {
        phone: 'x'
    };
    // month, year property
    test.equals(transition.filter({
        form: 'x',
        fields: {
          month: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    // month, year property and empty errors
    test.equals(transition.filter({
        form: 'x',
        fields: {
          month: 'x',
          year: 'x'
        },
        contact: contact,
        errors: []
    }), true);
    // month_num, year property
    test.equals(transition.filter({
        form: 'x',
        fields: {
          month_num: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    // week, year property
    test.equals(transition.filter({
        form: 'x',
        fields: {
          week: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    // week_number, year property
    test.equals(transition.filter({
        form: 'x',
        fields: {
          week_number: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    test.done();
};

exports['use week view when doc has week property'] = function(test) {
  var db = {
    medic: {
      view: function(ddoc, view) {
        test.same(
            view,
            'data_records_by_form_year_week_clinic_id_and_reported_date'
        );
        test.done();
      }
    }
  };
  transition._getDuplicates(db, {fields:{week: 9}});
};

exports['use month view when doc has month property'] = function(test) {
  var db = {
    medic: {
      view: function(ddoc, view) {
          test.same(
              view,
              'data_records_by_form_year_month_clinic_id_and_reported_date'
          );
          test.done();
      }
    }
  };
  transition._getDuplicates(db, {fields:{month: 9}});
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
          fields: {
            year: 2013,
            month: 4
          }
      }
  }, db, audit, function(err, complete) {
      test.equals(complete, true);
  });

  test.equals(view.callCount, 1);
  test.equals(bulkSave.callCount, 1);
  test.done();
};

exports['only one record in duplicates, mark transition complete'] = function(test) {
  // todo
  test.done();
};

exports['remove duplicates and replace with latest doc'] = function(test) {
  test.expect(7);
  var db = {
    medic: {
      view: function() {}
    }
  };
  var audit = {
      bulkSave: function(docs, options, cb) {
          test.same(docs.length, 2);
          test.ok(options.all_or_nothing);
          // new doc inherits id/rev from previous record and is deleted
          docs.forEach(function(doc) {
            if (doc._id === 'abc') {
              test.same(doc._rev, '1-dddd');
              test.same(doc.fields.pills, 22);
            }
            if (doc._id === 'xyz') {
              test.same(doc._deleted, true);
            }
          });
          cb();
      }
  };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    // ascending records
    rows: [
      {
        key: [2013,4],
        doc: {
          _id: 'abc',
          _rev: '1-dddd',
          form: 'z',
          fields: {
            month: 4,
            year: 2013,
            pills: 12
          },
          reported_date: 100
        }
      },
      {
        key: [2013,4],
        doc: {
          _id: 'xyz',
          _rev: '1-kkkk',
          form: 'z',
          fields: {
            month: 4,
            year: 2013,
            pills: 22
          },
          reported_date: 200
        }
      }
    ]
  });
  var bulkSave = sinon.spy(audit, 'bulkSave');
  var change = {
    doc: {
        _id: 'xyz',
        _rev: '1-kkkk',
        form: 'z',
        fields: {
          month: 4,
          year: 2013,
          pills: 22
        },
        reported_date: 200
    }
  };
  transition.onMatch(change, db, audit, function(err, complete) {
    test.equals(complete, true);
    test.equals(bulkSave.callCount, 1);
    test.done();
  });
};
