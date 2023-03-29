const sinon = require('sinon');
const assert = require('chai').assert;
const db = require('../../../src/db');
const config = require('../../../src/config');

describe('update_scheduled_reports', () => {
  let transition;
  let transitionUtils;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub().returns([
        { id: 'person', parents: ['clinic'], person: true },
        { id: 'clinic', parents: ['health_center'] },
        { id: 'health_center' }
      ]),
    });
    transition = require('../../../src/transitions/update_scheduled_reports');
    transitionUtils = require('../../../src/transitions/utils');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  describe('filter', () => {
    it('fails when scheduled form not present', () => {
      assert.equal(transition.filter({ doc: { patient_id: 'x' } }), false);
    });

    it('fails when errors are on doc', () => {
      assert.equal(transition.filter({
        doc: {
          form: 'x',
          fields: {
            month: 'x',
            year: 'y',
          },
          contact: {
            phone: 'x',
          },
          errors: ['x'],
        }
      }), false);
    });

    it('fails when no year value on form submission', () => {
      assert.equal(transition.filter({
        doc: {
          form: 'x',
          fields: {
            month: 'x',
          },
          contact: {
            phone: 'x',
          },
        }
      }), false);
    });

    it('passes when month, year property', () => {
      assert.equal(transition.filter({
        doc: {
          form: 'x',
          type: 'data_record',
          fields: {
            month: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        },
        info: {}
      }), true);
    });

    it('passes when month, year property and empty errors', () => {
      assert.equal(transition.filter({
        doc: {
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
        },
        info: {}
      }), true);
    });

    it('passes when month_num, year property', () => {
      assert.equal(transition.filter({
        doc: {
          form: 'x',
          type: 'data_record',
          fields: {
            month_num: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        },
        info: {}
      }), true);
    });

    it('passes when week, year property', () => {
      assert.equal(transition.filter({
        doc: {
          form: 'x',
          type: 'data_record',
          fields: {
            week: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        },
        info: {}
      }), true);
    });

    it('passes when week_number, year property', () => {
      assert.equal(transition.filter({
        doc: {
          form: 'x',
          type: 'data_record',
          fields: {
            week_number: 'x',
            year: 'x',
          },
          contact: {
            phone: 'x',
          },
        },
        info: {}
      }), true);
    });

    it('should fail when transition already run', () => {
      sinon.stub(transitionUtils, 'hasRun').returns(true);
      assert.equal(transition.filter({
        doc: {
          form: 'x',
          fields: { week: 1, year: 2 },
          type: 'data_record'
        },
        info: 'info'
      }), false);

      assert.equal(transitionUtils.hasRun.callCount, 1);
      assert.deepEqual(transitionUtils.hasRun.args[0], ['info', 'update_scheduled_reports']);
    });
  });

  describe('getDuplicates', () => {
    it('should not query when clinic not found', () => {
      const doc = {
        type: 'data_record',
        form: 'form',
        fields: {
          week: 9,
          year: 2018
        }
      };
      sinon.stub(db.medic, 'query');

      return transition._getDuplicates(doc).then(result => {
        assert.equal(result, undefined);
        assert.equal(db.medic.query.callCount, 0);
      });
    });

    it('use week view when doc has week property', () => {
      const doc = {
        type: 'data_record',
        form: 'form',
        contact: { parent: { _id: 'clinic', type: 'clinic' } },
        fields: {
          week: 9,
          year: 2018
        }
      };
      sinon.stub(db.medic, 'query').resolves({ rows: [{ doc }] });
      return transition._getDuplicates(doc).then(result => {
        assert.equal(
          db.medic.query.args[0][0],
          'medic/reports_by_form_year_week_parent_reported_date'
        );
        assert.deepEqual(db.medic.query.args[0][1], {
          include_docs: true,
          startkey: ['form', 2018, 9, 'clinic'],
          endkey: ['form', 2018, 9, 'clinic', {}],
        });
        assert.deepEqual(result, [{ doc }]);
      });
    });

    it('use month view when doc has month property', () => {
      const doc = {
        type: 'data_record',
        form: 'form',
        contact: { parent: { _id: 'clinic', type: 'clinic' } },
        fields: {
          month: 9,
          year: 2018
        }
      };
      sinon.stub(db.medic, 'query').resolves({ rows: [{ doc }] });
      return transition._getDuplicates(doc).then(result => {
        assert.equal(
          db.medic.query.args[0][0],
          'medic/reports_by_form_year_month_parent_reported_date'
        );
        assert.deepEqual(db.medic.query.args[0][1], {
          include_docs: true,
          startkey: ['form', 2018, 9, 'clinic'],
          endkey: ['form', 2018, 9, 'clinic', {}],
        });
        assert.deepEqual(result, [{ doc }]);
      });
    });
  });

  describe('onMatch', () => {
    it('should not call bulkDocs when no clinic found', () => {
      const change = {
        doc: {
          _id: 'id',
          form: 'form',
          fields: {
            year: 2018,
            month: 2
          }
        }
      };
      sinon.stub(db.medic, 'query');
      sinon.stub(db.medic, 'bulkDocs');

      return transition.onMatch(change).then(result => {
        assert.equal(result, undefined);
        assert.equal(db.medic.query.callCount, 0);
        assert.equal(db.medic.bulkDocs.callCount, 0);
      });
    });

    it('does not call bulkDocs when no duplicates', () => {
      const bulkSave = sinon.stub(db.medic, 'bulkDocs');
      const change = {
        doc: {
          _id: 'abc',
          form: 'z',
          contact: { parent: { _id: 'clinic', type: 'clinic' } },
          fields: {
            year: 2013,
            month: 4,
          },
        },
      };
      const view = sinon
        .stub(db.medic, 'query')
        .resolves({ rows: [{ doc: change.doc }] });

      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(view.callCount, 1);
        assert.equal(bulkSave.callCount, 0);
      });
    });

    it('remove duplicates', () => {
      sinon.stub(db.medic, 'query').resolves({
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
              _id: 'qwe',
              _rev: '1-qqq',
              form: 'z',
              fields: {
                month: 4,
                year: 2013,
                pills: 16,
              },
              reported_date: 150,
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
          }
        ],
      });
      const bulkSave = sinon.stub(db.medic, 'bulkDocs').resolves();
      const change = {
        doc: {
          _id: 'xyz',
          _rev: '1-kkkk',
          form: 'z',
          contact: { parent: { _id: 'clinic', type: 'clinic' } },
          fields: {
            month: 4,
            year: 2013,
            pills: 22,
          },
          reported_date: 200,
        },
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(bulkSave.callCount, 1);
        assert.equal(bulkSave.args[0][0].length, 2);
        assert.deepEqual(bulkSave.args[0][0][0], {
          _id: 'abc',
          _rev: '1-dddd',
          form: 'z',
          fields: {
            month: 4,
            year: 2013,
            pills: 12,
          },
          reported_date: 100,
          _deleted: true
        });

        assert.deepEqual(bulkSave.args[0][0][1], {
          _id: 'qwe',
          _rev: '1-qqq',
          form: 'z',
          fields: {
            month: 4,
            year: 2013,
            pills: 16,
          },
          reported_date: 150,
          _deleted: true
        });
      });
    });

    it('should return undefined if bulkDocs fails', () => {
      sinon.stub(db.medic, 'query').resolves({
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
              _id: 'qwe',
              _rev: '1-qqq',
              form: 'z',
              fields: {
                month: 4,
                year: 2013,
                pills: 16,
              },
              reported_date: 150,
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
          }
        ],
      });
      sinon.stub(db.medic, 'bulkDocs').rejects({ some: 'err' });
      const change = {
        doc: {
          _id: 'xyz',
          _rev: '1-kkkk',
          form: 'z',
          contact: { parent: { _id: 'clinic', type: 'clinic' } },
          fields: {
            month: 4,
            year: 2013,
            pills: 22,
          },
          reported_date: 200,
        },
      };
      return transition.onMatch(change).then(result => {
        assert.equal(result, undefined);
        assert.equal(db.medic.bulkDocs.callCount, 1);
        assert.equal(db.medic.bulkDocs.args[0][0].length, 2);
      });
    });
  });
});
