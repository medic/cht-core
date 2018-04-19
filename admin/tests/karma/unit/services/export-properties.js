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
      values: {
        'Hello': 'Gidday',
        'Goodbye': 'See ya',
        'New thing': 'New'
      }
    };

    var settings = { something: true };
    var expected = 'Hello = Gidday\n' +
                   'Goodbye = See ya\n' +
                   'New\\ thing = New';

    var actual = service(settings, doc);
    chai.expect(actual).to.equal(expected);
    done();

  });

});