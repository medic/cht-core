const controller = require('../../src/people');
const chai = require('chai');
const places = require('../../src/places');
const cutils = require('../../src/libs/utils');
const config = require('../../src/libs/config');
const db = require('../../src/libs/db');
const dataContext = require('../../src/libs/data-context');
const lineage = require('../../src/libs/lineage');
const sinon = require('sinon');
const { Person, Qualifier } = require('@medic/cht-datasource');

describe('people controller', () => {
  let minifyLineage;

  beforeEach(() => {
    config.init({ get: sinon.stub() });
    db.init({ medic: { post: sinon.stub() } });
    dataContext.init({ bind: sinon.stub() });
    minifyLineage = sinon.stub();
    lineage.init({ minifyLineage });
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
      sinon.stub(controller, '_validatePerson').returns();
      db.medic.post.resolves({ id: 'new-id' });
      return controller.createPerson({ type: 'person', name: 'Test' }).then(() => {
        chai.expect(db.medic.post.args[0][0].type).to.equal('person');
      });
    });

    it('returns error from db insert', () => {
      sinon.stub(controller, '_validatePerson').returns();
      sinon.stub(places, 'getOrCreatePlace').resolves();
      db.medic.post.returns(Promise.reject('yucky'));
      return controller
        .createPerson({})
        .then(() => chai.expect.fail('should not succeed'))
        .catch(err => {
          chai.expect(err).to.equal('yucky');
        });
    });

    it('rejects invalid reported_date.', () => {
      const person = {
        name: 'Test',
        reported_date: 'x'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      sinon.stub(places, 'getOrCreatePlace').resolves();
      sinon.stub(cutils, 'isDateStrValid').returns(false);
      return controller
        .createPerson(person)
        .then(() => chai.expect.fail('should not succeed'))
        .catch(err => {
          chai.expect(err.code).to.equal(400);
          chai.expect(err.message).to.equal('Reported date is invalid: x');
          chai.expect(config.get.args[0]).to.deep.equal([]);
        });
    });

    it('accepts valid reported_date in ms since epoch.', () => {
      const person = {
        name: 'Test',
        reported_date: '123'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      sinon.stub(places, 'getOrCreatePlace').resolves();
      const post = db.medic.post.resolves();
      return controller.createPerson(person).then(() => {
        chai.expect(post.args[0][0].reported_date).to.equal(123);
        chai.expect(config.get.args[0]).to.deep.equal([]);
      });
    });

    it('accepts valid reported_date in string format', () => {
      const person = {
        name: 'Test',
        reported_date: '2011-10-10T14:48:00-0300'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      sinon.stub(places, 'getOrCreatePlace').resolves();
      const post = db.medic.post.resolves();
      return controller.createPerson(person).then(() => {
        chai.expect(post.args[0][0].reported_date).to.equal(new Date('2011-10-10T14:48:00-0300').valueOf());
        chai.expect(config.get.args[0]).to.deep.equal([]);
      });
    });

    it('minifies the given parent', () => {
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
      const minified = {
        _id: 'a',
        parent: {
          _id: 'b'
        }
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      sinon.stub(places, 'getOrCreatePlace').resolves(place);
      lineage.minifyLineage.returns(minified);
      db.medic.post.resolves();
      return controller.createPerson(person).then(() => {
        const doc = db.medic.post.args[0][0];
        chai.expect(!doc.place).to.equal(true);
        chai.expect(doc.parent).to.deep.equal(minified);
        chai.expect(places.getOrCreatePlace.callCount).to.equal(1);
        chai.expect(places.getOrCreatePlace.args[0][0]).to.equal('a');
        chai.expect(lineage.minifyLineage.callCount).to.equal(1);
        chai.expect(lineage.minifyLineage.args[0][0]).to.deep.equal(place);
        chai.expect(config.get.args[0]).to.deep.equal([]);
      });
    });

    it('sets a default reported_date.', () => {
      const person = {
        name: 'Test'
      };
      config.get.returns({ contact_types: [{ id: 'person', person: true }] });
      db.medic.post.resolves();
      return controller.createPerson(person).then(() => {
        const doc = db.medic.post.args[0][0];
        // should be set to within 5 seconds of now
        chai.expect(doc.reported_date <= (new Date().valueOf())).to.equal(true);
        chai.expect(doc.reported_date > (new Date().valueOf() - 5000)).to.equal(true);
        chai.expect(config.get.args[0]).to.deep.equal([]);
      });
    });

  });

});
