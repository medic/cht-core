import { expect } from 'chai';
import { getRemoteDataContext } from '../../../src';

describe('remote context lib', () => {

  it('getRemoteDataContext', () => {
    expect(getRemoteDataContext()).to.deep.equal({});
  });
});
