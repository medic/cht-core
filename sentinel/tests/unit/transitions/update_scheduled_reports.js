const sinon = require('sinon'),
  assert = require('chai').assert,
  db = require('../../../src/db-nano'),
  dbPouch = require('../../../src/db-pouch'),
  transition = require('../../../src/transitions/update_scheduled_reports');

describe('update_scheduled_reports', () => {
  afterEach(() => sinon.restore());

  describe('filter', () => {
    it('fails when scheduled form not present', () => {
      assert.equal(transition.filter({ patient_id: 'x' }), false);
    });

    it('fails when errors are on doc', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          fields: {
            month: 'x',
            year: 'y',
          },
          contact: {
            phone: 'x',
          },
          errors: ['x'],
        }),
        false
      );
    });

    it('fails when no year value on form submission', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          fields: {
            month: 'x',
          },
          contact: {
            phone: 'x',
          },
        }),
        false
      );
    });

    it('passes when month, year property', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          type: 'data_record',
          fields: {
            month: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        }),
        true
      );
    });

    it('passes when month, year property and empty errors', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          type: 'data_record',
          fields: {
            month: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
          errors: [],
        }),
        true
      );
    });

    it('passes when month_num, year property', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          type: 'data_record',
          fields: {
            month_num: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        }),
        true
      );
    });

    it('passes when week, year property', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          type: 'data_record',
          fields: {
            week: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        }),
        true
      );
    });

    it('passes when week_number, year property', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          type: 'data_record',
          fields: {
            week_number: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        }),
        true
      );
    });
  });

  describe('getDuplicates', () => {
    it('use week view when doc has week property', done => {
      sinon.stub(db.medic, 'view').callsArg(3);
      transition._getDuplicates({ fields: { week: 9 } }, () => {
        assert.equal(
          db.medic.view.args[0][1],
          'reports_by_form_year_week_clinic_id_reported_date'
        );
        done();
      });
    });

    it('use month view when doc has month property', done => {
      sinon.stub(db.medic, 'view').callsArg(3);
      transition._getDuplicates({ fields: { month: 9 } }, () => {
        assert.equal(
          db.medic.view.args[0][1],
          'reports_by_form_year_month_clinic_id_reported_date'
        );
        done();
      });
    });
  });

  describe('onMatch', () => {
    it('calls bulkDocs with correct arguments', () => {
      const view = sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, { rows: [] });
      const bulkSave = sinon.stub(dbPouch.medic, 'bulkDocs').callsArg(2);
      const change = {
        doc: {
          _id: 'abc',
          form: 'z',
          fields: {
            year: 2013,
            month: 4,
          },
        },
      };

      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(view.callCount, 1);
        assert.equal(bulkSave.callCount, 1);
        assert.equal(bulkSave.args[0][0].length, 0);
      });
    });

    it('remove duplicates and replace with latest doc', done => {
      sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        // ascending records
        rows: [
          {
            key: [2013, 4],
            doc: {
              _id: 'abc',
              _rev: '1-dddd',
              form: 'z',
              fields: {
                month: 4,
                year: 2013,
                pills: 12,
              },
              reported_date: 100,
            },
          },
          {
            key: [2013, 4],
            doc: {
              _id: 'xyz',
              _rev: '1-kkkk',
              form: 'z',
              fields: {
                month: 4,
                year: 2013,
                pills: 22,
              },
              reported_date: 200,
            },
          },
        ],
      });
      const bulkSave = sinon.stub(dbPouch.medic, 'bulkDocs').callsArg(2);
      const change = {
        doc: {
          _id: 'xyz',
          _rev: '1-kkkk',
          form: 'z',
          fields: {
            month: 4,
            year: 2013,
            pills: 22,
          },
          reported_date: 200,
        },
      };
      transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(bulkSave.callCount, 1);
        assert.equal(bulkSave.args[0][0].length, 2);
        // new doc inherits id/rev from previous record and is deleted
        bulkSave.args[0][0].forEach(doc => {
          if (doc._id === 'abc') {
            assert.equal(doc._rev, '1-dddd');
            assert.equal(doc.fields.pills, 22);
          }
          if (doc._id === 'xyz') {
            assert.equal(doc._deleted, true);
          }
        });
        done();
      });
    });
  });
});
