describe('state filter', function() {

  'use strict';

  var compile,
      scope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(['$compile', '$rootScope', 
    function($compile, $rootScope) {
      compile = $compile;
      scope = $rootScope.$new();
    }
  ]));

  it('should render nothing when no task', function() {
    scope.task = {};

    var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render state', function() {
    scope.task = {
      state: 'pending'
    };

    var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
    scope.$digest();
    chai.expect(element.find('.state').text()).to.equal('pending');
    chai.expect(element.find('.relative-date').length).to.equal(0);
  });

  it('should render due date', function() {
    var date = moment().add('days', 7);
    scope.task = {
      state: 'scheduled',
      due: date.valueOf()
    };

    var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
    scope.$digest();
    chai.expect(element.find('.state').text()).to.equal('scheduled');
    chai.expect(element.find('.relative-date-content').text()).to.equal('in 7 days');
    chai.expect(element.find('.relative-date').attr('title')).to.equal(date.format('DD-MMM-YYYY hh:mm'));
  });


});