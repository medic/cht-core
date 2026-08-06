import { expect } from 'chai';
import sinon from 'sinon';
import * as extensionLibs from '@medic/extension-libs';

import { TranslateMustacheParserProvider } from '@mm-providers/translate-mustache-parser.provider';

describe('Translate Mustache parser provider', () => {
  let provider: TranslateMustacheParserProvider;

  beforeEach(() => {
    extensionLibs.set({});
    provider = new TranslateMustacheParserProvider();
  });

  afterEach(() => {
    extensionLibs.set({});
    sinon.restore();
  });

  it('uses the default interpolation behavior for translations without sections', () => {
    expect(provider.interpolate('Hello {{name}}', { name: 'Ada' })).to.equal('Hello Ada');
    expect(provider.interpolate('Hello {{missing}}', {})).to.equal('Hello {{missing}}');
  });

  it('uses extension-libs to transform translation parameters', () => {
    extensionLibs.set({
      'uppercase.js': value => value.toUpperCase(),
    });

    const result = provider.interpolate(
      '{{contact.name}} reported {{#uppercase}}{{patient.name}}{{/uppercase}}',
      {
        contact: { name: 'Ada' },
        patient: { name: 'Grace' },
      }
    );

    expect(result).to.equal('Ada reported GRACE');
  });

  it('supports standard Mustache sections and inverted sections', () => {
    const template = '{{#active}}Active{{/active}}{{^active}}Inactive{{/active}}';

    expect(provider.interpolate(template, { active: true })).to.equal('Active');
    expect(provider.interpolate(template, { active: false })).to.equal('Inactive');
  });

  it('falls back to default interpolation when a Mustache template is malformed', () => {
    const logError = sinon.stub(console, 'error');
    const malformedTemplate = '{{#active}}Active';

    const result = provider.interpolate(malformedTemplate, { active: true });

    expect(result).to.equal(malformedTemplate);
    expect(logError.calledOnce).to.equal(true);
  });

  it('delegates compiled MessageFormat translations to the default parser', () => {
    const compiled = (params) => `Hello ${params.name}`;

    expect(provider.interpolate(compiled, { name: 'Ada' })).to.equal('Hello Ada');
  });
});
