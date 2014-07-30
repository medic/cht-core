describe('InboxCtrl controller', function() {

  'use strict';

  var scope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    $controller('InboxCtrl', { '$scope': scope });
  }));

  it('set up controller', function() {
    scope.init({ district: 'columbia' });
    chai.expect(scope.userDistrict).to.equal('columbia');
    var to = moment().add('days', 1).format('YYYY-MM-DD');
    var from = moment().subtract('months', 1).format('YYYY-MM-DD');
    chai.expect(scope.filterQuery).to.equal(
      'reported_date<date>:[' + from + ' TO ' + to + '] ' +
      'AND type:messageincoming'
    );
  });

  it('creates filter query for dates', function() {
    scope.filterModel = {
      type: 'messages',
      forms: [],
      facilities: [],
      date: {
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
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
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
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
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
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
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
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
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
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
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
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
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
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
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] AND type:report'
    );
  });

  it('creates filter query for incoming messages', function() {
    scope.filterModel = {
      type: 'messages',
      incoming: true,
      facilities: [],
      date: {
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] AND type:messageincoming'
    );
  });

  it('creates filter query for outgoing messages', function() {
    scope.filterModel = {
      type: 'messages',
      incoming: false,
      facilities: [],
      date: {
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] AND type:messageoutgoing'
    );
  });

  it('creates filter query for outgoing and incoming messages', function() {
    scope.filterModel = {
      type: 'messages',
      incoming: undefined,
      facilities: [],
      date: {
        from: moment('2013-02-08'),
        to: moment('2013-06-12')
      }
    };
    scope.filter();
    chai.expect(scope.filterQuery).to.equal(
      'reported_date<date>:[2013-02-08 TO 2013-06-13] AND type:message*'
    );
  });
});
