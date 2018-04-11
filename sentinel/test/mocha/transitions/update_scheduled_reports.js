const sinon = require('sinon').sandbox.create(),
      db = require('../../../db'),
      transition = require('../../../transitions/update_scheduled_reports');

describe('update_scheduled_reports', () => {

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('filter', () => {

    it('fails when scheduled form not present', () => {
      transition.filter({ patient_id: 'x' }).should.equal(false);
    });

    it('fails when errors are on doc', () => {
      transition.filter({
        form: 'x',
        fields: {
          month: 'x',
          year: 'y'
        },
        contact: {
          phone: 'x'
        },
        errors: ['x']
      }).should.equal(false);
    });

    it('fails when no year value on form submission', () => {
      transition.filter({
        form: 'x',
        fields: {
          month: 'x'
        },
        contact: {
          phone: 'x'
        }
      }).should.equal(false);
    });

    it('passes when month, year property', () => {
      transition.filter({
        form: 'x',
        type: 'data_record',
        fields: {
          month: 'x',
          year: 'x'
        },
        contact: {
          phone: 'x'
        }
      }).should.equal(true);
    });

    it('passes when month, year property and empty errors', () => {
      transition.filter({
        form: 'x',
        type: 'data_record',
        fields: {
          month: 'x',
          year: 'x'
        },
        contact: {
          phone: 'x'
        },
        errors: []
      }).should.equal(true);
    });

    it('passes when month_num, year property', () => {
      transition.filter({
        form: 'x',
        type: 'data_record',
        fields: {
          month_num: 'x',
          year: 'x'
        },
        contact: {
          phone: 'x'
        }
      }).should.equal(true);
    });

    it('passes when week, year property', () => {
      transition.filter({
        form: 'x',
        type: 'data_record',
        fields: {
          week: 'x',
          year: 'x'
        },
        contact: {
          phone: 'x'
        }
      }).should.equal(true);
    });

    it('passes when week_number, year property', () => {
      transition.filter({
        form: 'x',
        type: 'data_record',
        fields: {
          week_number: 'x',
          year: 'x'
        },
        contact: {
          phone: 'x'
        }
      }).should.equal(true);
    });
  });

  describe('getDuplicates', () => {
    it('use week view when doc has week property', done => {
      sinon.stub(db.medic, 'view').callsArg(3);
      transition._getDuplicates({fields:{week: 9}}, () => {
        db.medic.view.args[0][1].should.equal('reports_by_form_year_week_clinic_id_reported_date');
        done();
      });
    });

    it('use month view when doc has month property', done => {
      sinon.stub(db.medic, 'view').callsArg(3);
      transition._getDuplicates({fields:{month: 9}}, () => {
        db.medic.view.args[0][1].should.equal('reports_by_form_year_month_clinic_id_reported_date');
        done();
      });
    });
  });

  describe('onMatch', () => {
    it('calls audit.bulkSave with correct arguments', done => {
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
        changed.should.equal(true);
        view.callCount.should.equal(1);
        bulkSave.callCount.should.equal(1);
        bulkSave.args[0][0].length.should.equal(0);
        done();
      });

    });

    it('remove duplicates and replace with latest doc', done => {
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
      const bulkSave = sinon.stub(db.audit, 'bulkSave').callsArg(2);
      const change = {
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
        changed.should.equal(true);
        bulkSave.callCount.should.equal(1);
        bulkSave.args[0][0].length.should.equal(2);
        // new doc inherits id/rev from previous record and is deleted
        bulkSave.args[0][0].forEach(doc => {
          if (doc._id === 'abc') {
            doc._rev.should.equal('1-dddd');
            doc.fields.pills.should.equal(22);
          }
          if (doc._id === 'xyz') {
            doc._deleted.should.equal(true);
          }
        });
        done();
      });
    });
  });
});
