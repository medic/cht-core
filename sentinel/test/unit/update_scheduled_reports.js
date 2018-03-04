var sinon = require('sinon').sandbox.create(),
    db = require('../../db'),
    transition = require('../../transitions/update_scheduled_reports');

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['filter fails when scheduled form not present'] = function(test) {
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
        type: 'data_record',
        fields: {
          month: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    // month, year property and empty errors
    test.equals(transition.filter({
        form: 'x',
        type: 'data_record',
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
        type: 'data_record',
        fields: {
          month_num: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    // week, year property
    test.equals(transition.filter({
        form: 'x',
        type: 'data_record',
        fields: {
          week: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    // week_number, year property
    test.equals(transition.filter({
        form: 'x',
        type: 'data_record',
        fields: {
          week_number: 'x',
          year: 'x'
        },
        contact: contact
    }), true);
    test.done();
};

exports['use week view when doc has week property'] = function(test) {
  sinon.stub(db.medic, 'view').callsArg(3);
  transition._getDuplicates({fields:{week: 9}}, () => {
    test.equals(db.medic.view.args[0][1], 'reports_by_form_year_week_clinic_id_reported_date');
    test.done();
  });
};

exports['use month view when doc has month property'] = function(test) {
  sinon.stub(db.medic, 'view').callsArg(3);
  transition._getDuplicates({fields:{month: 9}}, () => {
    test.equals(db.medic.view.args[0][1], 'reports_by_form_year_month_clinic_id_reported_date');
    test.done();
  });
};

exports['calls audit.bulkSave with correct arguments'] = function(test) {
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  const bulkSave = sinon.stub(db.audit, 'bulkSave').callsArg(2);
  const change = {
    doc: {
      _id: 'abc',
      form: 'z',
      fields: {
        year: 2013,
        month: 4
      }
    }
  };

  transition.onMatch(change).then(changed => {
    test.equals(changed, true);
    test.equals(view.callCount, 1);
    test.equals(bulkSave.callCount, 1);
    test.ok(bulkSave.args[0][0]);
    test.equals(bulkSave.args[0][0].length, 0);
    test.ok(bulkSave.args[0][1]);
    test.done();
  });

};

exports['only one record in duplicates, mark transition complete'] = function(test) {
  // todo
  test.done();
};

exports['remove duplicates and replace with latest doc'] = function(test) {
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
  var bulkSave = sinon.stub(db.audit, 'bulkSave').callsArg(2);
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
  transition.onMatch(change).then(changed => {
    test.equals(changed, true);
    test.equals(bulkSave.callCount, 1);
    test.same(bulkSave.args[0][0].length, 2);
    // new doc inherits id/rev from previous record and is deleted
    bulkSave.args[0][0].forEach(function(doc) {
      if (doc._id === 'abc') {
        test.same(doc._rev, '1-dddd');
        test.same(doc.fields.pills, 22);
      }
      if (doc._id === 'xyz') {
        test.same(doc._deleted, true);
      }
    });
    test.ok(bulkSave.args[0][1].all_or_nothing);
    test.done();
  });
};
