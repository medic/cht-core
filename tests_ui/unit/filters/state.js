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

    var element = compile('<li ng-bind-html="task | state"></li>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render state', function() {
    scope.task = {
      state: 'pending'
    };

    var element = compile('<li ng-bind-html="task | state"></li>')(scope);
    scope.$digest();
    chai.expect(element.find('.task-state').text()).to.equal('pending');
    chai.expect(element.find('.task-state').attr('title')).to.equal('');
  });

  it('should render due date', function() {
    scope.task = {
      state: 'scheduled',
      due: moment().add('days', 7).valueOf()
    };

    var element = compile('<li ng-bind-html="task | state"></li>')(scope);
    scope.$digest();
    chai.expect(element.find('.task-state').text()).to.equal('scheduled');
    chai.expect(element.find('.task-state').attr('title')).to.equal('in 7 days');
  });


});