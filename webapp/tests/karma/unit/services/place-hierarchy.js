describe('PlaceHierarchy service', () => {

  'use strict';

  let service;
  let Contacts;
  let settings;

  beforeEach(() => {
    module('inboxApp');
    Contacts = sinon.stub();
    settings = {};
    const placeTypes = [
      { id: 'district_hospital' },
      { id: 'health_center', parents: [ 'district_hospital' ] },
      { id: 'clinic', parents: [ 'health_center' ] }
    ];
    module($provide => {
      $provide.value('Contacts', Contacts);
      $provide.value('ContactTypes', { getPlaceTypes: () => Promise.resolve(placeTypes) });
      $provide.value('Settings', () => Promise.resolve(settings));
    });
    inject($injector => {
      service = $injector.get('PlaceHierarchy');
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns errors from Contacts service', done => {
    Contacts.returns(Promise.reject('boom'));
    service()
      .then(() => done(new Error('error expected')))
      .catch(err => {
        chai.expect(err).to.equal('boom');
        done();
      });
  });

  it('builds empty hierarchy when no facilities', () => {
    Contacts.returns(Promise.resolve([]));
    return service().then(actual => {
      chai.expect(actual.length).to.equal(0);
    });
  });

  it('builds hierarchy for facilities', () => {
    const a = { _id: 'a', parent: { _id: 'b', parent: { _id: 'c' } } };
    const b = { _id: 'b', parent: { _id: 'c' } };
    const c = { _id: 'c' };
    const d = { _id: 'd', parent: { _id: 'b', parent: { _id: 'c' } } };
    const e = { _id: 'e', parent: { _id: 'x' } };
    const f = { _id: 'f' };
    Contacts.returns(Promise.resolve([ a, b, c, d, e, f ]));
    return service().then(actual => {
      chai.expect(Contacts.callCount).to.equal(1);
      chai.expect(Contacts.args[0][0]).to.deep.equal([ 'district_hospital', 'health_center' ]);
      chai.expect(actual).to.deep.equal([
        {
          doc: c,
          children: [
            {
              doc: b,
              children: [
                {
                  doc: a,
                  children: []
                },
                {
                  doc: d,
                  children: []
                }
              ]
            }
          ]
        },
        {
          doc: {
            _id: 'x',
            stub: true
          },
          children: [{
            doc: e,
            children: []
          }]
        },
        {
          doc: f,
          children: []
        }
      ]);
    });
  });

  it('pulls the hierarchy level from config', () => {
    Contacts.returns(Promise.resolve([]));
    settings.place_hierarchy_types = ['a', 'b', 'c'];
    return service().then(() => {
      chai.expect(Contacts.args[0][0]).to.deep.equal(settings.place_hierarchy_types);
    });
  });

  it('supports hoisting restricted hierarchies', () => {
    // Use case: a CHW with only access to their own clinic
    const clinic = { _id: 'clinic', parent: {_id: 'health_center', parent: {_id: 'district_hospital'}}};
    Contacts.returns(Promise.resolve([clinic]));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal([{
        doc: clinic,
        children: []
      }]);
    });
  });

  it('only hoists when there is one stub child', () => {
    const clinic1 = { _id: 'clinic', parent: {_id: 'health_center', parent: {_id: 'district_hospital'}}};
    const clinic2 = { _id: 'clinic2', parent: {_id: 'health_center2', parent: {_id: 'district_hospital'}}};
    const health_center = {_id: 'health_center', parent: {_id: 'district_hospital'}};

    Contacts.returns(Promise.resolve([clinic1, clinic2, health_center]));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal([{
        doc: health_center,
        children: [{
          doc: clinic1,
          children: []
        }]
      }, {
        doc: {
          _id: 'health_center2',
          stub: true
        },
        children: [{
          doc: clinic2,
          children: []
        }]
      }]);
    });
  });

});
