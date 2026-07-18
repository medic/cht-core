import { expect } from 'chai';

import { FormConfig } from '@mm-services/form/form-config';
import {
  EnektoContactFormData,
  EnketoFormData,
  EnketoReportFormData,
} from '@mm-services/form/form-data';

const parseXml = (xml: string): XMLDocument => new DOMParser().parseFromString(xml, 'text/xml');

const buildFormConfig = (repeatPaths: string[] = [], xmlVersion = '1.0'): FormConfig => {
  const repeatXml = repeatPaths.map(path => `<repeat nodeset="${path}"/>`).join('');
  const xml = `<root>${repeatXml}</root>`;
  return new FormConfig({ xmlVersion }, 'report', xml, '', '');
};

describe('form-data', () => {
  describe('EnketoFormData', () => {
    describe('deserialize', () => {
      it('converts a leaf element to its text content', () => {
        const doc = parseXml('<data><name>Sally</name><age>10</age></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserialize(buildFormConfig());

        expect(result).to.deep.equal({ name: 'Sally', age: '10' });
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

        const result = formData.deserialize(buildFormConfig());

        expect(result).to.deep.equal({
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

        const result = formData.deserialize(buildFormConfig(['/data/child']));

        expect(result).to.deep.equal({
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

        const result = formData.deserialize(buildFormConfig(['/data/child', '/data/child/foods']));

        expect(result).to.deep.equal({
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

        const result = formData.deserialize(buildFormConfig(['/data/child']));

        expect(result).to.deep.equal({ child: [{ name: 'Only Child' }] });
      });

      it('takes the last value for a duplicated non-repeat element', () => {
        const doc = parseXml('<data><val>1</val><val>2</val><val>3</val></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserialize(buildFormConfig());

        expect(result).to.deep.equal({ val: '3' });
      });
    });

    describe('deserializeDoc', () => {
      it('adds the _id and the form_version from the form config', () => {
        const doc = parseXml('<data><name>Sally</name></data>');
        const formData = new EnketoFormData(doc.documentElement, 'the-id');

        const result = formData.deserializeDoc(buildFormConfig([], '2020-01-01'));

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '2020-01-01',
          name: 'Sally',
        });
      });
    });
  });

  describe('EnektoContactFormData', () => {
    it('throws when the group named after the contact type is missing', () => {
      const doc = parseXml('<data><clinic><name>A Clinic</name></clinic></data>');

      expect(() => new EnektoContactFormData(doc, 'the-id', 'person'))
        .to.throw('Failed to save contact form because the data for the contact is not contained in the person group.');
    });

    describe('deserializeDoc', () => {
      it('lifts the contact data out of the type group and adds _id and form_version', () => {
        const doc = parseXml(`
          <data>
            <person>
              <name>Denise</name>
              <phone>+123456789</phone>
            </person>
          </data>`);
        const contactData = new EnektoContactFormData(doc, 'the-id', 'person');

        const result = contactData.deserializeDoc(buildFormConfig([], '3.5'));

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '3.5',
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
        const contactData = new EnektoContactFormData(doc, 'the-id', 'clinic');

        const result = contactData.deserializeDoc(buildFormConfig());

        expect(result).to.deep.equal({
          _id: 'catchment-id',
          form_version: '1.0',
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
        const contactData = new EnektoContactFormData(doc, 'the-id', 'clinic');

        const result = contactData.deserializeDoc(buildFormConfig());

        expect(result).to.deep.equal({
          _id: 'the-id',
          form_version: '1.0',
          name: 'A Clinic',
          parent: { _id: 'parent-abc', name: 'The Parent' },
          contact: { _id: 'contact-xyz', name: 'The Contact' },
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
        const contactData = new EnektoContactFormData(doc, 'the-id', 'person');

        const [child1, child2, ...additional] = contactData.getChildData();

        expect(additional).to.be.empty;
        expect(child1.id).to.equal('child-1');
        expect(child1.deserialize(buildFormConfig())).to.deep.equal({ _id: 'child-1', name: 'Daddy Bear' });
        // No _id element present, so a uuid is generated.
        expect(child2.id).to.match(/^[0-9a-f-]{36}$/);
        expect(child2.deserialize(buildFormConfig())).to.deep.equal({ name: 'Baby Bear' });
      });

      it('returns an empty array when there are no repeat > child elements', () => {
        const doc = parseXml('<data><person><name>Mum</name></person></data>');
        const contactData = new EnektoContactFormData(doc, 'the-id', 'person');

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
        const contactData = new EnektoContactFormData(doc, 'the-id', 'clinic');

        const parent = contactData.getSiblingData('parent');
        expect(parent!.id).to.equal('parent-1');
        expect(parent!.deserialize(buildFormConfig())).to.deep.equal({ _id: 'parent-1', name: 'The Parent' });

        const contact = contactData.getSiblingData('contact');
        expect(contact!.id).to.match(/^[0-9a-f-]{36}$/);
        expect(contact!.deserialize(buildFormConfig())).to.deep.equal({ name: 'The Contact' });
      });

      it('returns null when the sibling group is not present', () => {
        const doc = parseXml('<data><clinic><name>A Clinic</name></clinic></data>');
        const contactData = new EnektoContactFormData(doc, 'the-id', 'clinic');

        expect(contactData.getSiblingData('parent')).to.be.null;
      });
    });
  });

  describe('EnketoReportFormData', () => {
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
        expect(dbDoc1.deserialize(buildFormConfig())).to.deep.equal({ _id: 'doc-1', type: 'data_record' });
        expect(dbDoc2.id).to.match(/^[0-9a-f-]{36}$/);
        expect(dbDoc2.deserialize(buildFormConfig())).to.deep.equal({ name: 'Hello', type: 'data_record' });
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

        expect(additional).to.be.empty;
        expect(dbDoc1.id).to.equal('doc-1');
        expect(dbDoc1.deserialize(buildFormConfig())).to.deep.equal({ _id: 'doc-1', type: 'data_record' });
        expect(dbDoc2.id).to.equal('doc-2');
        expect(dbDoc2.deserialize(buildFormConfig())).to.deep.equal({ _id: 'doc-2', type: 'data_record' });
        expect(dbDoc3.id).to.equal('doc-3');
        expect(dbDoc3.deserialize(buildFormConfig())).to.deep.equal({
          _id: 'doc-3',
          type: 'data_record',
          my_doc: { _id: 'doc-4', type: 'data_record' }
        });
        expect(dbDoc4.id).to.equal('doc-4');
        expect(dbDoc4.deserialize(buildFormConfig())).to.deep.equal({ _id: 'doc-4', type: 'data_record' });
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

    describe('getNodeByXpath', () => {
      it('resolves an absolute xpath', () => {
        const doc = parseXml('<data><report><name>The Report</name></report></data>');
        const reportData = new EnketoReportFormData(doc, 'the-id');

        const node = reportData.getNodeByXpath(doc.documentElement, '/data/report/name');

        expect(node!.textContent).to.equal('The Report');
      });

      it('resolves a relative xpath against the context node', () => {
        const doc = parseXml('<data><report><name>The Report</name></report></data>');
        const reportData = new EnketoReportFormData(doc, 'the-id');
        const reportNode = doc.getElementsByTagName('report')[0];

        expect(reportData.getNodeByXpath(reportNode, 'name')!.textContent).to.equal('The Report');
        expect(reportData.getNodeByXpath(reportNode, './name')!.textContent).to.equal('The Report');
      });

      it('returns null for an empty or missing xpath', () => {
        const doc = parseXml('<data><report><name>The Report</name></report></data>');
        const reportData = new EnketoReportFormData(doc, 'the-id');

        expect(reportData.getNodeByXpath(doc.documentElement, null)).to.be.null;
        expect(reportData.getNodeByXpath(doc.documentElement, '   ')).to.be.null;
      });

      it('resolves an absolute xpath to a node in the same repeat entry as the context node', () => {
        const repeatXml = `
        <data>
          <repeat_section><name>first</name><value>first-value</value></repeat_section>
          <repeat_section><name>second</name><value>second-value</value></repeat_section>
          <repeat_section><name>third</name><value>third-value</value></repeat_section>
        </data>`;
        const doc = parseXml(repeatXml);
        const reportData = new EnketoReportFormData(doc, 'the-id');
        // Context node is the <name> nested inside the SECOND repeat entry.
        const contextNode = doc.getElementsByTagName('repeat_section')[1].getElementsByTagName('name')[0];

        const node = reportData.getNodeByXpath(contextNode, '/data/repeat_section/value');
        expect(node!.textContent).to.equal('second-value');

        const relativeNode = reportData.getNodeByXpath(contextNode, '../value');
        expect(relativeNode!.textContent).to.equal('second-value');
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
        const reportData = new EnketoReportFormData(doc, 'the-id');

        const node = reportData.findNodeWithTextContent('hunter2');

        expect(node!.nodeName).to.equal('secret');
      });

      it('returns null when no node has the given text content', () => {
        const doc = parseXml('<data><name>Sally</name></data>');
        const reportData = new EnketoReportFormData(doc, 'the-id');

        expect(reportData.findNodeWithTextContent('nope')).to.be.null;
      });
    });
  });
});
