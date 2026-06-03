import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AppFormsService } from '@admin-tool-services/app-forms.service';
import { DbService } from '@admin-tool-services/db.service';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

describe('AppFormsService', () => {
  let service: AppFormsService;
  let dbService;
  let http;

  const validXml = `<?xml version="1.0" encoding="UTF-8"?>
    <h:html xmlns="http://www.w3.org/2002/xforms"
            xmlns:h="http://www.w3.org/1999/xhtml">
      <h:head>
        <h:title>Test Form</h:title>
        <model>
          <instance>
            <data id="test_form">
              <field_one/>
              <meta>
                <instanceID/>
              </meta>
            </data>
          </instance>
        </model>
      </h:head>
    </h:html>`;

  beforeEach(() => {
    http = {
      post: sinon.stub(),
    };
    dbService = {
      get: sinon.stub().returns({
        query: sinon.stub().resolves({
          rows: [
            { 
              doc: { 
                _id: 'form:death_report', 
                type: 'form', 
                internalId: 'death_report', 
                title: 'Death report', 
                icon: 'icon-death-general' 
              } 
            },
            { 
              doc: { 
                _id: 'form:pregnancy', 
                type: 'form', 
                internalId: 'pregnancy', 
                title: 'Pregnancy registration', 
                icon: 'icon-pregnancy' 
              } 
            },
          ]
        }),
        get: sinon.stub().resolves({
          _id: 'form:test_form', 
          _rev: '1-abc', 
          type: 'form', 
          internalId: 'test_form', 
          _attachments: {} 
        }),
        put: sinon.stub().resolves(),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: HttpClient, useValue: http },
      ],
    });

    service = TestBed.inject(AppFormsService);
  });

  afterEach(() => sinon.restore());

  describe('getForms', () => {
    it('should call query with correct parameters', async () => {
      await service.getForms();
      expect(dbService.get().query.calledWith('medic-client/doc_by_type', {
        include_docs: true,
        key: ['form']
      })).to.be.true;
    });

    it('should return mapped form docs', async () => {
      const result = await service.getForms();
      expect(result).to.have.length(2);
    });

    it('should map rows to docs correctly', async () => {
      const result = await service.getForms();
      expect(result[0]._id).to.equal('form:death_report');
      expect(result[1]._id).to.equal('form:pregnancy');
    });

    it('should handle error if query fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      dbService.get().query.rejects(new Error('error'));
      try {
        await service.getForms();
      } catch {
        expect(consoleStub.called).to.be.false;
      }
    });
  });
  describe('getXmlTitle', () => {
    const xmlWithTitle = `<?xml version="1.0" encoding="UTF-8"?>
      <h:html xmlns="http://www.w3.org/2002/xforms"
              xmlns:h="http://www.w3.org/1999/xhtml">
        <h:head>
          <h:title>Test Form</h:title>
        </h:head>
      </h:html>`;

    const xmlWithoutTitle = `<?xml version="1.0" encoding="UTF-8"?>
      <h:html xmlns="http://www.w3.org/2002/xforms"
              xmlns:h="http://www.w3.org/1999/xhtml">
        <h:head>
        </h:head>
      </h:html>`;

    it('should return title from h:title node', () => {
      const result = service.getXmlTitle(xmlWithTitle);
      expect(result).to.equal('Test Form');
    });

    it('should return title via regex when querySelector does not find it', () => {
      const result = service.getXmlTitle('<h:title>Regex Form</h:title>');
      expect(result).to.equal('Regex Form');
    });

    it('should return empty string if no title found', () => {
      const result = service.getXmlTitle(xmlWithoutTitle);
      expect(result).to.equal('');
    });
  });

  describe('getXmlFormId', () => {
    const xmlWithoutInstanceId = `<?xml version="1.0" encoding="UTF-8"?>
      <h:html xmlns="http://www.w3.org/2002/xforms"
              xmlns:h="http://www.w3.org/1999/xhtml">
        <h:head>
          <model>
            <instance>
              <data id="test_form">
                <field_one/>
              </data>
            </instance>
          </model>
        </h:head>
      </h:html>`;

    const xmlWithoutId = `<?xml version="1.0" encoding="UTF-8"?>
      <h:html xmlns="http://www.w3.org/2002/xforms"
              xmlns:h="http://www.w3.org/1999/xhtml">
        <h:head>
          <model>
            <instance>
              <data>
                <field_one/>
                <meta>
                  <instanceID/>
                </meta>
              </data>
            </instance>
          </model>
        </h:head>
      </h:html>`;

    it('should return the form id from the data node', () => {
      const result = service.getXmlFormId(validXml, {});
      expect(result).to.equal('test_form');
    });

    it('should throw error if no instanceID node found', () => {
      expect(() => service.getXmlFormId(xmlWithoutInstanceId, {}))
        .to.throw('No <meta><instanceID/></meta> node found for first child of <instance> element.');
    });

    it('should throw error if no id attribute found', () => {
      expect(() => service.getXmlFormId(xmlWithoutId, {}))
        .to.throw('No ID attribute found for first child of <instance> element.');
    });

    it('should throw error if meta.internalId does not match xml id', () => {
      expect(() => service.getXmlFormId(validXml, { internalId: 'different_id' }))
        .to.throw('The internalId property in the meta file will be overwritten');
    });

    it('should not throw if meta.internalId matches xml id', () => {
      expect(() => service.getXmlFormId(validXml, { internalId: 'test_form' }))
        .to.not.throw();
    });

    it('should not throw if meta.internalId is not defined', () => {
      expect(() => service.getXmlFormId(validXml, {}))
        .to.not.throw();
    });
  });
  describe('getXmlHash', () => {
    it('should return a hexadecimal string', async () => {
      const result = await service.getXmlHash(validXml);
      expect(result).to.match(/^[0-9a-f]+$/);
    });

    it('should return the same hash for the same input', async () => {
      const result1 = await service.getXmlHash(validXml);
      const result2 = await service.getXmlHash(validXml);
      expect(result1).to.equal(result2);
    });

    it('should return different hashes for different inputs', async () => {
      const result1 = await service.getXmlHash(validXml);
      const result2 = await service.getXmlHash('<different>xml</different>');
      expect(result1).to.not.equal(result2);
    });
  });
  describe('validateXml', () => {
    it('should call POST /api/v1/forms/validate with the xml', async () => {
      http.post.returns(of(void 0));
      await service.validateXml(validXml);
      expect(http.post.calledWith('/api/v1/forms/validate', validXml)).to.be.true;
    });

    it('should send Content-Type application/xml header', async () => {
      http.post.returns(of(void 0));
      await service.validateXml(validXml);
      expect(http.post.args[0][2].headers).to.deep.include({ 'Content-Type': 'application/xml' });
    });

    it('should not throw if api returns success', async () => {
      http.post.returns(of(void 0));
      await expect(service.validateXml(validXml)).to.not.be.rejected;
    });

    it('should throw error with server message if api returns error', async () => {
      http.post.returns(throwError(() => ({ error: { error: 'Invalid XML' } })));
      await expect(service.validateXml(validXml)).to.be.rejectedWith('Error validating form - Invalid XML');
    });

    it('should throw error with fallback if api error has no error property', async () => {
      http.post.returns(throwError(() => ({ error: null })));
      await expect(service.validateXml(validXml)).to.be.rejectedWith('Error validating form - ');
    });
  });
  describe('createDoc', () => {
    const meta = { icon: 'icon-test' };

    it('should call db.get with attachments true', async () => {
      await service.createDoc(validXml, meta);
      expect(dbService.get().get.calledWith('form:test_form', { attachments: true })).to.be.true;
    });

    it('should create new doc if CouchDB returns 404', async () => {
      dbService.get().get.rejects({ status: 404 });
      const result = await service.createDoc(validXml, meta);
      expect(result._id).to.equal('form:test_form');
      expect(result._rev).to.be.undefined;
    });

    it('should preserve existing doc if already exists', async () => {
      const result = await service.createDoc(validXml, meta);
      expect(result._rev).to.equal('1-abc');
    });

    it('should rethrow error if db.get fails with non-404', async () => {
      dbService.get().get.rejects({ status: 500 });
      await expect(service.createDoc(validXml, meta)).to.be.rejected;
    });

    it('should assign title from xml', async () => {
      const result = await service.createDoc(validXml, meta);
      expect(result.title).to.equal('Test Form');
    });

    it('should apply meta with Object.assign', async () => {
      const result = await service.createDoc(validXml, meta);
      expect(result.icon).to.equal('icon-test');
    });

    it('should force type to form after meta merge', async () => {
      const result = await service.createDoc(validXml, { type: 'other' });
      expect(result.type).to.equal('form');
    });

    it('should force internalId after meta merge', async () => {
      const result = await service.createDoc(validXml, {});
      expect(result.internalId).to.equal('test_form');
    });

    it('should add xml attachment with correct content_type', async () => {
      const result = await service.createDoc(validXml, meta);
      expect(result._attachments!['xml'].content_type).to.equal('application/xml');
    });

    it('should add xmlVersion with time and sha256', async () => {
      const result = await service.createDoc(validXml, meta);
      expect(result.xmlVersion!.time).to.be.a('number');
      expect(result.xmlVersion!.sha256).to.match(/^[0-9a-f]+$/);
    });
  });
  describe('uploadForm', () => {
    let xmlFile: File;
    let metaFile: File;
    let fileReaderStub;
    let metaContent: string;

    beforeEach(() => {
      let readCount = 0;
      metaContent = '{"icon":"icon-test"}';

      fileReaderStub = {
        addEventListener: sinon.stub().callsFake((event, cb) => {
          if (event === 'loadend') {
            fileReaderStub._loadendCb = cb;
          }
          if (event === 'error') {
            fileReaderStub._errorCb = cb;
          }
          if (event === 'abort') {
            fileReaderStub._abortCb = cb;
          }
        }),
        readAsText: sinon.stub().callsFake(() => {
          readCount++;
          fileReaderStub.result = readCount === 1 ? validXml : metaContent;
          fileReaderStub._loadendCb();
        }),
        result: '',
      };
      sinon.stub(window, 'FileReader').returns(fileReaderStub);

      xmlFile = new File([validXml], 'test.xml', { type: 'application/xml' });
      metaFile = new File(['{"icon":"icon-test"}'], 'test.json', { type: 'application/json' });

      http.post.returns(of(void 0));
    });
    it('should read both files', async () => {
      fileReaderStub._result = validXml;
      await service.uploadForm(xmlFile, metaFile);
      expect(fileReaderStub.readAsText.callCount).to.equal(2);
    });

    it('should call validateXml with the xml content', async () => {
      fileReaderStub._result = validXml;
      await service.uploadForm(xmlFile, metaFile);
      expect(http.post.calledWith('/api/v1/forms/validate', validXml)).to.be.true;
    });

    it('should call db.put with the doc', async () => {
      fileReaderStub._result = validXml;
      await service.uploadForm(xmlFile, metaFile);
      expect(dbService.get().put.calledOnce).to.be.true;
    });

    it('should throw if validateXml fails', async () => {
      fileReaderStub._result = validXml;
      http.post.returns(throwError(() => ({ error: { error: 'Invalid XML' } })));
      await expect(service.uploadForm(xmlFile, metaFile)).to.be.rejectedWith('Error validating form - Invalid XML');
    });

    it('should throw if meta is not valid JSON', async () => {
      metaContent = 'not valid json';
      await expect(service.uploadForm(xmlFile, metaFile)).to.be.rejected;
    });
    
    it('should throw if db.put fails', async () => {
      dbService.get().put.rejects(new Error('put error'));
      await expect(service.uploadForm(xmlFile, metaFile)).to.be.rejectedWith('put error');
    });
  });
});
