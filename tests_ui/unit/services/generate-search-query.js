describe('GenerateSearchQuery service', function() {

  'use strict';

  var service,
      options,
      settings,
      scope;

  var date20130208 = 1360321199999;
  var date20130612 = 1371038399999;

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', function(callback) {
        callback(null, settings);
      });
    });
    inject(function(_GenerateSearchQuery_) {
      service = _GenerateSearchQuery_;
    });
    options = {};
    settings = {};
    scope = {
      forms: [],
      facilities: [],
      filterQuery: undefined,
      filterModel: {},
      permissions: { districtAdmin: false }
    };
  });

  it('creates filter query for forms type', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report'
      );
    });
  });

  it('creates filter query for selected forms', function() {
    scope.forms = [
      { code: 'A'},
      { code: 'B'},
      { code: 'C'},
      { code: 'D'}
    ];
    scope.filterModel = {
      type: 'reports',
      forms: [
        { code: 'A'},
        { code: 'B'},
        { code: 'C'}
      ],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND form:("A" OR "B" OR "C")'
      );
    });
  });

  it('creates filter query for all forms when all are selected', function() {
    scope.forms = [
      { code: 'A'},
      { code: 'B'},
      { code: 'C'}
    ];
    scope.filterModel = {
      type: 'reports',
      forms: [
        { code: 'C'},
        { code: 'A'},
        { code: 'B'}
      ],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report'
      );
    });
  });

  it('creates filter query for invalid', function() {
    scope.filterModel = {
      valid: false,
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND NOT errors<int>:0'
      );
    });
  });

  it('creates filter query for valid', function() {
    scope.filterModel = {
      valid: true,
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND errors<int>:0'
      );
    });
  });

  it('creates filter query for unverified', function() {
    scope.filterModel = {
      verified: false,
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND verified:false'
      );
    });
  });

  it('creates filter query for verified', function() {
    scope.filterModel = {
      verified: true,
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND verified:true'
      );
    });
  });

  it('creates filter query for selected clinics', function() {
    scope.facilities = [
      { code: 'a'},
      { code: 'b'},
      { code: 'c'},
      { code: 'd'}
    ];
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: ['a', 'b', 'c'],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND clinic:("a" OR "b" OR "c")'
      );
    });
  });

  it('creates filter query for all clinics when all selected', function() {
    scope.facilities = [
      { code: 'a'},
      { code: 'b'},
      { code: 'c'}
    ];
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: ['c', 'a', 'b'],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report'
      );
    });
  });

  it('creates filter query with freetext', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    scope.filterQuery = 'pref';
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'pref* ' +
        'AND reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report'
      );
    });
  });

  it('creates filter query with freetext referencing a specific field', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    scope.filterQuery = 'patient_id:12345';
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'patient_id:12345 ' +
        'AND reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report'
      );
    });
  });

  it('creates filter query with specific ids', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    options.changes = [
      {id: 'a'},
      {id: 'b'}
    ];
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND uuid:("a" OR "b")'
      );
    });
  });

  it('creates filter query with specific ids', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    options.changes = [
      {id: 'a'},
      {id: 'b'}
    ];
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND uuid:("a" OR "b")'
      );
    });
  });

  it('creates filter query for district admin', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    scope.permissions.districtAdmin = true;
    scope.permissions.district = 'abc';
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND district:("abc")'
      );
    });
  });

  it('creates filter query for district OR unallocated', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    scope.permissions.districtAdmin = true;
    scope.permissions.district = 'abc';
    settings.district_admins_access_unallocated_messages = true;
    service(scope, options, function(err, query) {
      chai.expect(query).to.equal(
        'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
        'AND type:report ' +
        'AND district:("abc" OR "none")'
      );
    });
  });

});
