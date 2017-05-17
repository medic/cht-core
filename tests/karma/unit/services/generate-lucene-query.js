describe('GenerateLuceneQuery service', function() {

  'use strict';

  var service;

  var date20130208 = 1360321199999;
  var date20130612 = 1371038399999;

  beforeEach(function (){
    module('inboxApp');
    inject(function(_GenerateLuceneQuery_) {
      service = _GenerateLuceneQuery_;
    });
  });

  it('creates filter query for forms type', function(done) {
    var filters = {
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'}
      ]}
    );
    done();
  });

  it('creates filter query for selected forms', function(done) {
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
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'},
        {form:['A','B','C']}
      ]}
    );
    done();
  });

  it('creates filter query for all forms when all are selected', function(done) {
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
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'}
      ]}
    );
    done();
  });

  it('creates filter query for invalid', function(done) {
    var filters = {
      valid: false,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'},
        {$operator: 'not', $operands: { errors: 0 }}
      ]}
    );
    done();
  });

  it('creates filter query for valid', function(done) {
    var filters = {
      valid: true,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'},
        {errors:0}
      ]}
    );
    done();
  });

  it('creates filter query for unverified', function(done) {
    var filters = {
      verified: false,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'},
        {verified:false}
      ]}
    );
    done();
  });

  it('creates filter query for verified', function(done) {
    var filters = {
      verified: true,
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'},
        {verified:true}
      ]}
    );
    done();
  });

  it('creates filter query for selected clinics', function(done) {
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
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'},
        {clinic:['a','b','c']}
      ]}
    );
    done();
  });

  it('creates filter query for all clinics when all selected', function(done) {
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
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'}
      ]}
    );
    done();
  });

  it('creates filter query with freetext', function(done) {
    var filters = {
      search: 'pref',
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        'pref*',
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'}
      ]}
    );
    done();
  });

  it('creates filter query with freetext referencing a specific field', function(done) {
    var filters = {
      search: 'patient_id:12345',
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var actual = service('reports', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        'patient_id:12345',
        {reported_date:{'$from':'2013-02-08','$to':'2013-06-13'}},
        {type:'report'}
      ]}
    );
    done();
  });

  it('creates query for contacts', function(done) {
    var actual = service('contacts', {});
    chai.expect(actual.query).to.deep.equal(
      { $operands: [
        { type: [ 'district_hospital', 'health_center', 'clinic', 'person' ] }
      ] }
    );
    done();
  });

  it('creates query for contacts with freetext search', function(done) {
    var filters = { search: 'newp' };
    var actual = service('contacts', filters);
    chai.expect(actual.query).to.deep.equal(
      {$operands:[
        'newp*',
        { type: [ 'district_hospital', 'health_center', 'clinic', 'person' ] }
      ]}
    );
    done();
  });
});
