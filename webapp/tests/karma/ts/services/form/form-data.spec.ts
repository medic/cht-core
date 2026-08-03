import { expect } from 'chai';
import sinon from 'sinon';

import { FormConfig } from '@mm-services/form/form-config';
import {
  EnketoContactFormData,
  EnketoFormData,
  EnketoReportFormData,
} from '@mm-services/form/form-data';
import * as FileManager from '../../../../../src/js/enketo/file-manager.js';

const parseXml = (xml: string): XMLDocument => new DOMParser().parseFromString(xml, 'text/xml');

const REPORTED_DATE = 1700000000000;
const UUID_PATTERN = /^[0-9a-f-]{36}$/;

const buildFormConfig = (
  repeatPaths: string[] = [],
  xmlVersion: any = '1.0',
  internalId = 'my-form'
): FormConfig => {
  const repeatXml = repeatPaths.map(path => `<repeat nodeset="${path}"/>`).join('');
  const xml = `<root>${repeatXml}</root>`;
  return new FormConfig({ xmlVersion, internalId }, 'report', xml, '', '');
};

describe('form-data', () => {
  let getCurrentFiles;

  beforeEach(() => {
    getCurrentFiles = sinon.stub(FileManager, 'getCurrentFiles').returns([]);
  });

  afterEach(() => sinon.restore());

  describe('EnketoFormData', () => {
    describe('deserializeDoc', () => {
      it('converts a leaf element to its text content', () => {
        const doc = parseXml('<data><name>Sally</name><age>10</age></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'Sally',
          age: '10',
        });
      });

      it('converts a nested element to a nested object', () => {
        const doc = parseXml(`
          <data>
            <name>Sally</name>
            <address>
              <city>Springfield</city>
              <geo>
                <lat>-47.15</lat>
                <long>-126.72</long>
              </geo>
            </address>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'Sally',
          address: {
            city: 'Springfield',
            geo: { lat: '-47.15', long: '-126.72' },
          },
        });
      });

      it('accumulates repeat paths into an array', () => {
        const doc = parseXml(`
          <data>
            <name>parent</name>
            <child><name>Daddy Bear</name></child>
            <child><name>Baby Bear</name></child>
            <child><name>Goldilocks</name></child>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(['/data/child']), REPORTED_DATE);

        expect(result).excluding(['_id', 'form_version', 'reported_date', '_attachments']).to.deep.equal({
          name: 'parent',
          child: [
            { name: 'Daddy Bear' },
            { name: 'Baby Bear' },
            { name: 'Goldilocks' },
          ],
        });
      });

      it('accumulates nested repeats', () => {
        const doc = parseXml(`
          <data>
            <name>parent</name>
            <child>
              <name>Daddy Bear</name>
              <foods><type>ugali</type></foods>
              <foods><type>chapati</type></foods>
            </child>
            <child><name>Baby Bear</name><foods><type>porridge</type></foods></child>
            <child><name>Goldilocks</name><foods><type>oatmeal</type></foods></child>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const config = buildFormConfig(['/data/child', '/data/child/foods']);
        const result = formData.deserializeDoc(config, REPORTED_DATE);

        expect(result).excluding(['_id', 'form_version', 'reported_date', '_attachments']).to.deep.equal({
          name: 'parent',
          child: [
            { name: 'Daddy Bear', foods: [{ type: 'ugali' }, { type: 'chapati' }] },
            { name: 'Baby Bear', foods: [{ type: 'porridge' }] },
            { name: 'Goldilocks', foods: [{ type: 'oatmeal' }] },
          ],
        });
      });

      it('creates a single-entry array when a repeat path occurs only once', () => {
        const doc = parseXml('<data><child><name>Only Child</name></child></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(['/data/child']), REPORTED_DATE);

        expect(result).excluding(['_id', 'form_version', 'reported_date', '_attachments']).to.deep.equal({
          child: [{ name: 'Only Child' }],
        });
      });

      it('takes the last value for a duplicated non-repeat element', () => {
        const doc = parseXml('<data><val>1</val><val>2</val><val>3</val></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result).excluding(['_id', 'form_version', 'reported_date', '_attachments']).to.deep.equal({ val: '3' });
      });

      it('adds the _id and the form_version from the form config', () => {
        const doc = parseXml('<data><name>Sally</name></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig([], '2020-01-01'), REPORTED_DATE);

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '2020-01-01',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'Sally',
        });
      });

      it('merges the original doc under the form data', () => {
        const doc = parseXml('<data><name>Sally</name></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE, {
          _id: 'original-id',
          _rev: '2-abc',
          type: 'person',
          name: 'Sal',
        });

        expect(result).to.deep.equal({
          _id: 'the-id',
          _rev: '2-abc',
          type: 'person',
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          // The form data wins over the original doc value
          name: 'Sally',
        });
      });

      it('keeps the reported_date of the original doc', () => {
        const doc = parseXml('<data><name>Sally</name></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE, { reported_date: 100 });

        expect(result.reported_date).to.equal(100);
      });
    });

    describe('findNodeWithTextContent', () => {
      it('finds the first node with the given text content', () => {
        const doc = parseXml(`
          <data>
            <name>Sally</name>
            <secret>hunter2</secret>
            <type>hunter2</type>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const node = formData.findNodeWithTextContent('hunter2');

        expect(node!.nodeName).to.equal('secret');
      });

      it('returns null when no node has the given text content', () => {
        const doc = parseXml('<data><name>Sally</name></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        expect(formData.findNodeWithTextContent('nope')).to.be.null;
      });

      it('ignores nodes contained in a nested db-doc', () => {
        const doc = parseXml(`
          <data>
            <sub db-doc="true"><file>photo.png</file></sub>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        expect(formData.findNodeWithTextContent('photo.png')).to.be.null;
      });

      it('finds nodes in its own db-doc when the root element is the db-doc', () => {
        const doc = parseXml(`
          <data>
            <sub db-doc="true"><file>photo.png</file></sub>
          </data>`);
        const subElement = doc.querySelector('sub')!;
        const formData = new EnketoFormData(subElement, 'the-id');

        expect(formData.findNodeWithTextContent('photo.png')!.nodeName).to.equal('file');
      });
    });

    describe('binaryTypeElements', () => {
      it('collects the type=binary elements', () => {
        const doc = parseXml(`
          <data>
            <name>Sally</name>
            <photo type="binary">data</photo>
            <sub><other type="binary">other data</other></sub>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        expect(formData.binaryTypeElements.map(element => element.nodeName)).to.deep.equal(['photo', 'other']);
      });

      it('excludes type=binary elements contained in a nested db-doc', () => {
        const doc = parseXml(`
          <data>
            <photo type="binary">data</photo>
            <sub db-doc="true"><other type="binary">other data</other></sub>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        expect(formData.binaryTypeElements.map(element => element.nodeName)).to.deep.equal(['photo']);
      });
    });

    describe('attachments', () => {
      it('builds a binary attachment named for the field path relative to the doc root', () => {
        const doc = parseXml(`
          <data>
            <name>Sally</name>
            <my_file type="binary">some image data</my_file>
            <sub_element>
              <sub_sub_element><other_file type="binary">other data</other_file></sub_sub_element>
            </sub_element>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result._attachments).to.deep.equal({
          'user-file/my_file': { data: 'some image data', content_type: 'image/png' },
          'user-file/sub_element/sub_sub_element/other_file': {
            data: 'other data',
            content_type: 'image/png',
          },
        });
        // The binary data lives in the attachment, not in the field value
        expect(result.my_file).to.equal('');
        expect(result.sub_element).to.deep.equal({ sub_sub_element: { other_file: '' } });
      });

      it('includes the repeat index in the binary attachment name', () => {
        const doc = parseXml(`
          <data>
            <my_repeat><photo type="binary">data 0</photo></my_repeat>
            <my_repeat><photo type="binary">data 1</photo></my_repeat>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(['/data/my_repeat']), REPORTED_DATE);

        expect(result._attachments).to.deep.equal({
          'user-file/my_repeat[1]/photo': { data: 'data 0', content_type: 'image/png' },
          'user-file/my_repeat[2]/photo': { data: 'data 1', content_type: 'image/png' },
        });
      });

      it('keeps the existing binary attachment when the field has no new value', () => {
        const doc = parseXml('<data><my_file type="binary"></my_file></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');
        const existing = { data: 'previously saved', content_type: 'image/png' };

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE, {
          _attachments: { 'user-file/my_file': existing },
        });

        expect(result._attachments).to.deep.equal({ 'user-file/my_file': existing });
      });

      it('does not build a binary attachment when there is no value and no existing attachment', () => {
        const doc = parseXml('<data><my_file type="binary"></my_file></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result._attachments).to.be.undefined;
      });

      it('drops an existing binary attachment when its field is gone from the form', () => {
        const doc = parseXml('<data><name>Sally</name></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE, {
          _attachments: { 'user-file/my_file': { data: 'orphan', content_type: 'image/png' } },
        });

        expect(result._attachments).to.be.undefined;
      });

      it('builds file attachments for the uploaded files referenced by a field', () => {
        const doc = parseXml('<data><my_file type="file">my image.png</my_file></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');
        getCurrentFiles.returns([{ name: 'my image.png', type: 'image/png' }]);

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        const attachment = result._attachments['user-file-my image.png'];
        expect(attachment.content_type).to.equal('image/png');
        expect(attachment.data).to.be.an.instanceof(Blob);
        // The file name reference is left in the field value
        expect(result.my_file).to.equal('my image.png');
      });

      it('ignores uploaded files that are not referenced by any field', () => {
        const doc = parseXml('<data><my_file type="file">referenced.png</my_file></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');
        getCurrentFiles.returns([
          { name: 'referenced.png', type: 'image/png' },
          { name: 'orphan.png', type: 'image/png' },
        ]);

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(Object.keys(result._attachments)).to.deep.equal(['user-file-referenced.png']);
      });

      it('ignores uploaded files only referenced from within a nested db-doc', () => {
        const doc = parseXml(`
          <data>
            <sub db-doc="true"><sub_file type="file">sub_upload.png</sub_file></sub>
          </data>`);
        const formData = new EnketoFormData(doc.documentElement, 'the-id');
        getCurrentFiles.returns([{ name: 'sub_upload.png', type: 'image/png' }]);

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result._attachments).to.be.undefined;
      });

      it('retains custom attachments and referenced file attachments, dropping unreferenced ones', () => {
        const doc = parseXml('<data><photo type="file">referenced.png</photo></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE, {
          _attachments: {
            'some-custom-attachment': { content_type: 'text/plain', data: 'c' },
            'user-file-referenced.png': { content_type: 'image/png', data: 'a' },
            'user-file-orphan.png': { content_type: 'image/png', data: 'b' },
          },
        });

        expect(result._attachments).to.deep.equal({
          'some-custom-attachment': { content_type: 'text/plain', data: 'c' },
          'user-file-referenced.png': { content_type: 'image/png', data: 'a' },
        });
      });

      it('overwrites an existing file attachment with the newly uploaded file of the same name', () => {
        const doc = parseXml('<data><photo type="file">referenced.png</photo></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');
        getCurrentFiles.returns([{ name: 'referenced.png', type: 'image/png' }]);

        const result = formData.deserializeDoc(buildFormConfig(), REPORTED_DATE, {
          _attachments: { 'user-file-referenced.png': { content_type: 'image/png', data: 'old' } },
        });

        expect(result._attachments['user-file-referenced.png'].data).to.be.an.instanceof(Blob);
      });
    });
  });

  describe('EnketoContactFormData', () => {
    it('throws when the group named after the contact type is missing', () => {
      const doc = parseXml('<data><clinic><name>A Clinic</name></clinic></data>');

      expect(() => new EnketoContactFormData(doc, 'the-id', 'person'))
        .to.throw('Failed to save contact form because the data for the contact is not contained in the person group.');
    });

    describe('getContactData', () => {
      it('lifts the contact data out of the type group and adds _id and form_version', () => {
        const doc = parseXml(`
          <data>
            <person>
              <name>Denise</name>
              <phone>+123456789</phone>
            </person>
          </data>`);
        const contactData = new EnketoContactFormData(doc, 'the-id', 'person');

        const result = contactData
          .getContactData()
          .deserializeDoc(buildFormConfig([], '3.5'), REPORTED_DATE);

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '3.5',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'Denise',
          phone: '+123456789',
          parent: undefined,
          contact: undefined,
        });
      });

      it('lifts string parent/contact id values into { _id } objects', () => {
        const doc = parseXml(`
          <data>
            <clinic>
              <_id>catchment-id</_id>
              <name>A New Catchment Area</name>
              <parent>parent-abc</parent>
              <contact>contact-xyz</contact>
            </clinic>
          </data>`);
        const contactData = new EnketoContactFormData(doc, 'the-id', 'clinic');

        const result = contactData
          .getContactData()
          .deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'A New Catchment Area',
          parent: { _id: 'parent-abc' },
          contact: { _id: 'contact-xyz' },
        });
      });

      it('leaves already-nested parent/contact objects untouched', () => {
        const doc = parseXml(`
          <data>
            <clinic>
              <name>A Clinic</name>
              <parent><_id>parent-abc</_id><name>The Parent</name></parent>
              <contact><_id>contact-xyz</_id><name>The Contact</name></contact>
            </clinic>
          </data>`);
        const contactData = new EnketoContactFormData(doc, 'the-id', 'clinic');

        const result = contactData
          .getContactData()
          .deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'A Clinic',
          parent: { _id: 'parent-abc', name: 'The Parent' },
          contact: { _id: 'contact-xyz', name: 'The Contact' },
        });
      });

      it('names binary attachments relative to the contact type group', () => {
        const doc = parseXml(`
          <data>
            <clinic>
              <name>A Clinic</name>
              <my_file type="binary">some image data</my_file>
            </clinic>
          </data>`);
        const contactData = new EnketoContactFormData(doc, 'the-id', 'clinic');

        const result = contactData
          .getContactData()
          .deserializeDoc(buildFormConfig([], '1.0', 'contact-form'), REPORTED_DATE);

        expect(result.my_file).to.equal('');
        expect(result._attachments).to.deep.equal({
          'user-file/my_file': { data: 'some image data', content_type: 'image/png' },
        });
      });
    });

    describe('getChildData', () => {
      it('returns child docs from repeat > child, using the _id element when present', () => {
        const doc = parseXml(`
          <data>
            <person><name>Mum</name></person>
            <repeat>
              <child><_id>child-1</_id><name>Daddy Bear</name></child>
              <child><name>Baby Bear</name></child>
            </repeat>
          </data>`);
        const contactData = new EnketoContactFormData(doc, 'the-id', 'person');

        const [child1, child2, ...additional] = contactData.getChildData();

        expect(additional).to.be.empty;
        expect(child1.id).to.equal('child-1');
        expect(child1.deserializeDoc(buildFormConfig(), REPORTED_DATE)).to.deep.equal({
          _id: 'child-1',
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'Daddy Bear',
        });
        // No _id element present, so a uuid is generated.
        expect(child2.id).to.match(UUID_PATTERN);
        expect(child2.deserializeDoc(buildFormConfig(), REPORTED_DATE)).to.deep.equal({
          _id: child2.id,
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'Baby Bear',
        });
      });

      it('returns an empty array when there are no repeat > child elements', () => {
        const doc = parseXml('<data><person><name>Mum</name></person></data>');
        const contactData = new EnketoContactFormData(doc, 'the-id', 'person');

        expect(contactData.getChildData()).to.deep.equal([]);
      });
    });

    describe('getSiblingData', () => {
      it('returns the sibling form data for the named top-level group', () => {
        const doc = parseXml(`
          <data>
            <clinic><name>A Clinic</name></clinic>
            <parent><_id>parent-1</_id><name>The Parent</name></parent>
            <contact><name>The Contact</name></contact>
          </data>`);
        const contactData = new EnketoContactFormData(doc, 'the-id', 'clinic');

        const parent = contactData.getSiblingData('parent');
        expect(parent!.id).to.equal('parent-1');
        expect(parent!.deserializeDoc(buildFormConfig(), REPORTED_DATE)).to.deep.equal({
          _id: 'parent-1',
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'The Parent',
        });

        const contact = contactData.getSiblingData('contact');
        expect(contact!.id).to.match(UUID_PATTERN);
        expect(contact!.deserializeDoc(buildFormConfig(), REPORTED_DATE)).to.deep.equal({
          _id: contact!.id,
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          name: 'The Contact',
        });
      });

      it('returns null when the sibling group is not present', () => {
        const doc = parseXml('<data><clinic><name>A Clinic</name></clinic></data>');
        const contactData = new EnketoContactFormData(doc, 'the-id', 'clinic');

        expect(contactData.getSiblingData('parent')).to.be.null;
      });
    });
  });

  describe('EnketoReportFormData', () => {
    describe('deserializeDoc', () => {
      it('nests the form data under fields and keeps the original doc properties', () => {
        const doc = parseXml('<data><lmp>10</lmp><name>Sally</name></data>');
        const reportData = new EnketoReportFormData(doc, 'the-id');

        const result = reportData.deserializeDoc(buildFormConfig(), REPORTED_DATE, {
          _id: 'original-id',
          form: 'V',
          type: 'data_record',
          contact: { _id: '123' },
        });

        expect(result).to.deep.equal({
          _id: 'the-id',
          form: 'V',
          type: 'data_record',
          contact: { _id: '123' },
          form_version: '1.0',
          reported_date: REPORTED_DATE,
          _attachments: undefined,
          fields: { lmp: '10', name: 'Sally' },
        });
      });
    });

    describe('getDbDocData', () => {
      it('returns form data for elements tagged db-doc=true', () => {
        const doc = parseXml(`
          <data>
            <report><name>The Report</name></report>
            <my_doc db-doc="true"><_id>doc-1</_id><type>data_record</type></my_doc>
            <another_doc db-doc="true"><name>Hello</name><type>data_record</type></another_doc>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');

        const [dbDoc1, dbDoc2, ...additional] = reportData.getDbDocData();

        expect(additional).to.be.empty;
        expect(dbDoc1.id).to.equal('doc-1');
        expect(dbDoc1.deserializeDoc(buildFormConfig(), REPORTED_DATE))
          .excluding(['form_version', 'reported_date', '_attachments'])
          .to.deep.equal({ _id: 'doc-1', type: 'data_record' });
        expect(dbDoc2.id).to.match(UUID_PATTERN);
        expect(dbDoc2.deserializeDoc(buildFormConfig(), REPORTED_DATE))
          .excluding(['form_version', 'reported_date', '_attachments'])
          .to.deep.equal({ _id: dbDoc2.id, name: 'Hello', type: 'data_record' });
      });

      it('returns form data for nested and repeated elements tagged db-doc=true', () => {
        const doc = parseXml(`
          <data>
            <report><name>The Report</name></report>
            <repeat><my_doc db-doc="true"><_id>doc-1</_id><type>data_record</type></my_doc></repeat>
            <repeat><my_doc db-doc="true"><_id>doc-2</_id><type>data_record</type></my_doc></repeat>
            <my_doc db-doc="true">
              <_id>doc-3</_id>
              <type>data_record</type>
              <my_doc db-doc="true"><_id>doc-4</_id><type>data_record</type></my_doc>
            </my_doc>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');

        const [dbDoc1, dbDoc2, dbDoc3, dbDoc4, ...additional] = reportData.getDbDocData();
        const exclusions = ['form_version', 'reported_date', '_attachments'];

        expect(additional).to.be.empty;
        expect(dbDoc1.id).to.equal('doc-1');
        expect(dbDoc1.deserializeDoc(buildFormConfig(), REPORTED_DATE))
          .excluding(exclusions)
          .to.deep.equal({ _id: 'doc-1', type: 'data_record' });
        expect(dbDoc2.id).to.equal('doc-2');
        expect(dbDoc2.deserializeDoc(buildFormConfig(), REPORTED_DATE))
          .excluding(exclusions)
          .to.deep.equal({ _id: 'doc-2', type: 'data_record' });
        expect(dbDoc3.id).to.equal('doc-3');
        expect(dbDoc3.deserializeDoc(buildFormConfig(), REPORTED_DATE))
          .excluding(exclusions)
          .to.deep.equal({
            _id: 'doc-3',
            type: 'data_record',
            my_doc: { _id: 'doc-4', type: 'data_record' }
          });
        expect(dbDoc4.id).to.equal('doc-4');
        expect(dbDoc4.deserializeDoc(buildFormConfig(), REPORTED_DATE))
          .excluding(exclusions)
          .to.deep.equal({ _id: 'doc-4', type: 'data_record' });
      });

      it('populates db-doc-ref elements with the id of the referenced doc', () => {
        const doc = parseXml(`
          <data>
            <ref db-doc-ref="/data/my_doc">placeholder</ref>
            <my_doc db-doc="true"><_id>doc-1</_id><type>data_record</type></my_doc>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');

        reportData.getDbDocData();

        expect(doc.querySelector('ref')!.textContent).to.equal('doc-1');
      });

      it('populates a db-doc-ref that references the main report', () => {
        const doc = parseXml(`
          <data>
            <my_doc db-doc="true"><_id>doc-1</_id><ref db-doc-ref="/data">placeholder</ref></my_doc>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');

        reportData.getDbDocData();

        expect(doc.querySelector('ref')!.textContent).to.equal('the-id');
      });

      it('leaves db-doc-ref elements with unresolvable references untouched', () => {
        const doc = parseXml(`
          <data>
            <ref db-doc-ref="/data/nope">placeholder</ref>
            <my_doc db-doc="true"><_id>doc-1</_id></my_doc>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');

        reportData.getDbDocData();

        expect(doc.querySelector('ref')!.textContent).to.equal('placeholder');
      });

      it('populates a local (./) db-doc-ref with the sibling db-doc in the same repeat', () => {
        const doc = parseXml(`
          <data>
            <repeat>
              <ref db-doc-ref="./my_doc">placeholder</ref>
              <my_doc db-doc="true"><_id>doc-1</_id></my_doc>
            </repeat>
            <repeat>
              <ref db-doc-ref="./my_doc">placeholder</ref>
              <my_doc db-doc="true"><_id>doc-2</_id></my_doc>
            </repeat>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');

        reportData.getDbDocData();

        const refs = Array.from(doc.querySelectorAll('ref')).map(element => element.textContent);
        expect(refs).to.deep.equal(['doc-1', 'doc-2']);
      });
    });

    it('collects hidden elements (tag=hidden)', () => {
      const doc = parseXml(`
        <data>
          <name>Sally</name>
          <secret tag="hidden">S4L</secret>
          <another tag="HIDDEN">S5L</another>
        </data>`);
      const reportData = new EnketoReportFormData(doc, 'the-id');

      const hidden = reportData.hiddenElements.map(el => el.nodeName);
      expect(hidden).to.deep.equal(['secret', 'another']);
    });

    it('collects db-doc-ref elements', () => {
      const doc = parseXml(`
        <data>
          <name>Sally</name>
          <ref db-doc-ref="/data/my_doc">something</ref>
          <my_doc db-doc="true"><_id db-doc-ref="/data/name">doc-4</_id><type>data_record</type></my_doc>
        </data>`);
      const reportData = new EnketoReportFormData(doc, 'the-id');

      const refs = reportData.dbDocRefElements.map(element => element.getAttribute('db-doc-ref'));
      expect(refs).to.deep.equal(['/data/my_doc', '/data/name']);
    });

    describe('attachments', () => {
      it('routes binary attachments to the db-doc that owns the field', () => {
        const doc = parseXml(`
          <data>
            <main_photo type="binary">main data</main_photo>
            <doc1 db-doc="true"><type>thing_1</type><photo1 type="binary">sub data</photo1></doc1>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');
        const [subDoc] = reportData.getDbDocData();

        const subResult = subDoc.deserializeDoc(buildFormConfig(), REPORTED_DATE);
        const rootResult = reportData.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(subResult._attachments).to.deep.equal({
          'user-file/photo1': { data: 'sub data', content_type: 'image/png' },
        });
        expect(subResult.photo1).to.equal('');
        expect(rootResult._attachments).to.deep.equal({
          'user-file/main_photo': { data: 'main data', content_type: 'image/png' },
        });
        expect(rootResult.fields).to.deep.equal({
          main_photo: '',
          doc1: { type: 'thing_1', photo1: '' },
        });
      });

      it('routes file attachments to the db-doc that references the file', () => {
        const doc = parseXml(`
          <data>
            <main_file type="file">main_upload.png</main_file>
            <doc1 db-doc="true"><type>thing_1</type><sub_file type="file">sub_upload.png</sub_file></doc1>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');
        getCurrentFiles.returns([
          { name: 'main_upload.png', type: 'image/png' },
          { name: 'sub_upload.png', type: 'image/png' },
        ]);
        const [subDoc] = reportData.getDbDocData();

        const rootResult = reportData.deserializeDoc(buildFormConfig(), REPORTED_DATE);
        const subResult = subDoc.deserializeDoc(buildFormConfig(), REPORTED_DATE);

        expect(Object.keys(rootResult._attachments)).to.deep.equal(['user-file-main_upload.png']);
        expect(Object.keys(subResult._attachments)).to.deep.equal(['user-file-sub_upload.png']);
      });

      it('routes file attachments to the db-doc instance inside each repeat', () => {
        const doc = parseXml(`
          <data>
            <repeat_section>
              <repeat_doc db-doc="true"><repeat_file type="file">repeat_upload_1.png</repeat_file></repeat_doc>
            </repeat_section>
            <repeat_section>
              <repeat_doc db-doc="true"><repeat_file type="file">repeat_upload_2.png</repeat_file></repeat_doc>
            </repeat_section>
          </data>`);
        const reportData = new EnketoReportFormData(doc, 'the-id');
        getCurrentFiles.returns([
          { name: 'repeat_upload_1.png', type: 'image/png' },
          { name: 'repeat_upload_2.png', type: 'image/png' },
        ]);
        const [subDoc1, subDoc2] = reportData.getDbDocData();

        const rootResult = reportData.deserializeDoc(buildFormConfig(['/data/repeat_section']), REPORTED_DATE);
        const config = buildFormConfig(['/data/repeat_section']);

        expect(rootResult._attachments).to.be.undefined;
        expect(Object.keys(subDoc1.deserializeDoc(config, REPORTED_DATE)._attachments))
          .to.deep.equal(['user-file-repeat_upload_1.png']);
        expect(Object.keys(subDoc2.deserializeDoc(config, REPORTED_DATE)._attachments))
          .to.deep.equal(['user-file-repeat_upload_2.png']);
      });
    });
  });
});
