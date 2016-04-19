describe('GenerateSearchQuery service', function() {

  'use strict';

  var service;

  var date20130208 = 1360321199999;
  var date20130612 = 1371038399999;

  beforeEach(function (){
    module('inboxApp');
    inject(function(_GenerateSearchQuery_) {
      service = _GenerateSearchQuery_;
    });
  });

  it('creates filter query for forms type', function() {
    var filters = {
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
      );
    });
  });

  it('creates filter query for selected forms', function() {
    var filters = {
      forms: {
        selected: [ { code: 'A'}, { code: 'B'}, { code: 'C'} ],
        options: [ { code: 'A'}, { code: 'B'}, { code: 'C'}, { code: 'D'} ]
      },
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      forms: {
        selected: [ { code: 'A'}, { code: 'B'}, { code: 'C'} ],
        options: [ { code: 'A'}, { code: 'B'}, { code: 'C'} ]
      },
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
      );
    });
  });

  it('creates filter query for invalid', function() {
    var filters = {
      valid: false,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      valid: true,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      verified: false,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      verified: true,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      facilities: {
        selected: ['a', 'b', 'c'],
        options: [ { code: 'a'}, { code: 'b'}, { code: 'c'}, { code: 'd'} ]
      },
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      facilities: {
        selected: ['a', 'b', 'c'],
        options: [ { code: 'a'}, { code: 'b'}, { code: 'c'} ]
      },
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
          {type:'report'}
        ]}
      );
    });
  });

  it('creates filter query with freetext', function() {
    var filters = {
      search: 'pref',
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      search: 'patient_id:12345',
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    service('reports', filters, {}, function(err, result) {
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
    var filters = {
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var options = {
      changes: [ { id: 'a' }, { id: 'b' } ]
    };
    service('reports', filters, options, function(err, result) {
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
    var filters = {
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var options = {
      ignoreFilter: true,
      changes: [ { id: 'a' } ]
    };
    service('reports', filters, options, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        {$operands:[
          {uuid:['a']}
        ]}
      );
    });
  });

  it('creates query for contacts', function() {
    service('contacts', {}, {}, function(err, result) {
      chai.expect(result.query).to.deep.equal(
        { $operands: [
          { type: [ 'district_hospital', 'health_center', 'clinic', 'person' ] }
        ] }
      );
    });
  });

  it('creates query for contacts with filters', function() {
    var filters = {
      types: {
        selected: [ 'clinic', 'health_center' ],
        options: [ 'district_hospital', 'health_center', 'clinic', 'person' ]
      },
      facilities: {
        selected: [ 'c', 'a', 'b' ],
        options: [ 'c', 'a', 'b', 'd' ]
      },
      search: 'newp'
    };
    service('contacts', filters, {}, function(err, result) {
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
