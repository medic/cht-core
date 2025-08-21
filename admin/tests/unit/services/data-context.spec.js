describe('DataContext service', () => {
  let service;

  beforeEach(() => {
    module('adminApp');
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

  it('returns the data source', () => {
    const dataSource = service.getDatasource();
    chai.expect(dataSource).to.haveOwnProperty('v1');
  });
});
