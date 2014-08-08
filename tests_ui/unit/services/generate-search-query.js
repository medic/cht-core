describe('GenerateSearchQuery service', function() {

  'use strict';

  var service,
      scope;

  var date20130208 = 1360321199999;
  var date20130612 = 1371038399999;

  beforeEach(function (){
    module('inboxApp');
    inject(function(_GenerateSearchQuery_) {
      service = _GenerateSearchQuery_;
    });
    scope = {
      forms: [],
      facilities: [],
      filterSimple: true,
      filterQuery: undefined,
      filterModel: {}
    };
  });

  it('inbox controller defaults', function() {
    scope.filterModel = {
      type: 'messages',
      forms: [],
      facilities: [],
      valid: true,
      messageTypes: [{ type: 'messageincoming' }],
      date: {
        from: moment().subtract(1, 'months').valueOf(),
        to: moment().valueOf()
      }
    };
    var to = moment().add('days', 1).format('YYYY-MM-DD');
    var from = moment().subtract('months', 1).format('YYYY-MM-DD');
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[' + from + ' TO ' + to + '] ' +
      'AND (type:messageincoming)'
    );
  });

  it('creates filter query for dates', function() {
    scope.filterModel = {
      type: 'messages',
      forms: [],
      facilities: [],
      messageTypes: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:message*'
    );
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
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:report'
    );
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
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:report ' +
      'AND form:(A OR B OR C)'
    );
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
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:report'
    );
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
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:report ' +
      'AND NOT errors<int>:0'
    );
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
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:report ' +
      'AND errors<int>:0'
    );
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
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:report ' +
      'AND clinic:(a OR b OR c)'
    );
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
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:report'
    );
  });

  it('creates filter query for incoming messages', function() {
    scope.filterModel = {
      type: 'messages',
      messageTypes: [{ type: 'messageincoming' }],
      incoming: true,
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND (type:messageincoming)'
    );
  });

  it('creates filter query for outgoing messages', function() {
    scope.filterModel = {
      type: 'messages',
      messageTypes: [{ type: 'messageoutgoing' }],
      incoming: false,
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND (type:messageoutgoing)'
    );
  });

  it('creates filter query for outgoing and incoming messages', function() {
    scope.filterModel = {
      type: 'messages',
      messageTypes: [
        { type: 'messageincoming' },
        { type: 'messageoutgoing' }
      ],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND (type:messageincoming OR type:messageoutgoing)'
    );
  });

  it('creates filter query for outgoing messages with states', function() {
    scope.filterModel = {
      type: 'messages',
      messageTypes: [
        { type: 'messageincoming' },
        { type: 'messageoutgoing', state: 'pending' }
      ],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND (type:messageincoming OR (type:messageoutgoing AND state:pending))'
    );
  });

  it('creates filter query for advanced messages search', function() {
    scope.filterModel = {
      type: 'messages',
      messageTypes: [{ type: 'messageincoming' }],
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    scope.filterSimple = false;
    scope.filterQuery = 'sara*';
    var query = service(scope);
    chai.expect(query).to.equal(
      'sara* AND type:message*'
    );
  });

  it('creates filter query for advanced reports search', function() {
    scope.filterModel = {
      type: 'reports',
      incoming: undefined,
      facilities: [],
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    scope.filterSimple = false;
    scope.filterQuery = 'sara*';
    var query = service(scope);
    chai.expect(query).to.equal(
      'sara* AND type:report'
    );
  });

  it('creates filter query for date in UTC', function() {
    scope.filterModel = {
      type: 'messages',
      forms: [],
      facilities: [],
      messageTypes: [],
      date: {
        from: moment('2013-02-08T00:30:26.123 Z').valueOf(),
        to: moment('2013-06-12T23:30:26.123 Z').valueOf()
      }
    };
    var query = service(scope);
    chai.expect(query).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] ' +
      'AND type:message*'
    );
  });
});
