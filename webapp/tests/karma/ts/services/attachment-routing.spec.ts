import { expect } from 'chai';
import * as objectPath from 'object-path';

import {
  computeAttachmentReference,
  findUploadNodeByFilename,
  indexedFieldPath,
} from '@mm-services/attachment-routing';
import { EnketoTranslationService } from '@mm-services/enketo-translation.service';

describe('attachment-routing', () => {
  const parse = (xml: string): Element => new DOMParser().parseFromString(xml, 'text/xml').documentElement;

  describe('computeAttachmentReference', () => {
    it('returns a single bare segment for a field directly under the container', () => {
      const root = parse('<data><photo/></data>');
      const photo = root.getElementsByTagName('photo')[0];
      expect(computeAttachmentReference(photo, root)).to.equal('photo');
    });

    it('joins nested segments relative to the container, with no form-id prefix', () => {
      const root = parse('<my-form><group><photo/></group></my-form>');
      const photo = root.getElementsByTagName('photo')[0];
      expect(computeAttachmentReference(photo, root)).to.equal('group/photo');
    });

    it('adds a 1-based bracket only for same-name (repeat) siblings', () => {
      const root = parse('<f><g/><g><photo/></g></f>');
      const photo = root.getElementsByTagName('photo')[0];
      expect(computeAttachmentReference(photo, root)).to.equal('g[2]/photo');
    });

    it('roots the path at the given container, not the instance root (sub-doc case)', () => {
      const root = parse('<my-form><child><group><photo/></group></child></my-form>');
      const child = root.getElementsByTagName('child')[0];
      const photo = root.getElementsByTagName('photo')[0];
      expect(computeAttachmentReference(photo, child)).to.equal('group/photo');
    });
  });

  describe('findUploadNodeByFilename', () => {
    it('returns the [type=file] node whose text matches the filename', () => {
      const root = parse('<f><a type="file">one.png</a><b type="file">two.png</b></f>');
      expect(findUploadNodeByFilename(root, 'two.png')?.tagName).to.equal('b');
    });

    it('returns null when no [type=file] node matches', () => {
      const root = parse('<f><a type="file">one.png</a></f>');
      expect(findUploadNodeByFilename(root, 'missing.png')).to.equal(null);
    });

    it('returns the first match when multiple nodes share the filename (session-unique in practice)', () => {
      const root = parse('<f><a type="file">dup.png</a><b type="file">dup.png</b></f>');
      expect(findUploadNodeByFilename(root, 'dup.png')?.tagName).to.equal('a');
    });

    it('ignores a non-file node even when its text matches', () => {
      const root = parse('<f><a type="binary">x.png</a><b type="file">x.png</b></f>');
      expect(findUploadNodeByFilename(root, 'x.png')?.tagName).to.equal('b');
    });
  });

  // A binary inside a plain <repeat> is array-ified by reportRecordToJs
  // (doc.fields.<repeat>[i].<field>); indexedFieldPath must reconstruct that array
  // index so objectPath.set lands on the array entry instead of corrupting it.
  describe('indexedFieldPath (report repeat-index reconstruction)', () => {
    const RECORD = require('./enketo-xml/plain-repeat-binary.xml').default;
    const FORM = require('./enketo-xml/plain-repeat-binary-form.xml').default;
    const translation = new EnketoTranslationService();

    it('reportRecordToJs array-ifies a plain repeat', () => {
      const fields: any = translation.reportRecordToJs(RECORD, FORM);
      expect(translation.getRepeatPaths(FORM)).to.deep.equal(['/my-form/my_repeat']);
      expect(Array.isArray(fields.my_repeat)).to.equal(true);
      expect(fields.my_repeat.length).to.equal(2);
    });

    it('reconstructs the array-index path and objectPath.set preserves the array', () => {
      const root = parse(RECORD);
      const repeatPaths = translation.getRepeatPaths(FORM);
      const photos = Array.from(root.getElementsByTagName('photo'));
      expect(photos.length).to.equal(2);

      // segments are fields-relative (the report strategy prepends 'fields')
      expect(indexedFieldPath(photos[0], root, repeatPaths)).to.deep.equal(['my_repeat', 0, 'photo']);
      expect(indexedFieldPath(photos[1], root, repeatPaths)).to.deep.equal(['my_repeat', 1, 'photo']);

      // the reference keeps the 1-based bracket relative to the container, so the
      // two instances get distinct, unique attachment names
      expect(computeAttachmentReference(photos[0], root)).to.equal('my_repeat[1]/photo');
      expect(computeAttachmentReference(photos[1], root)).to.equal('my_repeat[2]/photo');

      // route the references into the parsed fields, as the report strategy does
      const fields: any = translation.reportRecordToJs(RECORD, FORM);
      photos.forEach((photo) => {
        const segments = indexedFieldPath(photo, root, repeatPaths);
        objectPath.set(fields, segments, computeAttachmentReference(photo, root));
      });

      expect(Array.isArray(fields.my_repeat)).to.equal(true);
      expect(fields.my_repeat).to.deep.equal([
        { photo: 'my_repeat[1]/photo' },
        { photo: 'my_repeat[2]/photo' },
      ]);
    });

    it('emits a plain (non-indexed) path for a main-doc field outside any repeat', () => {
      const root = parse(RECORD);
      const name = root.getElementsByTagName('name')[0];
      expect(indexedFieldPath(name, root, translation.getRepeatPaths(FORM))).to.deep.equal(['name']);
    });
  });
});
