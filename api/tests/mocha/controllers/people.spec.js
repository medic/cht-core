const controller = require('../../../src/controllers/people'),
      chai = require('chai'),
      places = require('../../../src/controllers/places'),
      cutils = require('../../../src/controllers/utils'),
      db = require('../../../src/db-pouch'),
      sinon = require('sinon');

describe('people controller', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('validatePerson', () => {

    it('returns error on string argument', () => {
      const actual = controller._validatePerson('x');
      chai.expect(actual).to.equal('Person must be an object.');
    });

    it('returns error on wrong doc type', () => {
      const actual = controller._validatePerson({ type: 'shoe' });
      chai.expect(actual).to.equal('Wrong type, this is not a person.');
    });

    it('returns error if missing name property', () => {
      const actual = controller._validatePerson({ type: 'person' });
      chai.expect(actual).to.equal('Person is missing a "name" property.');
    });

    it('returns error if name is an integer', () => {
      const actual = controller._validatePerson({ type: 'person', name: 1 });
      chai.expect(actual).to.equal('Property "name" must be a string.');
    });

    it('returns error if name is an object', () => {
      const actual = controller._validatePerson({ type: 'person', name: {} });
      chai.expect(actual).to.equal('Property "name" must be a string.');
    });

  });

  describe('getPerson', () => {

    it('returns custom message on 404 errors.', done => {
      sinon.stub(controller._lineage, 'fetchHydratedDoc').returns(Promise.reject({statusCode: 404}));
      controller._getPerson('x').catch(err => {
        chai.expect(err.message).to.equal('Failed to find person.');
        done();
      });
    });

    it('returns not found message if doc is wrong type.', done => {
      sinon.stub(controller._lineage, 'fetchHydratedDoc').resolves({type: 'clinic'});
      controller._getPerson('x').catch(err => {
        chai.expect(err.message).to.equal('Failed to find person.');
        done();
      });
    });

    it('succeeds and returns doc when person type.', () => {
      sinon.stub(controller._lineage, 'fetchHydratedDoc').resolves({type: 'person'});
      return controller._getPerson('x').then(doc => {
        chai.expect(doc).to.deep.equal({ type: 'person' });
      });
    });

  });

  describe('createPerson', () => {

    it('sets contact type before validating', () => {
      sinon.stub(controller, '_validatePerson').returns();
      sinon.stub(db.medic, 'post').returns(Promise.resolve());
      return controller.createPerson({ type: 'shoe', name: 'Kobe' }).then(() => {
        chai.expect(controller._validatePerson.args[0][0].type).to.equal('person');
        chai.expect(controller._validatePerson.args[0][0].name).to.equal('Kobe');
      });
    });

    it('returns error from db insert', done => {
      sinon.stub(controller, '_validatePerson').returns();
      sinon.stub(places, 'getOrCreatePlace').resolves();
      sinon.stub(db.medic, 'post').returns(Promise.reject('yucky'));
      controller.createPerson({}).catch(err => {
        chai.expect(err).to.equal('yucky');
        done();
      });
    });

    it('rejects invalid reported_date.', done => {
      const person = {
        name: 'Test',
        reported_date: 'x'
      };
      sinon.stub(places, 'getOrCreatePlace').resolves();
      sinon.stub(cutils, 'isDateStrValid').returns(false);
      controller.createPerson(person).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('Reported date is invalid: x');
        done();
      });
    });

    it('accepts valid reported_date in ms since epoch.', () => {
      const person = {
        name: 'Test',
        reported_date: '123'
      };
      sinon.stub(places, 'getOrCreatePlace').resolves();
      const post = sinon.stub(db.medic, 'post').resolves();
      return controller.createPerson(person).then(() => {
        chai.expect(post.args[0][0].reported_date).to.equal(123);
      });
    });

    it('accepts valid reported_date in string format', () => {
      const person = {
        name: 'Test',
        reported_date: '2011-10-10T14:48:00-0300'
      };
      sinon.stub(places, 'getOrCreatePlace').resolves();
      const post = sinon.stub(db.medic, 'post').resolves();
      return controller.createPerson(person).then(() => {
        chai.expect(post.args[0][0].reported_date).to.equal(new Date('2011-10-10T14:48:00-0300').valueOf());
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
      sinon.stub(places, 'getOrCreatePlace').resolves(place);
      sinon.stub(controller._lineage, 'minifyLineage').returns(minified);
      sinon.stub(db.medic, 'post').resolves();
      return controller.createPerson(person).then(() => {
        const doc = db.medic.post.args[0][0];
        chai.expect(!doc.place).to.equal(true);
        chai.expect(doc.parent).to.deep.equal(minified);
        chai.expect(places.getOrCreatePlace.callCount).to.equal(1);
        chai.expect(places.getOrCreatePlace.args[0][0]).to.equal('a');
        chai.expect(controller._lineage.minifyLineage.callCount).to.equal(1);
        chai.expect(controller._lineage.minifyLineage.args[0][0]).to.deep.equal(place);
      });
    });

    it('sets a default reported_date.', () => {
      const person = {
        name: 'Test'
      };
      sinon.stub(db.medic, 'post').resolves();
      return controller.createPerson(person).then(() => {
        const doc = db.medic.post.args[0][0];
        // should be set to within 5 seconds of now
        chai.expect(doc.reported_date <= (new Date().valueOf())).to.equal(true);
        chai.expect(doc.reported_date > (new Date().valueOf() - 5000)).to.equal(true);
      });
    });

  });

});
