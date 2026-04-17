const controller = require('../../src/people');
const chai = require('chai');
const places = require('../../src/places');
const cutils = require('../../src/libs/utils');
const config = require('../../src/libs/config');
const dataContext = require('../../src/libs/data-context');
const sinon = require('sinon');
const { Person, Qualifier, InvalidArgumentError } = require('@medic/cht-datasource');

describe('people controller', () => {
  let createPersonFn;

  beforeEach(() => {
    config.init({ get: sinon.stub() });
    dataContext.init({ bind: sinon.stub() });
    createPersonFn = sinon.stub();
    dataContext.bind.withArgs(Person.v1.create).returns(createPersonFn);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('validatePerson', () => {

    it('returns error on string argument', () => {
      const actual = controller._validatePerson('x');
      chai.expect(actual).to.equal('Person must be an object.');
    });

    it('returns error on wrong doc type', () => {
      config.get.returns([{ id: 'person', person: true }]);
      const actual = controller._validatePerson({ type: 'shoe' });
      chai.expect(actual).to.equal('Wrong type, this is not a person.');
    });

    it('returns error on wrong doc contact_type', () => {
      config.get.returns([{ id: 'person', person: true }]);
      const actual = controller._validatePerson({ type: 'contact', contact_type: 'shoe' });
      chai.expect(actual).to.equal('Wrong type, this is not a person.');
    });

    it('returns error if missing name property', () => {
      config.get.returns([{ id: 'person', person: true }]);
      const actual = controller._validatePerson({ type: 'person' });
      chai.expect(actual).to.equal('Person is missing a "name" property.');
    });

    it('returns error if name is an integer', () => {
      config.get.returns([{ id: 'person', person: true }]);
      const actual = controller._validatePerson({ type: 'person', name: 1 });
      chai.expect(actual).to.equal('Property "name" must be a string.');
    });

    it('returns error if name is an object', () => {
      config.get.returns([{ id: 'person', person: true }]);
      const actual = controller._validatePerson({ type: 'person', name: {} });
      chai.expect(actual).to.equal('Property "name" must be a string.');
    });

    it('returns error if reported_date is invalid', () => {
      config.get.returns([{ id: 'person', person: true }]);
      sinon.stub(cutils, 'isDateStrValid').returns(false);
      const actual = controller._validatePerson({ type: 'person', name: 'Test', reported_date: 'x' });
      chai.expect(actual).to.equal('Reported date is invalid: x');
    });

  });

  describe('getPerson', () => {
    let getWithLineage;

    beforeEach(() => {
      getWithLineage = sinon.stub();
      dataContext.bind.returns(getWithLineage);
    });

    afterEach(() => chai.expect(dataContext.bind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true);

    it('throws error when person not found', async () => {
      getWithLineage.resolves(null);

      await chai.expect(controller._getPerson('x')).to.be.rejectedWith('Failed to find person.');

      chai.expect(getWithLineage.calledOnceWithExactly(Qualifier.byUuid('x'))).to.be.true;
    });

    it('succeeds and returns doc when person type.', () => {
      config.get.returns([{ id: 'person', person: true }]);
      getWithLineage.resolves({type: 'person'});
      return controller._getPerson('x').then(doc => {
        chai.expect(doc).to.deep.equal({ type: 'person' });
      });
    });

  });

  describe('getOrCreatePerson', () => {
    it('creates and returns person when given new object', () => {
      sinon.stub(controller, 'createPerson').resolves({ id: 'new-id' });
      sinon.stub(controller, '_getPerson').resolves({ _id: 'new-id', name: 'Test' });
      return controller.getOrCreatePerson({ name: 'Test', type: 'person' }).then(result => {
        chai.expect(result._id).to.equal('new-id');
        chai.expect(controller.createPerson.callCount).to.equal(1);
        chai.expect(controller._getPerson.calledWith('new-id')).to.be.true;
      });
    });

    it('rejects existing object with _rev', () => {
      return controller
        .getOrCreatePerson({ _id: 'x', _rev: '1' })
        .then(() => chai.expect.fail('should not succeed'))
        .catch(err => {
          chai.expect(err.code).to.equal(400);
          chai.expect(err.message).to.include('Person must be a new object');
        });
    });
  });

  describe('createPerson', () => {

    it('does not override existing type', () => {
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      createPersonFn.resolves({ _id: 'new-id', _rev: '1', type: 'person', name: 'Test' });
      return controller.createPerson({ type: 'person', name: 'Test', parent: 'parent-id' }).then(() => {
        chai.expect(createPersonFn.args[0][0].type).to.equal('person');
      });
    });

    it('returns error from cht-datasource create', () => {
      createPersonFn.rejects(new Error('yucky'));
      return controller
        .createPerson({ type: 'person', name: 'Test', parent: 'parent-id' })
        .then(() => chai.expect.fail('should not succeed'))
        .catch(err => {
          chai.expect(err.message).to.equal('yucky');
        });
    });

    it('translates InvalidArgumentError to code 400', () => {
      createPersonFn.rejects(new InvalidArgumentError('bad input'));
      return controller
        .createPerson({ type: 'person', name: 'Test', parent: 'parent-id' })
        .then(() => chai.expect.fail('should not succeed'))
        .catch(err => {
          chai.expect(err.code).to.equal(400);
          chai.expect(err.message).to.equal('bad input');
        });
    });

    it('rejects invalid reported_date.', () => {
      const person = {
        name: 'Test',
        reported_date: 'x'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      sinon.stub(cutils, 'isDateStrValid').returns(false);
      return controller
        .createPerson(person)
        .then(() => chai.expect.fail('should not succeed'))
        .catch(err => {
          chai.expect(err.code).to.equal(400);
          chai.expect(err.message).to.equal('Reported date is invalid: x');
        });
    });

    it('accepts valid reported_date in ms since epoch.', () => {
      const person = {
        name: 'Test',
        reported_date: '123',
        parent: 'parent-id'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      createPersonFn.resolves({ _id: 'new-id', _rev: '1' });
      return controller.createPerson(person).then(() => {
        chai.expect(createPersonFn.args[0][0].reported_date).to.equal(123);
      });
    });

    it('accepts valid reported_date in string format', () => {
      const person = {
        name: 'Test',
        reported_date: '2011-10-10T14:48:00-0300',
        parent: 'parent-id'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      createPersonFn.resolves({ _id: 'new-id', _rev: '1' });
      return controller.createPerson(person).then(() => {
        chai.expect(createPersonFn.args[0][0].reported_date).to.equal(new Date('2011-10-10T14:48:00-0300').valueOf());
      });
    });

    it('resolves place to parent UUID', () => {
      const person = {
        name: 'Test',
        reported_date: '2011-10-10T14:48:00-0300',
        place: 'a'
      };
      const place = {
        _id: 'a',
        name: 'Test area',
        parent: {
          _id: 'b',
          name: 'Test district',
        }
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      sinon.stub(places, 'getOrCreatePlace').resolves(place);
      createPersonFn.resolves({ _id: 'new-id', _rev: '1' });
      return controller.createPerson(person).then(() => {
        const doc = createPersonFn.args[0][0];
        chai.expect(!doc.place).to.equal(true);
        chai.expect(doc.parent).to.equal('a');
        chai.expect(places.getOrCreatePlace.callCount).to.equal(1);
        chai.expect(places.getOrCreatePlace.args[0][0]).to.equal('a');
      });
    });

    it('does not set reported_date when not provided (cht-datasource handles default).', () => {
      const person = {
        name: 'Test',
        parent: 'parent-id'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      createPersonFn.resolves({ _id: 'new-id', _rev: '1' });
      return controller.createPerson(person).then(() => {
        const doc = createPersonFn.args[0][0];
        chai.expect(doc.reported_date).to.be.undefined;
      });
    });

    it('returns response in { id, rev } format', () => {
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      createPersonFn.resolves({ _id: 'new-id', _rev: '1-abc' });
      return controller.createPerson({ type: 'person', name: 'Test', parent: 'parent-id' }).then(result => {
        chai.expect(result).to.deep.equal({ id: 'new-id', rev: '1-abc' });
      });
    });

  });

});
