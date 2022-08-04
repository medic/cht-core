describe('FormsXmlCtrl controller', () => {
  'use strict';

  let jQuery;
  let createController;
  let scope;
  let rootScope;
  let db;
  let utf8Stub;
  let AddAttachment;

  const nextTick = () => new Promise(r => setTimeout(r));
  const digest = () => {
    return nextTick()
      .then(() => rootScope.$digest())
      .then(() => nextTick());
  };

  afterEach(() => {
    KarmaUtils.restore(
      jQuery
    );
    sinon.restore();
  });

  beforeEach(() => {
    module('adminApp');
    jQuery = sinon.stub(window, '$');
    window.$.callThrough();
    window.$.withArgs('#forms-upload-xform').returns({
      get: () => ({
        reset: sinon.stub()
      })
    });

    inject(($rootScope, $controller) => {
      scope = $rootScope.$new();
      rootScope = $rootScope;
      db = {
        query: sinon.stub().resolves({}),
        get: sinon.stub().resolves({}),
        put: sinon.stub().resolves()
      };
      AddAttachment = sinon.stub().resolves();
      createController = (xmlContent, metaContent, validateFormStub) => {
        utf8Stub = sinon.stub().resolves();
        utf8Stub.withArgs('file.xml').resolves(xmlContent || '');
        utf8Stub.withArgs('file.json').resolves(metaContent || '{}');
        return $controller('FormsXmlCtrl', {
          $log: { error: sinon.stub() },
          $q: Q,
          $scope: scope,
          $rootScope: $rootScope,
          DB: () => db,
          AddAttachment,
          FileReader: { utf8: utf8Stub },
          JsonParse: JSON.parse,
          ValidateForm: validateFormStub || sinon.stub().resolves({ok:true})
        });
      };
    });
  });

  const mockFormUploader = files => {
    window.$.withArgs('#forms-upload-xform .form.uploader').returns([
      { files }
    ]);
  };

  const mockMetaUploader = files => {
    window.$.withArgs('#forms-upload-xform .meta.uploader').returns([
      { files }
    ]);
  };

  describe('validations', () => {

    const expectStatusError = errorMessage => {
      chai.expect(scope.status).to.deep.equal({
        uploading: false,
        error: true,
        success: false,
        errorMessage: errorMessage
      });
    };

    it('should fail if no XML and meta files are provided', () => {
      mockFormUploader();
      mockMetaUploader();
      createController();
      scope.upload();
      expectStatusError('Upload failed: XML and JSON meta files not found');
    });

    it('should fail if no XML file is provided', () => {
      mockFormUploader();
      mockMetaUploader(['file.json']);
      createController();
      scope.upload();
      expectStatusError('Upload failed: XML file not found');
    });

    it('should fail if no Meta file is provided', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader();
      createController();
      scope.upload();
      expectStatusError('Upload failed: JSON meta file not found');
    });

    it('should fail if no <meta><instanceID/></meta> node found', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController();
      return scope
        .upload()
        .then(() => digest())
        .then(() => {
          expectStatusError(
            'Upload failed: No &lt;meta&gt;&lt;instanceID/&gt;&lt;/meta&gt; ' +
            'node found for first child of &lt;instance&gt; element.');
        });
    });

    it('should fail if No ID attribute found', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController('<instance><data><meta><instanceID/></meta></data></instance>');
      return scope
        .upload()
        .then(() => digest())
        .then(() => {
          expectStatusError(
            'Upload failed: No ID attribute found for first child of &lt;instance&gt; element.');
        });
    });

    it('should fail if internalId property in the Meta file does not match formId', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta><instanceID/></meta></data></instance>',
        '{"internalId":"another:id"}');
      return scope
        .upload()
        .then(() => digest())
        .then(() => {
          expectStatusError(
            'Upload failed: The internalId property in the meta file will be overwritten ' +
            'by the ID attribute on the first child of &lt;instance&gt; element in the XML. ' +
            'Remove this property from the meta file and try again.'
          );
        });
    });

    it('should fail if invalid XML', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta////><instanceID/></meta></data></instance>',
        '{"internalId":"contact:clinic:edit"}');
      return scope
        .upload()
        .then(() => digest())
        .then(() => {
          expectStatusError('Upload failed: Invalid XML');
        });
    });

    it('should fail if invalid Meta', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta/><instanceID/></meta></data></instance>',
        'not a valid JSON file');
      return scope
        .upload()
        .then(() => digest())
        .then(() => {
          expectStatusError('Upload failed: Unexpected token o in JSON at position 1');
        });
    });

    it('should fail if ValidateForm fails', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta><instanceID/></meta></data></instance>',
        '{"internalId":"contact:clinic:edit"}',
        sinon.stub().rejects(new Error('Error validating form - wrong content'))
      );
      return scope
        .upload()
        .then(() => digest())
        .then(() => {
          expectStatusError('Upload failed: Error validating form - wrong content');
        });
    });

    it('should succeed if XML and Meta files are right', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta><instanceID/></meta></data></instance>');
      return scope
        .upload()
        .then(() => digest())
        .then(() => {
          chai.expect(scope.status).to.deep.equal({
            uploading: false,
            error: false,
            success: true,
            errorMessage: null
          });
        });
    });
  });

  describe('saves the doc', () => {

    const NOW = moment('2000-01-15').valueOf();
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
      clock.restore();
    });

    it('creates the doc', () => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);

      const xml = `
      <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
        <instance>
          <data id="editcontact">
            <meta><instanceID/></meta>
            <h:title>my form title</h:title>
          </data>
        </instance>
      </h:html>
      `;

      const meta = JSON.stringify({ icon: 'pic' });

      createController(xml, meta);
      db.get.rejects({ status: 404 });
      return scope
        .upload()
        .then(() => clock.runAll())
        .then(() => {
          clock.runAll();
          chai.expect(scope.status).to.deep.equal({
            uploading: false,
            error: false,
            success: true,
            errorMessage: null
          });
          chai.expect(db.put.callCount).to.equal(1);
          const doc = db.put.args[0][0];
          chai.expect(doc._id).to.equal('form:editcontact');
          chai.expect(doc.type).to.equal('form');
          chai.expect(doc.title).to.equal('my form title');
          chai.expect(doc.internalId).to.equal('editcontact');
          chai.expect(doc.icon).to.equal('pic');
          chai.expect(doc.xmlVersion.sha256)
            .to.equal('20a6dcd658bf49b6b03dc5c1d76055c3a0f28ffc60376beea3c628f5b4f0173f');
          chai.expect(doc.xmlVersion.time).to.equal(NOW.valueOf());
          chai.expect(AddAttachment.callCount).to.equal(1);
          chai.expect(AddAttachment.args[0][0]).to.deep.equal(doc);
          chai.expect(AddAttachment.args[0][1]).to.deep.equal('xml');
          chai.expect(AddAttachment.args[0][2]).to.deep.equal(xml);
          chai.expect(AddAttachment.args[0][3]).to.deep.equal('application/xml');
        });
    });
  });

});
