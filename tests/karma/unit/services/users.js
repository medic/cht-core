describe('Users service', function() {

  'use strict';

  var service,
      $httpBackend,
      rootScope,
      Admins,
      Facility,
      DbView,
      facilitya = { _id: 'a', name: 'aaron' },
      facilityb = { _id: 'b', name: 'brian' },
      facilityc = { _id: 'c', name: 'cathy' };

  beforeEach(function() {
    module('inboxApp');
    DbView = sinon.stub();
    Admins = sinon.stub();
    Facility = sinon.stub();
    module(function ($provide) {
      $provide.value('Admins', Admins);
      $provide.value('DbView', DbView);
      $provide.value('Facility', Facility);
      $provide.value('PLACE_TYPES', [ 'place' ]);
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('Users');
      rootScope = $injector.get('$rootScope');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('retrieves users', function() {
    var users = [
      {
        id: 'org.couchdb.user:x',
        doc: {
          name: 'lucas',
          facility_id: 'c',
          roles: [ 'national-admin', 'data-entry' ]
        }
      },
      {
        id: 'org.couchdb.user:y',
        doc: {
          name: 'milan',
          facility_id: 'b',
          roles: [ 'district-admin' ]
        }
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [
      {
        _id: 'org.couchdb.user:x',
        name: 'lucas',
        fullname: 'Lucas M',
        email: 'l@m.com',
        phone: '123456789'
      },
      {
        _id: 'org.couchdb.user:y',
        name: 'milan',
        fullname: 'Milan A',
        email: 'm@a.com',
        phone: '987654321'
      }
    ]}));

    Admins.returns(KarmaUtils.mockPromise(null, { gareth: true }));
    Facility.returns(KarmaUtils.mockPromise(null, [ facilitya, facilityb, facilityc ]));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    setTimeout(function() {
      rootScope.$apply(); // needed to resolve the promises
      $httpBackend.flush();
    });

    return service().then(function(actual) {
      chai.expect(actual.length).to.equal(2);

      var lucas = actual[0];
      chai.expect(lucas.id).to.equal('org.couchdb.user:x');
      chai.expect(lucas.name).to.equal('lucas');
      chai.expect(lucas.fullname).to.equal('Lucas M');
      chai.expect(lucas.email).to.equal('l@m.com');
      chai.expect(lucas.phone).to.equal('123456789');
      chai.expect(lucas.facility).to.deep.equal(facilityc);
      chai.expect(lucas.type).to.equal('national-admin');

      var milan = actual[1];
      chai.expect(milan.id).to.equal('org.couchdb.user:y');
      chai.expect(milan.name).to.equal('milan');
      chai.expect(milan.fullname).to.equal('Milan A');
      chai.expect(milan.email).to.equal('m@a.com');
      chai.expect(milan.phone).to.equal('987654321');
      chai.expect(milan.facility).to.deep.equal(facilityb);
      chai.expect(milan.type).to.equal('district-admin');
    });

  });

  it('filters out non-users', function() {

    var users = [
      { 
        id: 'x',
        doc: {
          name: 'lucas',
          facility_id: 'c',
          fullname: 'Lucas M',
          email: 'l@m.com',
          phone: '123456789',
          roles: [ 'national-admin', 'data-entry' ]
        } 
      },
      { 
        id: 'org.couchdb.user:y',
        doc: {
          name: 'milan',
          facility_id: 'b',
          fullname: 'Milan A',
          email: 'm@a.com',
          phone: '987654321',
          roles: [ 'district-admin' ]
        } 
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [
      {
        _id: 'org.couchdb.user:x',
        name: 'lucas',
        fullname: 'Lucas M',
        email: 'l@m.com',
        phone: '123456789'
      },
      {
        _id: 'org.couchdb.user:y',
        name: 'milan',
        fullname: 'Milan A',
        email: 'm@a.com',
        phone: '987654321'
      }
    ]}));

    Admins.returns(KarmaUtils.mockPromise(null, { gareth: true }));
    Facility.returns(KarmaUtils.mockPromise(null, [ facilitya, facilityb, facilityc ]));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    setTimeout(function() {
      rootScope.$apply(); // needed to resolve the promises
      $httpBackend.flush();
    });

    return service().then(function(actual) {
      chai.expect(actual.length).to.equal(1);

      var milan = actual[0];
      chai.expect(milan.id).to.equal('org.couchdb.user:y');
      chai.expect(milan.name).to.equal('milan');
      chai.expect(milan.fullname).to.equal('Milan A');
      chai.expect(milan.email).to.equal('m@a.com');
      chai.expect(milan.phone).to.equal('987654321');
      chai.expect(milan.facility).to.deep.equal(facilityb);
      chai.expect(milan.type).to.equal('district-admin');
    });

  });

  it('handles minimal users', function() {

    var users = [
      { 
        id: 'org.couchdb.user:x',
        doc: {
          name: 'lucas'
        } 
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));
    Admins.returns(KarmaUtils.mockPromise(null, { gareth: true }));
    Facility.returns(KarmaUtils.mockPromise(null, [ facilitya, facilityb, facilityc ]));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    setTimeout(function() {
      rootScope.$apply(); // needed to resolve the promises
      $httpBackend.flush();
    });

    return service().then(function(actual) {
      chai.expect(actual.length).to.equal(1);

      var lucas = actual[0];
      chai.expect(lucas.id).to.equal('org.couchdb.user:x');
      chai.expect(lucas.name).to.equal('lucas');
      chai.expect(lucas.fullname).to.equal(undefined);
      chai.expect(lucas.email).to.equal(undefined);
      chai.expect(lucas.phone).to.equal(undefined);
      chai.expect(lucas.facility).to.equal(undefined);
      chai.expect(lucas.type).to.equal('unknown');
    });

  });

  it('replaces admins type', function() {

    var users = [
      { 
        id: 'org.couchdb.user:gareth',
        doc: {
          name: 'gareth'
        } 
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));
    Admins.returns(KarmaUtils.mockPromise(null, { gareth: true }));
    Facility.returns(KarmaUtils.mockPromise(null, [ facilitya, facilityb, facilityc ]));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    setTimeout(function() {
      rootScope.$apply(); // needed to resolve the promises
      $httpBackend.flush();
    });

    return service().then(function(actual) {
      chai.expect(actual.length).to.equal(1);

      var gareth = actual[0];
      chai.expect(gareth.id).to.equal('org.couchdb.user:gareth');
      chai.expect(gareth.name).to.equal('gareth');
      chai.expect(gareth.type).to.equal('admin');
    });

  });

  it('returns errors', function(done) {

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond(404, 'Not found');

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));
    Admins.returns(KarmaUtils.mockPromise(null, { gareth: true }));
    Facility.returns(KarmaUtils.mockPromise(null, [ facilitya, facilityb, facilityc ]));

    setTimeout(function() {
      rootScope.$apply(); // needed to resolve the promises
      $httpBackend.flush();
    });

    service()
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err.data).to.equal('Not found');
        done();
      });
  });

  it('returns errors from facilities service', function(done) {

    var users = [
      { 
        id: 'x',
        doc: {
          name: 'lucas',
          facility_id: 'c',
          fullname: 'Lucas M',
          email: 'l@m.com',
          phone: '123456789',
          roles: [ 'national-admin', 'data-entry' ]
        } 
      },
      { 
        id: 'org.couchdb.user:y',
        doc: {
          name: 'milan',
          facility_id: 'b',
          fullname: 'Milan A',
          email: 'm@a.com',
          phone: '987654321',
          roles: [ 'district-admin' ]
        } 
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));
    Admins.returns(KarmaUtils.mockPromise(null, { gareth: true }));
    Facility.returns(KarmaUtils.mockPromise('BOOM'));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    setTimeout(function() {
      rootScope.$apply(); // needed to resolve the promises
      $httpBackend.flush();
    });

    service()
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('BOOM');
        done();
      });

  });


  it('returns errors from admins service', function(done) {

    var users = [
      { 
        id: 'org.couchdb.user:x',
        doc: {
          name: 'lucas',
          facility_id: 'c',
          fullname: 'Lucas M',
          email: 'l@m.com',
          phone: '123456789',
          roles: [ 'national-admin', 'data-entry' ]
        } 
      },
      { 
        id: 'org.couchdb.user:y',
        doc: {
          name: 'milan',
          facility_id: 'b',
          fullname: 'Milan A',
          email: 'm@a.com',
          phone: '987654321',
          roles: [ 'district-admin' ]
        } 
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));
    Admins.returns(KarmaUtils.mockPromise('POW'));
    Facility.returns(KarmaUtils.mockPromise(null, [ facilitya, facilityb, facilityc ]));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    setTimeout(function() {
      rootScope.$apply(); // needed to resolve the promises
      $httpBackend.flush();
    });

    service()
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('POW');
        done();
      });

  });

});
