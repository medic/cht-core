import { assert, expect } from 'chai';
import sinon from 'sinon';
import { async, fakeAsync, tick } from '@angular/core/testing';

import { DbService } from '@mm-services/db.service';
import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';

describe('Translations Loader provider', () => {
  let provider:TranslationLoaderProvider;
  let DBGet;

  beforeEach(() => {
    DBGet = sinon.stub();
    provider = new TranslationLoaderProvider(<DbService>{ get: () => ({ get: DBGet }) });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns error when db throws error', async(() => {
    const expected = { status: 503 };
    DBGet.rejects(expected);
    provider.getTranslation('err').subscribe(
      () => assert.fail('expected error to be thrown'),
      (actual) => {
        expect(actual).to.deep.equal(expected);
      });
  }));

  it('returns empty when no translation document', async(() => {
    DBGet.rejects({ status: 404 });
    provider.getTranslation('notfound').subscribe((actual) => {
      expect(actual).to.deep.equal({});
      expect(DBGet.callCount).to.equal(1);
      expect(DBGet.args[0][0]).to.equal('messages-notfound');
    });
  }));

  it('returns values for the given key', async(() => {
    const expected = {
      prawn: 'shrimp',
      bbq: 'barbie'
    };
    DBGet.resolves({ custom: expected });
    provider.getTranslation('au').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
      expect(DBGet.callCount).to.equal(1);
      expect(DBGet.args[0][0]).to.equal('messages-au');
    });
  }));

  it('returns "en" wrapped in hyphens for test locale', async(() => {
    const doc = {
      prawn: 'prawn',
      bbq: 'barbeque'
    };
    const expected = {
      prawn: '-prawn-',
      bbq: '-barbeque-'
    };
    DBGet.resolves({ custom: doc });
    provider.getTranslation('test').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
      expect(DBGet.callCount).to.equal(1);
      expect(DBGet.args[0][0]).to.equal('messages-en');
    });
  }));

  it('should not load same language multiple times in parallel', fakeAsync(() => {
    const expected = {
      prawn: 'shrimp',
      bbq: 'barbie'
    };
    DBGet.resolves({ custom: expected });

    provider.getTranslation('en').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
    });
    provider.getTranslation('en').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
    });
    provider.getTranslation('en').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
    });
    tick();
    expect(DBGet.callCount).to.equal(1);
    expect(DBGet.args[0][0]).to.equal('messages-en');
  }));

  it('should load the same language more than once', fakeAsync(() => {
    const expected = {
      prawn: 'shrimp',
      bbq: 'barbie'
    };
    DBGet.resolves({ custom: expected });

    provider.getTranslation('en').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
    });
    provider.getTranslation('en').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
    });
    tick();
    expect(DBGet.callCount).to.equal(1);
    expect(DBGet.args[0][0]).to.equal('messages-en');

    provider.getTranslation('en').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
    });
    provider.getTranslation('en').subscribe((actual) => {
      expect(actual).to.deep.equal(expected);
    });

    tick();
    expect(DBGet.callCount).to.equal(2);
    expect(DBGet.args[1][0]).to.equal('messages-en');
  }));
});
