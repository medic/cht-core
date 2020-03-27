describe('ExportProperties service', function() {

  'use strict';

  let service;

  beforeEach(function() {
    module('adminApp');
    inject(function($injector) {
      service = $injector.get('ExportProperties');
    });
  });

  it('retrieves properties', function(done) {

    const doc = {
      code: 'en',
      generic: {
        'Hello': 'Gidday',
        'Goodbye': 'See ya',
        'New thing': 'New'
      }
    };

    const expected = 'Hello = Gidday\n' +
                   'Goodbye = See ya\n' +
                   'New\\ thing = New';

    const actual = service(doc);
    chai.expect(actual).to.equal(expected);
    done();

  });

});
