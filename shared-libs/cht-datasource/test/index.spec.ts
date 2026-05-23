import { expect } from 'chai';
import * as Index from '../src';
import { DataContext } from '../src';
import { hasAnyPermission, hasPermissions } from '../src/auth';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';

describe('CHT Script API - getDatasource', () => {
  let dataContext: DataContext;
  let dataContextBind: SinonStub;
  let assertDataContext: SinonStub;
  let datasource: ReturnType<typeof Index.getDatasource>;

  beforeEach(() => {
    dataContextBind = sinon.stub();
    dataContext = { bind: dataContextBind };
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    datasource = Index.getDatasource(dataContext);
  });

  afterEach(() => sinon.restore());

  it('contains expected keys', () => {
    expect(datasource).to.have.all.keys([ 'v1' ]);
  });

  it('throws an error if the data context is invalid', () => {
    assertDataContext.throws(new Error(`Invalid data context [null].`));
    expect(() => Index.getDatasource(dataContext)).to.throw('Invalid data context [null].');
  });

  describe('v1', () => {
    let v1: typeof datasource.v1;

    beforeEach(() => v1 = datasource.v1);

    it('contains expected keys', () => expect(v1).to.have.all.keys([
      'contact', 'hasPermissions', 'hasAnyPermission', 'person', 'place', 'report', 'target'
    ]));

    it('hasPermissions', () => {
      const bound = sinon.stub().returns(true);
      dataContextBind.returns(bound);

      const result = v1.hasPermissions('can_edit', ['chw']);

      expect(result).to.equal(true);
      expect(dataContextBind.calledOnceWithExactly(hasPermissions)).to.be.true;
      expect(bound.calledOnceWithExactly('can_edit', ['chw'], undefined)).to.be.true;
    });

    it('hasAnyPermission', () => {
      const bound = sinon.stub().returns(true);
      dataContextBind.returns(bound);

      const result = v1.hasAnyPermission([['can_edit']], ['chw']);

      expect(result).to.equal(true);
      expect(dataContextBind.calledOnceWithExactly(hasAnyPermission)).to.be.true;
      expect(bound.calledOnceWithExactly([['can_edit']], ['chw'], undefined)).to.be.true;
    });
  });
});
