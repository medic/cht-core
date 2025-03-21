describe('CHTDatasource service', () => {
  'use strict';

  let service;
  let Location;

  beforeEach(() => {
    Location = { rootUrl: 'ftp//myhost:21' };
    module('adminApp');
    module($provide => {
      $provide.value('Location', Location);
    });
    inject(($injector) => {
      service = $injector.get('CHTDatasource');
    });
  });

  it('initializes a datasource and data context', () => {
    chai.expect(service.dataContext.url).to.equal(Location.rootUrl);
    chai.expect(service.datasource).to.haveOwnProperty('v1');
  });
});
