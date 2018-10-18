const should = require('chai').should(),
      sinon = require('sinon'),
      registrationUtils = require('@shared-libs/registration-utils'),
      taskUtils = require('task-utils'),
      config = require('../../../src/config'),
      moment = require('moment');

describe('utils util', () => {
  afterEach(() => sinon.restore());

  const utils = require('../../../src/lib/utils');
  describe('getClinicPhone', () => {
    it('gets the phone number of the clinic', () => {
      const phone = '123';
      const doc = {
        contact: {
          parent: {
            type: 'clinic',
            contact: { phone: phone }
          }
        }
      };

      utils.getClinicPhone(doc).should.equal(phone);
    });
    it('gets the contact phone number if there is no clinic', () => {
      const phone = '123';
      const doc = {
        contact: {
          phone: phone
        }
      };

      utils.getClinicPhone(doc).should.equal(phone);
    });
  });
  it('getHealthCenterPhone works', () => {
      const phone = '123';
      const doc = {
        contact: {
          parent: {
            type: 'health_center',
            contact: {
              phone: phone
            }
          }
        }
      };

      utils.getHealthCenterPhone(doc).should.equal(phone);
  });
  it('getDistrictPhone works', () => {
    const phone = '123';
    const doc = {
      contact: {
        parent: {
          type: 'district_hospital',
          contact: {
            phone: phone
          }
        }
      }
    };

    utils.getDistrictPhone(doc).should.equal(phone);
  });
  it('isNonEmptyString works', () => {
    utils.isNonEmptyString().should.equal(false);
    utils.isNonEmptyString('').should.equal(false);
    utils.isNonEmptyString(123).should.equal(false);
    utils.isNonEmptyString(['hello']).should.equal(false);
    utils.isNonEmptyString('foo.bar').should.equal(true);
  });
  describe('evalExpression', () => {
    it('evals a given expression', () => {
      utils.evalExpression('(1+2+3) !== 24', {}).should.equal(true);
      utils.evalExpression('(1+2+3) === 24', {}).should.equal(false);
    });
    it('provides the passed context to the exprssion', () => {
      utils.evalExpression('doc.foo + doc.bar', {doc: {foo: 42, bar: 24}})
        .should.equal(66);
    });
    it('throws an exception if the expression errors', () => {
      should.Throw(() => utils.evalExpression(`doc.foo.bar.smang === 'cats'`, {}));
    });
  });


  describe('getRegistrations', () => {
    it('works with single key', done => {
      sinon.stub(config, 'getAll').returns({});
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      const db = {
        medic: {
          view: sinon.stub().callsArgWith(3, null, { rows: [] })
        }
      };

      utils.getRegistrations({ db: db, id: 'my_id' }, (err, result) => {
        (!!err).should.equal(false);
        result.should.deep.equal([]);
        db.medic.view.callCount.should.equal(1);
        db.medic.view.args[0][0].should.equal('medic-client');
        db.medic.view.args[0][1].should.equal('registered_patients');
        db.medic.view.args[0][2].should.deep.equal({
          include_docs: true,
          key: 'my_id'
        });
        done();
      });
    });

    it('should work with multiple keys', done => {
      sinon.stub(config, 'getAll').returns({});
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      const db = {
        medic: {
          view: sinon.stub().callsArgWith(3, null, { rows: [] })
        }
      };

      utils.getRegistrations({ db: db, ids: ['1', '2', '3'] }, (err, result) => {
        (!!err).should.equal(false);
        result.should.deep.equal([]);
        db.medic.view.callCount.should.equal(1);
        db.medic.view.args[0][0].should.equal('medic-client');
        db.medic.view.args[0][1].should.equal('registered_patients');
        db.medic.view.args[0][2].should.deep.equal({
          include_docs: true,
          keys: ['1', '2', '3']
        });
        done();
      });
    });

    it('should catch db errors', done => {
      sinon.stub(config, 'getAll');
      sinon.stub(registrationUtils, 'isValidRegistration');
      const db = {
        medic: {
          view: sinon.stub().callsArgWith(3, { some: 'error' })
        }
      };

      utils.getRegistrations({ db: db, id: 'my_id' }, (err, result) => {
        err.should.deep.equal({ some: 'error' });
        (!!result).should.equal(false);
        done();
      });
    });

    it('should test each registration for validity and only return valid ones', done => {
      sinon.stub(config, 'getAll').returns('config');
      sinon.stub(registrationUtils, 'isValidRegistration').callsFake(doc => !!doc.valid);

      const registrations = [
        { _id: 'reg1', valid: true },
        { _id: 'reg2', valid: false },
        { _id: 'reg3', valid: false },
        { _id: 'reg4', valid: true },
        { _id: 'reg5', valid: false }
      ];
      const db = {
        medic: {
          view: sinon.stub().callsArgWith(3, null, { rows: registrations.map(registration => ({ doc: registration }))})
        }
      };

      utils.getRegistrations({ db: db, id: 'my_id' }, (err, result) => {
        (!!err).should.equal(false);
        result.should.deep.equal([
          { _id: 'reg1', valid: true },
          { _id: 'reg4', valid: true }
        ]);
        db.medic.view.callCount.should.equal(1);
        config.getAll.callCount.should.equal(5);
        registrationUtils.isValidRegistration.callCount.should.equal(5);
        registrationUtils.isValidRegistration.args.should.deep.equal([
          [{ _id: 'reg1', valid: true }, 'config'],
          [{ _id: 'reg2', valid: false }, 'config'],
          [{ _id: 'reg3', valid: false }, 'config'],
          [{ _id: 'reg4', valid: true }, 'config'],
          [{ _id: 'reg5', valid: false }, 'config']
        ]);
        done();
      });
    });
  });

  describe('muteScheduledMessages', () => {
    it('should set all pending and scheduled tasks to muted', () => {
      const doc = {
        scheduled_tasks: [
          { state: 'scheduled' },
          { state: 'pending' },
          { state: 'sent' },
          { state: 'duplicate' }
        ]
      };

      sinon.stub(taskUtils, 'setTaskState').callsFake((task, state) => {
        task.state = state;
        return true;
      });
      utils.muteScheduledMessages(doc).should.equal(2);
      doc.scheduled_tasks.should.deep.equal([
        { state: 'muted' }, { state: 'muted' }, { state: 'sent' }, { state: 'duplicate' } ]);
    });

    it('returns the number of tasks that were updated', () => {
      const unchangedDoc = { scheduled_tasks: [{ state: 'cleared' }, { state: 'sent' }, { state: 'delivered' }] };
      const changedDoc = { scheduled_tasks: [{ state: 'scheduled' }, { state: 'sent' }, { state: 'delivered' }] };
      const changedDoc2 = { scheduled_tasks: [{ state: 'scheduled' }, { state: 'pending' }, { state: 'delivered' }] };

      sinon.stub(taskUtils, 'setTaskState').callsFake((task, state) => {
        task.state = state;
        return true;
      });

      utils.muteScheduledMessages(unchangedDoc).should.equal(0);
      utils.muteScheduledMessages(changedDoc).should.equal(1);
      utils.muteScheduledMessages(changedDoc2).should.equal(2);
      unchangedDoc.scheduled_tasks.should.deep.equal([{ state: 'cleared' }, { state: 'sent' }, { state: 'delivered' }]);
      changedDoc.scheduled_tasks.should.deep.equal([{ state: 'muted' }, { state: 'sent' }, { state: 'delivered' }] );
      changedDoc2.scheduled_tasks.should.deep.equal([{ state: 'muted' }, { state: 'muted' }, { state: 'delivered' }] );
    });
  });

  describe('unmuteScheduledMessages', () => {
    it('should set all muted tasks to scheduled', () => {
      const futureDate = moment().add(1, 'days').valueOf();
      const doc = {
        scheduled_tasks: [
          { state: 'muted', due: futureDate },
          { state: 'pending' },
          { state: 'muted', due: futureDate },
          { state: 'sent' },
          { state: 'delivered' }
        ]
      };

      sinon.stub(taskUtils, 'setTaskState').callsFake((task, state) => {
        task.state = state;
        return true;
      });

      utils.unmuteScheduledMessages(doc).should.equal(2);
      doc.scheduled_tasks.should.deep.equal([
        { state: 'scheduled', due: futureDate },
        { state: 'pending' },
        { state: 'scheduled', due: futureDate },
        { state: 'sent' },
        { state: 'delivered' }
      ]);
    });

    it('should return the number of updated tasks', () => {
      const futureDate = moment().add(1, 'days').valueOf();
      const unchangedDoc = { scheduled_tasks: [{ state: 'cleared' }, { state: 'sent' }, { state: 'delivered' }] };
      const changedDoc = {
        scheduled_tasks: [
          { state: 'muted', due: futureDate },
          { state: 'sent' },
          { state: 'delivered' }
        ]
      };
      const changedDoc2 = {
        scheduled_tasks: [
          { state: 'muted', due: futureDate },
          { state: 'muted', due: futureDate },
          { state: 'delivered' }
        ]
      };

      sinon.stub(taskUtils, 'setTaskState').callsFake((task, state) => {
        task.state = state;
        return true;
      });

      utils.unmuteScheduledMessages(unchangedDoc).should.equal(0);
      utils.unmuteScheduledMessages(changedDoc).should.equal(1);
      utils.unmuteScheduledMessages(changedDoc2).should.equal(2);
      unchangedDoc.scheduled_tasks.should.deep.equal([{ state: 'cleared' }, { state: 'sent' }, { state: 'delivered' }]);
      changedDoc.scheduled_tasks.should.deep.equal([
        { state: 'scheduled', due: futureDate },
        { state: 'sent' },
        { state: 'delivered' }
      ]);
      changedDoc2.scheduled_tasks.should.deep.equal([
        { state: 'scheduled', due: futureDate },
        { state: 'scheduled', due: futureDate },
        { state: 'delivered' }
      ]);
    });

    it('should remove all scheduled tasks with a due date in the past', () => {
      const futureDate = moment().add(1, 'days').valueOf(),
            pastDate = moment().subtract(1, 'days').valueOf();

      sinon.stub(taskUtils, 'setTaskState').callsFake((task, state) => {
        task.state = state;
        return true;
      });

      const doc = {
        scheduled_tasks: [
          { state: 'muted', due: futureDate },
          { state: 'scheduled', due: futureDate },
          { state: 'sent', due: futureDate },
          { state: 'muted', due: pastDate },
          { state: 'scheduled', due: pastDate },
          { state: 'sent', due: pastDate },
          { state: 'muted', due: futureDate },
        ]
      };

      utils.unmuteScheduledMessages(doc).should.equal(3);
      doc.scheduled_tasks.should.deep.equal([
        { state: 'scheduled', due: futureDate },
        { state: 'scheduled', due: futureDate },
        { state: 'sent', due: futureDate },
        { state: 'sent', due: pastDate },
        { state: 'scheduled', due: futureDate },
      ]);
    });
  });

  describe('getReportsBySubject', () => {
    it('should return empty array when no id or ids are provided', () => {
      return utils.getReportsBySubject({}).then(result => {
        result.should.deep.equal([]);
      });
    });

    it('should query the correct view with key', () => {
      const db = { query: sinon.stub().resolves({ rows: [] }) };

      return utils.getReportsBySubject({ db, id: '12345' }).then(result => {
        result.should.deep.equal([]);
        db.query.callCount.should.equal(1);
        db.query.args[0].should.deep.equal(['medic-client/reports_by_subject', { key: ['12345'], include_docs: true }]);
      });
    });

    it('should query the correct view with keys', () => {
      const db = { query: sinon.stub().resolves({ rows: [] }) },
            ids = ['a', 'b', 'c', 'd'];

      return utils.getReportsBySubject({ db, ids }).then(result => {
        result.should.deep.equal([]);
        db.query.callCount.should.equal(1);
        db.query.args[0].should.deep.equal([
          'medic-client/reports_by_subject',
          { keys: [['a'], ['b'], ['c'], ['d']], include_docs: true }
        ]);
      });
    });

    it('should return query errors', () => {
      const db = { query: sinon.stub().rejects({ some: 'error' }) };

      return utils.getReportsBySubject({ db, id: 'a' })
        .then(result => result.should.equal('Should have thrown'))
        .catch(err => {
          err.should.deep.equal({ some: 'error' });
        });
    });

    it('should return results', () => {
      const reports = [{ _id: 'r1' }, { _id: 'r2' }, { _id: 'r3' }],
            db = { query: sinon.stub().resolves({ rows: reports.map(r => ({ doc: r }))  })};

      return utils.getReportsBySubject({ db, id: 'a' }).then(result => {
        result.should.deep.equal(reports);
      });
    });

    it('should return valid registrations only when requested', () => {
      const reports = [{ _id: 'r1' }, { _id: 'r2' }, { _id: 'r3' }],
            db = { query: sinon.stub().resolves({ rows: reports.map(r => ({ doc: r }))  })};

      sinon.stub(registrationUtils, 'isValidRegistration');
      sinon.stub(config, 'getAll').returns('config');
      registrationUtils.isValidRegistration
        .withArgs({ _id: 'r1' }).returns(true)
        .withArgs({ _id: 'r2' }).returns(true)
        .withArgs({ _id: 'r3' }).returns(false);

      return utils.getReportsBySubject({ db, id: 'a', registrations: true }).then(result => {
        result.should.deep.equal([{ _id: 'r1' }, { _id: 'r2' }]);
        registrationUtils.isValidRegistration.callCount.should.equal(3);
        registrationUtils.isValidRegistration.args.should.deep.equal([
          [{ _id: 'r1' }, 'config'],
          [{ _id: 'r2' }, 'config'],
          [{ _id: 'r3' }, 'config']
        ]);
      });
    });
  });
});
