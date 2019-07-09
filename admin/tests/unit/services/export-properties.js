describe('ExportProperties service', function() {

  'use strict';

  var service;

  beforeEach(function() {
    module('adminApp');
    inject(function($injector) {
      service = $injector.get('ExportProperties');
    });
  });

  it('retrieves properties', function(done) {

    var doc = {
      code: 'en',
      generic: {
        'Hello': 'Gidday',
        'Goodbye': 'See ya',
        'New thing': 'New'
      }
    };

    var expected = 'Hello = Gidday\n' +
                   'Goodbye = See ya\n' +
                   'New\\ thing = New';

    var actual = service(doc);
    chai.expect(actual).to.equal(expected);
    done();

  });

});
