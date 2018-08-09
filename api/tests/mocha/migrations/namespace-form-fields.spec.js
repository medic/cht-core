const sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db-nano'),
      settingsService = require('../../../src/services/settings'),
      migration = require('../../../src/migrations/namespace-form-fields');

const makeStubs = (...viewBatches) => {
  const getView = sinon.stub(db.medic, 'view');
  if (viewBatches.length === 0) {
    getView.callsArgWith(3, null,
      {
        total_rows: 0,
        rows: []
      });
  } else {
    const totalRows = viewBatches.reduce(
      (total, batch) => total + batch.length,
      0);
    viewBatches.forEach(function(batch, index) {
      getView.onCall(index).callsArgWith(3, null,
        {
          total_rows: totalRows,
          rows: batch.map(function(doc) { return {doc: doc}; })
        });
    });
  }

  return {
    getConfig: sinon.stub(settingsService, 'get').resolves({ forms: forms }),
    bulk: sinon.stub(db.medic, 'bulk').callsArgWith(1, null, null),
    getView: getView
  };
};

const forms =  {
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

describe('namespace-form-fields migration', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('run does nothing if no data records', done => {
    const stubs = makeStubs();
    migration.run(err => {
      chai.expect(stubs.getView.callCount).to.equal(1);
      done(err);
    });
  });

  it('run does nothing if report already migrated', done => {
    const doc = {
      _id: 'a',
      reported_date: '123',
      form: 'P',
      fields: { name: 'michael' }
    };
    const stubs = makeStubs([doc]);
    migration.run(err => {
      chai.expect(stubs.getView.callCount).to.equal(1);
      done(err);
    });
  });

  it('run does nothing if no form', done => {
    const doc = {
      _id: 'a',
      reported_date: '123'
    };
    const stubs = makeStubs([doc]);
    migration.run(err => {
      chai.expect(stubs.getView.callCount).to.equal(1);
      done(err);
    });
  });

  it('run migrates report', done => {
    const doc = {
      _id: 'a',
      reported_date: '123',
      form: 'P',
      last_menstrual_period: 22,
      patient_name: 'sarah'
    };
    const expected = {
      last_menstrual_period: 22,
      patient_name: 'sarah'
    };
    const stubs = makeStubs([doc]);
    migration.run(err => {
      chai.expect(stubs.getView.callCount).to.equal(1);
      chai.expect(stubs.bulk.callCount).to.equal(1);
      chai.expect(stubs.bulk.args[0][0].docs[0].fields).to.deep.equal(expected);
      chai.expect(stubs.bulk.args[0][0].docs[0].last_menstrual_period).to.equal(undefined);
      chai.expect(stubs.bulk.args[0][0].docs[0].patient_name).to.equal(undefined);
      done(err);
    });
  });

  it('run migrates in batches', done => {
    const BATCH_SIZE = 1;
    const docs = [
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
    const expected = [
      {
        last_menstrual_period: 22,
        patient_name: 'sarah'
      },
      {
        last_menstrual_period: 12,
        patient_name: 'jane'
      }
    ];
    const stubs = makeStubs([docs[0]], [docs[1]]);
    migration._runWithBatchSize(BATCH_SIZE, function(err) {
      chai.expect(stubs.getView.callCount).to.equal(2);
      chai.expect(stubs.bulk.callCount).to.equal(2);

      chai.expect(stubs.bulk.args[0][0].docs[0].fields).to.deep.equal(expected[0]);
      chai.expect(stubs.bulk.args[0][0].docs[0].last_menstrual_period).to.equal(undefined);
      chai.expect(stubs.bulk.args[0][0].docs[0].patient_name).to.equal(undefined);

      chai.expect(stubs.bulk.args[1][0].docs[0].fields).to.deep.equal(expected[1]);
      chai.expect(stubs.bulk.args[1][0].docs[0].last_menstrual_period).to.equal(undefined);
      chai.expect(stubs.bulk.args[1][0].docs[0].patient_name).to.equal(undefined);

      done(err);
    });
  });

  it('reports bulk update errors', done => {
    const BATCH_SIZE = 2;
    const docs = [
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

    const stubs = {
      getConfig: sinon.stub(settingsService, 'get').resolves({ forms: forms }),
      bulk: sinon.stub(db.medic, 'bulk').callsArgWith(1, null,
        [
          {
            id: 'a',
            error: 'conflict',
            reason: 'Document update conflict.'
          },
          {
            ok: true,
            id: 'b',
            rev: 'blah'
          }
        ]),
      getView: sinon.stub(db.medic, 'view').callsArgWith(3, null,
        {
          total_rows: 2,
          rows: [ { doc: docs[0]}, { doc: docs[1] }]
        })
    };

    migration._runWithBatchSize(BATCH_SIZE, function(err) {
      chai.expect(stubs.getView.callCount).to.equal(1);
      chai.expect(stubs.bulk.callCount).to.equal(1);
      chai.expect(!!err).to.equal(true);
      done();
    });
  });

});
