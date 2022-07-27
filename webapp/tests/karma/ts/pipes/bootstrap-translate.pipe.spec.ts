import { expect } from 'chai';

import { BootstrapTranslatePipe } from '@mm-pipes/bootstrap-translate.pipe';

describe('Bootstrap Translate Pipe', () => {
  let pipe;

  before(() => {
    pipe = new BootstrapTranslatePipe();
  });

  it('should return translation', () => {
    expect(pipe.transform('SESSION_EXPIRED_TITLE')).to.equal('Session has expired');
    expect(pipe.transform('FETCH_INFO', { count: 5, total: 10 })).to.equal('Fetching info (5 of 10 docs )…');
  });

  it('should return bootstrap key when no translation found', () => {
    expect(pipe.transform('no_translated_key')).to.equal('bootstrap.translator.no_translated_key');
  });
});
