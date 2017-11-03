describe('PlaceHierarchy service', () => {

  'use strict';

  const sandbox = sinon.sandbox.create();

  let service,
      Contacts,
      settings;

  beforeEach(() => {
    module('inboxApp');
    Contacts = sandbox.stub();
    settings = {};
    module($provide => {
      $provide.value('Contacts', Contacts);
      $provide.value('ContactSchema', {
        getPlaceTypes: () => [ 'district_hospital', 'health_center', 'clinic' ]
      });
      $provide.value('Settings', () => Promise.resolve(settings));
    });
    inject($injector => {
      service = $injector.get('PlaceHierarchy');
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns errors from Contacts service', done => {
    Contacts.returns(Promise.reject('boom'));
    service()
      .then(() => {
        done(new Error('error expected'));
      })
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
    const e = { _id: 'e', parent: { _id: 'x' } }; // unknown parent is ignored
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

  it('supports partial hierarchies that have parent stubs');

});
