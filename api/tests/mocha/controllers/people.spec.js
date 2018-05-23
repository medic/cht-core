const controller = require('../../../src/controllers/people'),
      chai = require('chai'),
      places = require('../../../src/controllers/places'),
      cutils = require('../../../src/controllers/utils'),
      db = require('../../../src/db-nano'),
      sinon = require('sinon').sandbox.create();

describe('people controller', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('validatePerson returns error on string argument.', done => {
    controller.validatePerson('x', err => {
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message).to.equal('Person must be an object.');
      done();
    });
  });

  it('validatePerson returns error on wrong doc type.', done => {
    controller.validatePerson({type: 'shoe'}, err => {
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message, 'Wrong type).to.equal(this is not a person.');
      done();
    });
  });

  it('validatePerson returns error if missing name property.', done => {
    controller.validatePerson({type: 'person'}, err => {
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message).to.equal('Person is missing a "name" property.');
      done();
    });
  });

  it('validatePerson returns error if name is an integer.', done => {
    controller.validatePerson({type: 'person', name: 1}, err => {
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message).to.equal('Property "name" must be a string.');
      done();
    });
  });

  it('validatePerson returns error if name is an object.', done => {
    controller.validatePerson({type: 'person', name: {}}, err => {
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message).to.equal('Property "name" must be a string.');
      done();
    });
  });

  it('getPerson returns custom message on 404 errors.', done => {
    sinon.stub(controller._lineage, 'fetchHydratedDoc').callsArgWith(1, {statusCode: 404});
    controller.getPerson('x', err => {
      chai.expect(err.message).to.equal('Failed to find person.');
      done();
    });
  });

  it('getPerson returns not found message if doc is wrong type.', done => {
    sinon.stub(controller._lineage, 'fetchHydratedDoc').callsArgWith(1, null, {type: 'clinic'});
    controller.getPerson('x', err => {
      chai.expect(err.message).to.equal('Failed to find person.');
      done();
    });
  });

  it('getPerson succeeds and returns doc when person type.', done => {
    sinon.stub(controller._lineage, 'fetchHydratedDoc').callsArgWith(1, null, {type: 'person'});
    controller.getPerson('x', (err, doc) => {
      chai.expect(doc).to.deep.equal({ type: 'person' });
      done(err);
    });
  });

  it('createPerson sets contact type before validating', done => {
    sinon.stub(controller, 'validatePerson').callsFake(data => {
      chai.expect(data.type).to.equal('person');
      chai.expect(data.name).to.equal('Kobe');
      done();
    });
    controller.createPerson({ type: 'shoe', name: 'Kobe' });
  });

  it('createPerson returns error from db insert', done => {
    sinon.stub(controller, 'validatePerson').callsArg(1);
    sinon.stub(places, 'getOrCreatePlace').callsArg(1);
    sinon.stub(db.medic, 'insert').callsArgWith(1, 'yucky');
    controller.createPerson({}, err => {
      chai.expect(err).to.equal('yucky');
      done();
    });
  });

  it('createPerson rejects invalid reported_date.', done => {
    const person = {
      name: 'Test',
      reported_date: 'x'
    };
    sinon.stub(places, 'getOrCreatePlace').callsArg(1);
    sinon.stub(cutils, 'isDateStrValid').returns(false);
    controller.createPerson (person, err => {
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message).to.equal('Reported date is invalid: x');
      done();
    });
  });

  it('createPerson accepts valid reported_date in ms since epoch.', done => {
    const person = {
      name: 'Test',
      reported_date: '123'
    };
    sinon.stub(places, 'getOrCreatePlace').callsArg(1);
    sinon.stub(db.medic, 'insert').callsFake(doc => {
      chai.expect(doc.reported_date === 123).to.equal(true);
      done();
    });
    controller.createPerson(person);
  });

  it('createPerson accepts valid reported_date in string format', done => {
    const person = {
      name: 'Test',
      reported_date: '2011-10-10T14:48:00-0300'
    };
    sinon.stub(places, 'getOrCreatePlace').callsArg(1);
    sinon.stub(db.medic, 'insert').callsFake(doc => {
      chai.expect(doc.reported_date === new Date('2011-10-10T14:48:00-0300').valueOf()).to.equal(true);
      done();
    });
    controller.createPerson(person);
  });

  it('createPerson minifies the given parent', done => {
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
    sinon.stub(places, 'getOrCreatePlace').callsArgWith(1, null, place);
    sinon.stub(controller._lineage, 'minifyLineage').returns(minified);
    sinon.stub(db.medic, 'insert').callsFake(doc => {
      chai.expect(!doc.place).to.equal(true);
      chai.expect(doc.parent).to.deep.equal(minified);
      chai.expect(places.getOrCreatePlace.callCount).to.equal(1);
      chai.expect(places.getOrCreatePlace.args[0][0]).to.equal('a');
      chai.expect(controller._lineage.minifyLineage.callCount).to.equal(1);
      chai.expect(controller._lineage.minifyLineage.args[0][0]).to.deep.equal(place);
      done();
    });
    controller.createPerson(person);
  });

  it('createPerson sets a default reported_date.', done => {
    const person = {
      name: 'Test'
    };
    sinon.stub(db.medic, 'insert').callsFake(doc => {
      // should be set to within 5 seconds of now
      chai.expect(doc.reported_date <= (new Date().valueOf())).to.equal(true);
      chai.expect(doc.reported_date > (new Date().valueOf() - 5000)).to.equal(true);
      done();
    });
    controller.createPerson(person);
  });

});
