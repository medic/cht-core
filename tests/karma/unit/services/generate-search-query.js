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
      filterQuery: { value: undefined },
      filterModel: {}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'},
          {form:['A','B','C']}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'},
          {$operator: 'not', $operands: { errors: 0 }}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'},
          {errors:0}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'},
          {verified:false}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'},
          {verified:true}
        ]}
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
    scope.facilitiesCount = 10;
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'},
          {clinic:['a','b','c']}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
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
    scope.filterQuery = { value: 'pref' };
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          'pref*',
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
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
    scope.filterQuery = { value: 'patient_id:12345' };
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          'patient_id:12345',
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
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
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'},
          {uuid:['a','b']}
        ]}
      );
    });
  });

  it('creates filter query ignoring filters', function() {
    scope.filterModel = {
      type: 'reports',
      forms: [],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    options.ignoreFilter = true;
    options.changes = [
      {id: 'a'}
    ];
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {uuid:['a']}
        ]}
      );
    });
  });

  it('creates query for contacts', function() {
    scope.filterModel = {
      type: 'contacts',
      contactTypes: [],
      facilities: []
    };
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          { type:[ 'district_hospital', 'health_center','clinic', 'person' ] }
        ]}
      );
    });
  });

  it('creates query for contacts with filters', function() {
    scope.facilitiesCount = 5;
    scope.filterModel = {
      type: 'contacts',
      contactTypes: [ 'clinic', 'health_center' ],
      facilities: [ 'c', 'a', 'b' ]
    };
    scope.filterQuery = { value: 'newp' };
    service(scope, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          'newp*',
          {type:['clinic','health_center']},
          {clinic:['c','a','b']}
        ]}
      );
    });
  });
});
