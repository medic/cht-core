import { expect } from 'chai';
import { FormModel } from 'enketo-core';

// Pins the enketo-core/mergexml behaviour the report-edit path relies on: a foreign
// `data-attachment-ref` on an empty binary node must survive FormModel merge + getStr, since that
// sidecar is the only thing preserving an untouched inline binary on edit (#10904).
describe('inline-binary data-attachment-ref round-trip (enketo-core dependency pin)', () => {
  it('preserves data-attachment-ref on an empty binary node through mergeXml + getStr', () => {
    const modelStr = [
      '<model>',
      '<instance>',
      '<my-form id="my-form" version="1">',
      '<name/>',
      '<my_file/>',
      '<meta><instanceID/></meta>',
      '</my-form>',
      '</instance>',
      '</model>',
    ].join('');

    // Untouched binary: empty node, reference carried only in the sidecar attribute.
    const instanceStr = [
      '<my-form id="my-form" version="1">',
      '<name>Mary</name>',
      '<my_file type="binary" data-attachment-ref="my_file"></my_file>',
      '<meta><instanceID>uuid:test</instanceID></meta>',
      '</my-form>',
    ].join('');

    const model = new FormModel({ modelStr, instanceStr });
    const loadErrors = model.init();
    expect(loadErrors).to.deep.equal([]);

    const dataStr = model.getStr();

    // Tolerant of single/double quoting in the serializer output.
    expect(dataStr).to.match(/data-attachment-ref=["']my_file["']/);
  });
});
