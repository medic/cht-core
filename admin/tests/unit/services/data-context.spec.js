describe('DataContext service', () => {
  let service;
  let Location;

  beforeEach(() => {
    Location = { rootUrl: 'ftp//myhost:21' };
    module('adminApp');
    module($provide => {
      $provide.value('Location', Location);
    });
    inject(_DataContext_ => {
      service = _DataContext_;
    });
  });

  it('binds the given function to the data context', () => {
    const innerFn = sinon.stub();
    const outerFn = sinon.stub().returns(innerFn);

    const result = service.bind(outerFn);

    chai.expect(result).to.equal(innerFn);
    chai.expect(outerFn.calledOnce).to.be.true;
    chai.expect(innerFn.notCalled).to.be.true;
  });

  it('initializes a datasource and data context', () => {
    chai.expect(service.url).to.equal(Location.rootUrl);
    const dataSource = service.getDatasource();
    chai.expect(dataSource).to.haveOwnProperty('v1');
  });
});
