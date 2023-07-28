const { expect } = require('chai');
const sinon = require('sinon');
const registrationUtils = require('@medic/registration-utils');
const taskUtils = require('@medic/task-utils');
const config = require('../../../src/config');
const db = require('../../../src/db');
describe('utils util', () => {

  beforeEach(() => {
    config.init({ getAll: sinon.stub(), });
    sinon.stub(db.medic, 'query');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  const utils = require('../../../src/lib/utils');

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
      expect(() => utils.evalExpression(`doc.foo.bar.smang === 'cats'`, {})).to.throw();
    });
  });

  describe('getRegistrations', () => {
    it('works with single key', () => {
      config.getAll.returns({});
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      db.medic.query.resolves({ rows: [] });
      return utils.getRegistrations({ id: 'my_id' }).then((result) => {
        result.should.deep.equal([]);
        db.medic.query.callCount.should.equal(1);
        db.medic.query.args[0][0].should.equal('medic-client/registered_patients');
        db.medic.query.args[0][1].should.deep.equal({
          include_docs: true,
          key: 'my_id'
        });
      });
    });

    it('should work with multiple keys', () => {
      config.getAll.returns({});
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      db.medic.query.resolves({ rows: [] });
      return utils.getRegistrations({ ids: ['1', '2', '3'] }).then((result) => {
        result.should.deep.equal([]);
        db.medic.query.callCount.should.equal(1);
        db.medic.query.args[0][0].should.equal('medic-client/registered_patients');
        db.medic.query.args[0][1].should.deep.equal({
          include_docs: true,
          keys: ['1', '2', '3']
        });
      });
    });

    it('should catch db errors', () => {
      sinon.stub(registrationUtils, 'isValidRegistration');
      db.medic.query.rejects({ some: 'error' });
      return utils
        .getRegistrations({ id: 'my_id' })
        .then(r => r.should.deep.equal('Should have thrown'))
        .catch(err => {
          err.should.deep.equal({ some: 'error' });
        });
    });

    it('should test each registration for validity and only return valid ones', () => {
      config.getAll.returns('config');
      sinon.stub(registrationUtils, 'isValidRegistration').callsFake(doc => !!doc.valid);

      const registrations = [
        { _id: 'reg1', valid: true },
        { _id: 'reg2', valid: false },
        { _id: 'reg3', valid: false },
        { _id: 'reg4', valid: true },
        { _id: 'reg5', valid: false }
      ];
      db.medic.query.resolves({ rows: registrations.map(registration => ({ doc: registration }))});
      return utils.getRegistrations({ id: 'my_id' }).then((result) => {
        result.should.deep.equal([
          { _id: 'reg1', valid: true },
          { _id: 'reg4', valid: true }
        ]);
        db.medic.query.callCount.should.equal(1);
        config.getAll.callCount.should.equal(5);
        registrationUtils.isValidRegistration.callCount.should.equal(5);
        registrationUtils.isValidRegistration.args.should.deep.equal([
          [{ _id: 'reg1', valid: true }, 'config'],
          [{ _id: 'reg2', valid: false }, 'config'],
          [{ _id: 'reg3', valid: false }, 'config'],
          [{ _id: 'reg4', valid: true }, 'config'],
          [{ _id: 'reg5', valid: false }, 'config']
        ]);
      });
    });
  });

  describe('getReportsBySubject', () => {
    it('should return empty array when no id or ids are provided', () => {
      return utils.getReportsBySubject({}).then(result => {
        result.should.deep.equal([]);
      });
    });

    it('should query the correct view with key', () => {
      db.medic.query.resolves({ rows: [] });

      return utils.getReportsBySubject({ id: '12345' }).then(result => {
        result.should.deep.equal([]);
        db.medic.query.callCount.should.equal(1);
        db.medic.query.args[0]
          .should.deep.equal(['medic-client/reports_by_subject', { key: '12345', include_docs: true }]);
      });
    });

    it('should query the correct view with keys', () => {
      db.medic.query.resolves({ rows: [] });
      const ids = ['a', 'b', 'c', 'd'];

      return utils.getReportsBySubject({ ids }).then(result => {
        result.should.deep.equal([]);
        db.medic.query.callCount.should.equal(1);
        db.medic.query.args[0].should.deep.equal([
          'medic-client/reports_by_subject',
          { keys: ['a', 'b', 'c', 'd'], include_docs: true }
        ]);
      });
    });

    it('should return query errors', () => {
      db.medic.query.rejects({ some: 'error' });

      return utils.getReportsBySubject({ id: 'a' })
        .then(result => result.should.equal('Should have thrown'))
        .catch(err => {
          err.should.deep.equal({ some: 'error' });
        });
    });

    it('should return results', () => {
      const reports = [{ _id: 'r1' }, { _id: 'r2' }, { _id: 'r3' }];
      db.medic.query.resolves({ rows: reports.map(r => ({ doc: r })) });

      return utils.getReportsBySubject({ id: 'a' }).then(result => {
        result.should.deep.equal(reports);
      });
    });

    it('should return valid registrations only when requested', () => {
      const reports = [{ _id: 'r1' }, { _id: 'r2' }, { _id: 'r3' }];
      db.medic.query.resolves({ rows: reports.map(r => ({ doc: r })) });

      sinon.stub(registrationUtils, 'isValidRegistration');
      config.getAll.returns('config');
      registrationUtils.isValidRegistration
        .withArgs({ _id: 'r1' }).returns(true)
        .withArgs({ _id: 'r2' }).returns(true)
        .withArgs({ _id: 'r3' }).returns(false);

      return utils.getReportsBySubject({ id: 'a', registrations: true }).then(result => {
        result.should.deep.equal([{ _id: 'r1' }, { _id: 'r2' }]);
        registrationUtils.isValidRegistration.callCount.should.equal(3);
        registrationUtils.isValidRegistration.args.should.deep.equal([
          [{ _id: 'r1' }, 'config'],
          [{ _id: 'r2' }, 'config'],
          [{ _id: 'r3' }, 'config']
        ]);
      });
    });

    it('should return unique docs', () => {
      config.getAll.returns({ config: 'all' });
      const docs = [
        { _id: 'a', fields: { patient_id: 'a', patient_uuid: 'uuid' } },
        { _id: 'b', fields: { patient_id: 'b', patient_uuid: 'uuidb' } },
        { _id: 'a', fields: { patient_id: 'a', patient_uuid: 'uuid' } },
        { _id: 'b', fields: { patient_id: 'b', patient_uuid: 'uuidb' } },
        { _id: 'c', fields: { patient_id: 'c', patient_uuid: 'uuidc' } },
      ];
      db.medic.query.resolves({ rows: docs.map(doc => ({ doc })) });

      return utils.getReportsBySubject({ id: 'a'}).then((actual) => {
        actual.should.deep.equal([
          { _id: 'a', fields: { patient_id: 'a', patient_uuid: 'uuid' } },
          { _id: 'b', fields: { patient_id: 'b', patient_uuid: 'uuidb' } },
          { _id: 'c', fields: { patient_id: 'c', patient_uuid: 'uuidc' } },
        ]);
      });
    });
  });

  describe('setTasksStates', () => {
    it('should work when doc does not have scheduled tasks', () => {
      sinon.stub(taskUtils, 'setTaskState');
      const r = utils.setTasksStates({}, 'state', () => {});
      r.should.equal(0);
      taskUtils.setTaskState.callCount.should.equal(0);
    });

    it('should change task state when the filter returns true', () => {
      sinon.stub(taskUtils, 'setTaskState').returns(true);
      const filter = sinon.stub().callsFake(task => task.filtered);
      const doc = { scheduled_tasks: [
        { id: 1, filtered: true },
        { id: 2, filtered: false },
        { id: 3, filtered: true },
        { id: 4, filtered: false },
      ]};

      const r = utils.setTasksStates(doc, 'newState', filter);
      r.should.equal(2);
      filter.callCount.should.equal(4);
      filter.args[0].should.deep.equal([{ id: 1, filtered: true }]);
      filter.args[1].should.deep.equal([{ id: 2, filtered: false }]);
      filter.args[2].should.deep.equal([{ id: 3, filtered: true }]);
      filter.args[3].should.deep.equal([{ id: 4, filtered: false }]);
      taskUtils.setTaskState.callCount.should.equal(2);
      taskUtils.setTaskState.args[0].should.deep.equal([ { id: 1, filtered: true }, 'newState' ]);
      taskUtils.setTaskState.args[1].should.deep.equal([ { id: 3, filtered: true }, 'newState' ]);
    });

    it('should return nbr of changed tasks', () => {
      const doc = {
        scheduled_tasks: [
          { changed: true },
          { changed: false },
          { changed: true },
          { changed: false },
          { changed: true },
          { changed: true },
        ]
      };
      sinon.stub(taskUtils, 'setTaskState');
      taskUtils.setTaskState.returns(false);
      taskUtils.setTaskState.withArgs({ changed: true }).returns(true);
      const filter = sinon.stub().returns(true);
      const r = utils.setTasksStates(doc, 'newState', filter);
      r.should.deep.equal(4);
      taskUtils.setTaskState.callCount.should.equal(6);
    });
  });

  describe('getSubjectIds', () => {
    it('should call registration_utils method', () => {
      sinon.stub(registrationUtils, 'getSubjectIds').returns(['a', 'b']);
      utils.getSubjectIds({ _id: 'a' }).should.deep.equal(['a', 'b']);
      registrationUtils.getSubjectIds.callCount.should.equal(1);
      registrationUtils.getSubjectIds.args[0].should.deep.equal([{ _id: 'a' }]);
    });
  });

  describe('getLocale', () => {
    it('should return correct locale', () => {
      const docs = [
        { locale: 'one' },
        { locale: 'two', sms_message: {} },
        { locale: 'three', sms_message: { locale: 'four' } },
        { locale: '', sms_message: { locale: 'five' } },
        { sms_message: { locale: '' } },
        { fields: {} }
      ];

      utils.getLocale(docs[0]).should.deep.equal('one');
      utils.getLocale(docs[1]).should.deep.equal('two');
      utils.getLocale(docs[2]).should.deep.equal('three');
      utils.getLocale(docs[3]).should.deep.equal('five');

      config.getAll.returns({ locale_outgoing: 'outgoingLocale' });
      utils.getLocale(docs[4]).should.deep.equal('outgoingLocale');

      config.getAll.returns({ locale_outgoing: '', locale: 'defaultLocale' });
      utils.getLocale(docs[5]).should.deep.equal('defaultLocale');

      config.getAll.returns({ locale_outgoing: '', locale: '' });
      utils.getLocale(docs[5]).should.deep.equal('en');
    });
  });

  describe('isWithinTimeFrame', () => {
    let clock;
    const validCases = [
      {
        cron: '5 * * * *',
        time: new Date('2023-07-11T03:05:00+0000').getTime(),
        frame: 4 * 60 * 1000, // 4 minutes
        offset: 3 * 60 * 1000, // 3 minutes
      },
      {
        cron: '20 1 * * *',
        time: new Date('2023-07-11T01:20:00+0000').getTime(),
        frame: 5 * 60 * 1000, // 4 minutes
        offset: 1 * 60 * 1000, // 2 minutes
      },
      {
        cron: '20 5 1 * *',
        time: new Date('2023-03-01T05:20:00+0000').getTime(),
        frame: 5 * 60 * 1000, // 4 minutes
        offset: 2 * 60 * 1000, // 2 minutes
      },
      {
        cron: '15 1 1 1 *',
        time: new Date('2023-01-01T01:15:00+0000').getTime(),
        frame: 5 * 60 * 1000, // 4 minutes
        offset: 4 * 60 * 1000, // 2 minutes
      },
    ];
    const invalidCases = [
      {
        cron: '5 * * * *',
        time: new Date('2023-07-11T03:15:00+0000').getTime(),
        frame: 4 * 60 * 1000,
        offset: 3 * 60 * 1000,
      },
      {
        cron: '20 1 * * *',
        time: new Date('2023-07-11T00:20:00+0000').getTime(),
        frame: 5 * 60 * 1000, // 4 minutes
        offset: 1 * 60 * 1000, // 2 minutes
      },
      {
        cron: '20 5 1 * *',
        time: new Date('2023-03-02T05:20:00+0000').getTime(),
        frame: 5 * 60 * 1000, // 4 minutes
        offset: 2 * 60 * 1000, // 2 minutes
      },
      {
        cron: '15 1 1 1 *',
        time: new Date('2023-03-01T01:15:00+0000').getTime(),
        frame: 5 * 60 * 1000, // 4 minutes
        offset: 4 * 60 * 1000, // 2 minutes
      },
    ];

    afterEach(() => clock?.restore());

    it('should return true for the valid time', () => {
      validCases.forEach(({ cron, frame, time, offset}) => {
        clock = sinon.useFakeTimers(time);
        utils.isWithinTimeFrame(cron).should.be.true;
  
        const currentDateInMsMinusOffset = Date.now() - offset;
        const currentDateInMsPlusOffset = Date.now() + offset;
  
        clock = sinon.useFakeTimers(currentDateInMsMinusOffset);
        utils.isWithinTimeFrame(cron, frame).should.be.true;
  
        clock = sinon.useFakeTimers(currentDateInMsPlusOffset);
        utils.isWithinTimeFrame(cron, frame).should.be.true;
      });
    });

    it('should return false for invalid time', () => {
      true.should.be.true;
      invalidCases.forEach(({ cron, time, frame, offset }) => {
        clock = sinon.useFakeTimers(time);
        utils.isWithinTimeFrame(cron).should.be.false;
  
        const currentDateInMsMinusOffset = Date.now() - offset;
        const currentDateInMsPlusOffset = Date.now() + offset;
  
        clock = sinon.useFakeTimers(currentDateInMsMinusOffset);
        utils.isWithinTimeFrame(cron, frame).should.be.false;
  
        clock = sinon.useFakeTimers(currentDateInMsPlusOffset);
        utils.isWithinTimeFrame(cron, frame).should.be.false;
      });
    });

    it('should throw an error for bad cron expression', () => {
      const BAD_CRON_EXPRESSION = 'BAD_CRON_EXPRESSION';
      
      expect(utils.isWithinTimeFrame(BAD_CRON_EXPRESSION)).to.be.false;
      expect(utils.isWithinTimeFrame(BAD_CRON_EXPRESSION, 60000)).to.be.false;
    });
  });
});
