describe('PlaceHierarchy service', () => {

  'use strict';

  let service,
      Contacts,
      Changes,
      settings;

  beforeEach(() => {
    module('inboxApp');
    Contacts = sinon.stub();
    Changes = sinon.stub();
    settings = {};
    const placeTypes = [
      { id: 'district_hospital' },
      { id: 'health_center', parents: [ 'district_hospital' ] },
      { id: 'clinic', parents: [ 'health_center' ] }
    ];
    module($provide => {
      $provide.value('Changes', Changes);
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
    service('test', err => {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('builds empty hierarchy when no facilities', done => {
    Contacts.returns(Promise.resolve([]));
    service('test', (err, actual) => {
      chai.expect(actual.length).to.equal(0);
      done();
    });
  });

  it('builds hierarchy for facilities', done => {
    const a = { _id: 'a', parent: { _id: 'b', parent: { _id: 'c' } } };
    const b = { _id: 'b', parent: { _id: 'c' } };
    const c = { _id: 'c' };
    const d = { _id: 'd', parent: { _id: 'b', parent: { _id: 'c' } } };
    const e = { _id: 'e', parent: { _id: 'x' } };
    const f = { _id: 'f' };
    Contacts.returns(Promise.resolve([ a, b, c, d, e, f ]));
    service('test', (err, actual) => {
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
    done();
  });

  it('pulls the hierarchy level from config', done => {
    Contacts.returns(Promise.resolve([]));
    settings.place_hierarchy_types = ['a', 'b', 'c'];
    service('test', () => {
      chai.expect(Contacts.args[0][0]).to.deep.equal(settings.place_hierarchy_types);
      done();
    });
  });

  it('supports hoisting restricted hierarchies', done => {
    // Use case: a CHW with only access to their own clinic
    const clinic = { _id: 'clinic', parent: {_id: 'health_center', parent: {_id: 'district_hospital'}}};
    Contacts.returns(Promise.resolve([clinic]));
    service('test', (err, actual) => {
      chai.expect(actual).to.deep.equal([{
        doc: clinic,
        children: []
      }]);
      done();
    });
  });

  it('Only hoists when there is one stub child', done => {
    const clinic1 = { _id: 'clinic', parent: {_id: 'health_center', parent: {_id: 'district_hospital'}}};
    const clinic2 = { _id: 'clinic2', parent: {_id: 'health_center2', parent: {_id: 'district_hospital'}}};
    const health_center = {_id: 'health_center', parent: {_id: 'district_hospital'}};

    Contacts.returns(Promise.resolve([clinic1, clinic2, health_center]));
    service('test', (err, actual) => {
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
      done();
    });
  });

  describe('Changes', () => {

    it('notifies listeners when changes occur', done => {
      const initial = { _id: 'c', type: 'contact', contact_type: 'district_hospital' };
      const update = { _id: 'd', parent: { _id: 'c' }, type: 'contact', contact_type: 'health_center' };
      Contacts.onCall(0).returns(Promise.resolve([ initial ]));
      Contacts.onCall(1).returns(Promise.resolve([ initial, update ]));
      let count = 0;
      service('test', (err, actual) => {
        count++;
        if (count === 2) {
          chai.expect(actual).to.deep.equal([{
            doc: {
              _id: 'c',
              type: 'contact',
              contact_type: 'district_hospital'
            },
            children: [{
              doc: {
                _id: 'd',
                parent: { _id: 'c' },
                type: 'contact',
                contact_type: 'health_center'
              },
              children: []
            }]
          }]);
          done();
        } else {
          Changes.args[0][0].callback({ doc: update });
        }
      });
    });

  });
});
