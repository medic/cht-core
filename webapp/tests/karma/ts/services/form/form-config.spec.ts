import { expect } from 'chai';

import { FormConfig } from '@mm-services/form/form-config';

describe('FormConfig', () => {
  it('parses repeatPaths from repeat[nodeset] elements in the xml', () => {
    const xml = `
      <h:html xmlns:h="http://www.w3.org/1999/xhtml">
        <repeat nodeset="/data/child"/>
        <repeat nodeset="/data/other/item"/>
      </h:html>`;

    const config = new FormConfig({}, 'report', xml, '', '');

    expect(config.repeatPaths).to.deep.equal(['/data/child', '/data/other/item']);
  });

  it('returns an empty repeatPaths array when there are no repeats', () => {
    const config = new FormConfig({}, 'report', '<data><name/></data>', '', '');

    expect(config.repeatPaths).to.deep.equal([]);
  });

  it('filters out repeats with an empty nodeset', () => {
    const xml = '<data><repeat nodeset=""/><repeat nodeset="/data/child"/></data>';

    const config = new FormConfig({}, 'report', xml, '', '');

    expect(config.repeatPaths).to.deep.equal(['/data/child']);
  });

  it('stores the doc, type, html and model as given', () => {
    const doc = { _id: 'form:test', xmlVersion: '2.0' };

    const config = new FormConfig(doc, 'contact', '<data/>', '<div>the html</div>', '<model>the model</model>');

    expect(config.doc).to.equal(doc);
    expect(config.type).to.equal('contact');
    expect(config.html).to.equal('<div>the html</div>');
    expect(config.model).to.equal('<model>the model</model>');
  });
});
