import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as Context from '../../src/libs/data-context';
import * as Core from '../../src/libs/core';
import { getGeneratorFn, getPagedDataFn } from '../../src/libs/paginated';
import { InvalidArgumentError } from '../../src/libs/error';
import { DataContext } from '../../src';

describe('paginated', () => {
  const dataContext = { bind: sinon.stub() } as unknown as DataContext;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;

  beforeEach(() => {
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
  });

  afterEach(() => sinon.restore());

  describe('getPagedDataFn', () => {
    const localFn = (() => null) as unknown as Parameters<typeof getPagedDataFn>[0];
    const remoteFn = (() => null) as unknown as Parameters<typeof getPagedDataFn>[1];
    const defaultLimit = 100;
    const qualifier = { freetext: 'search' };
    const page = { data: ['a', 'b'], cursor: '2' };
    let innerFn: SinonStub;
    let assertQualifier: SinonStub;

    beforeEach(() => {
      innerFn = sinon.stub().resolves(page);
      adapt.returns(innerFn);
      assertQualifier = sinon.stub();
    });

    const build = () => getPagedDataFn(localFn, remoteFn, assertQualifier, defaultLimit)(dataContext);

    it('asserts the data context and adapts the provided local/remote implementations', () => {
      const fn = build();

      expect(fn).to.be.a('function');
      expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
      expect(adapt.calledOnceWithExactly(dataContext, localFn, remoteFn)).to.be.true;
    });

    it('throws when the data context is invalid', () => {
      assertDataContext.throws(new Error('Invalid data context [null].'));

      expect(() => getPagedDataFn(localFn, remoteFn, assertQualifier, defaultLimit)(dataContext))
        .to.throw('Invalid data context [null].');
      expect(adapt.notCalled).to.be.true;
    });

    it('resolves a page using the default cursor and limit when none are provided', async () => {
      const result = await build()(qualifier);

      expect(result).to.equal(page);
      expect(assertQualifier.calledOnceWithExactly(qualifier)).to.be.true;
      expect(innerFn.calledOnceWithExactly(qualifier, null, defaultLimit)).to.be.true;
    });

    it('passes the cursor through and coerces a stringified limit to a number', async () => {
      const result = await build()(qualifier, '5', '3');

      expect(result).to.equal(page);
      expect(innerFn.calledOnceWithExactly(qualifier, '5', 3)).to.be.true;
    });

    it('rejects an invalid cursor before validating the qualifier or calling the implementation', async () => {
      await expect(build()(qualifier, 5 as unknown as string))
        .to.be.rejectedWith(InvalidArgumentError, 'The cursor must be a string or null for first page: [5]');
      expect(assertQualifier.notCalled).to.be.true;
      expect(innerFn.notCalled).to.be.true;
    });

    it('rejects an invalid limit before validating the qualifier or calling the implementation', async () => {
      await expect(build()(qualifier, null, -1))
        .to.be.rejectedWith(InvalidArgumentError, 'The limit must be a positive integer: [-1]');
      expect(assertQualifier.notCalled).to.be.true;
      expect(innerFn.notCalled).to.be.true;
    });

    it('rejects an invalid qualifier without calling the implementation', async () => {
      assertQualifier.throws(new InvalidArgumentError('Invalid qualifier.'));

      await expect(build()(qualifier, null, defaultLimit))
        .to.be.rejectedWith(InvalidArgumentError, 'Invalid qualifier.');
      expect(assertQualifier.calledOnceWithExactly(qualifier)).to.be.true;
      expect(innerFn.notCalled).to.be.true;
    });
  });

  describe('getGeneratorFn', () => {
    const qualifier = { freetext: 'search' };
    const pagedFn = (() => null) as unknown as Parameters<typeof getGeneratorFn>[0];
    const mockGenerator = {} as AsyncGenerator<string, null>;
    let bind: SinonStub;
    let boundPagedFn: SinonStub;
    let getPagedGenerator: SinonStub;
    let assertQualifier: SinonStub;

    beforeEach(() => {
      boundPagedFn = sinon.stub();
      bind = dataContext.bind as SinonStub;
      bind.resetHistory();
      bind.returns(boundPagedFn);
      getPagedGenerator = sinon.stub(Core, 'getPagedGenerator').returns(mockGenerator);
      assertQualifier = sinon.stub();
    });

    it('binds the paged getter and drains it into a generator', () => {
      const generator = getGeneratorFn(pagedFn, assertQualifier)(dataContext)(qualifier);

      expect(generator).to.equal(mockGenerator);
      expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
      expect(bind.calledOnceWithExactly(pagedFn)).to.be.true;
      expect(assertQualifier.calledOnceWithExactly(qualifier)).to.be.true;
      expect(getPagedGenerator.calledOnceWithExactly(boundPagedFn, qualifier)).to.be.true;
    });

    it('throws when the data context is invalid', () => {
      assertDataContext.throws(new Error('Invalid data context [null].'));

      expect(() => getGeneratorFn(pagedFn, assertQualifier)(dataContext)).to.throw('Invalid data context [null].');
      expect(bind.notCalled).to.be.true;
    });

    it('throws an invalid qualifier without draining any pages', () => {
      assertQualifier.throws(new InvalidArgumentError('Invalid qualifier.'));

      expect(() => getGeneratorFn(pagedFn, assertQualifier)(dataContext)(qualifier))
        .to.throw(InvalidArgumentError, 'Invalid qualifier.');
      expect(getPagedGenerator.notCalled).to.be.true;
    });
  });
});
