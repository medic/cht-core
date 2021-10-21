import { expect } from 'chai';
import sinon from 'sinon';

import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';

describe('LocalizeNumber', () => {
  let formatNumberService;
  let pipe;

  beforeEach(() => {
    formatNumberService = { localize: sinon.stub() };
    pipe = new LocalizeNumberPipe(formatNumberService);
  });

  afterEach(() => sinon.restore());

  it('should return result from localize', async () => {
    formatNumberService.localize.returns('thing');
    expect(pipe.transform('some')).to.equal('thing');
    expect(formatNumberService.localize.callCount).to.equal(1);
    expect(formatNumberService.localize.args[0]).to.deep.equal(['some']);
  });

  it('should work with any data type', () => {
    formatNumberService.localize.returns('thing');
    expect(pipe.transform('some')).to.equal('thing');
    expect(pipe.transform({})).to.equal('thing');
    expect(pipe.transform(['something'])).to.equal('thing');
    expect(pipe.transform(undefined)).to.equal('thing');

    expect(formatNumberService.localize.callCount).to.equal(4);
    expect(formatNumberService.localize.args).to.deep.equal([ ['some'], [{}], [['something']], [undefined] ]);
  });
});
