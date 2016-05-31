describe('Users service', function() {

  'use strict';

  var service,
      $httpBackend,
      facilitiesError,
      adminsError,
      DbView,
      facilitya = { _id: 'a', name: 'aaron' },
      facilityb = { _id: 'b', name: 'brian' },
      facilityc = { _id: 'c', name: 'cathy' };

  beforeEach(function() {
    module('inboxApp');
    DbView = sinon.stub();
    module(function ($provide) {
      $provide.value('Admins', function(callback) {
        if (adminsError) {
          return callback(adminsError);
        }
        callback(null, { gareth: 'abc' });
      });
      $provide.value('DbView', DbView);
      $provide.value('Facility', function(options, callback) {
        if (arguments.length === 1) {
          callback = options;
          options = {};
        }
        if (facilitiesError) {
          return callback(facilitiesError);
        }
        callback(null, [ facilitya, facilityb, facilityc ]);
      });
      $provide.value('PLACE_TYPES', [ 'place' ]);
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('Users');
    });
    facilitiesError = null;
    adminsError = null;
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('retrieves users', function(done) {


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

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
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

      done();
    });

    $httpBackend.flush();

  });

  it('filters out non-users', function(done) {

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

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(1);

      var milan = actual[0];
      chai.expect(milan.id).to.equal('org.couchdb.user:y');
      chai.expect(milan.name).to.equal('milan');
      chai.expect(milan.fullname).to.equal('Milan A');
      chai.expect(milan.email).to.equal('m@a.com');
      chai.expect(milan.phone).to.equal('987654321');
      chai.expect(milan.facility).to.deep.equal(facilityb);
      chai.expect(milan.type).to.equal('district-admin');

      done();
    });

    $httpBackend.flush();

  });

  it('handles minimal users', function(done) {

    var users = [
      { 
        id: 'org.couchdb.user:x',
        doc: {
          name: 'lucas'
        } 
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(1);

      var lucas = actual[0];
      chai.expect(lucas.id).to.equal('org.couchdb.user:x');
      chai.expect(lucas.name).to.equal('lucas');
      chai.expect(lucas.fullname).to.equal(undefined);
      chai.expect(lucas.email).to.equal(undefined);
      chai.expect(lucas.phone).to.equal(undefined);
      chai.expect(lucas.facility).to.equal(undefined);
      chai.expect(lucas.type).to.equal('unknown');

      done();
    });

    $httpBackend.flush();

  });

  it('replaces admins type', function(done) {

    var users = [
      { 
        id: 'org.couchdb.user:gareth',
        doc: {
          name: 'gareth'
        } 
      }
    ];

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(1);

      var gareth = actual[0];
      chai.expect(gareth.id).to.equal('org.couchdb.user:gareth');
      chai.expect(gareth.name).to.equal('gareth');
      chai.expect(gareth.type).to.equal('admin');

      done();
    });

    $httpBackend.flush();

  });

  it('returns errors', function(done) {

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond(404, 'Not found');

    DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));

    service(function(err) {
      chai.expect(err).to.equal('Not found');
      done();
    });

    $httpBackend.flush();
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

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    facilitiesError = 'BOOM';

    service(function(err) {
      chai.expect(err).to.equal('BOOM');
      done();
    });

    $httpBackend.flush();

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

    $httpBackend
      .expect('GET', '/_users/_all_docs?include_docs=true')
      .respond({ rows: users });

    adminsError = 'POW';

    service(function(err) {
      chai.expect(err).to.equal('POW');
      done();
    });

    $httpBackend.flush();

  });

});
