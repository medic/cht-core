describe('FormsXmlCtrl controller', () => {
  'use strict';

  let jQuery;
  let createController;
  let scope;
  let rootScope;
  let db;

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
      createController = (xmlContent, metaContent, validateFormStub) => {
        const utf8Stub = sinon.stub();
        utf8Stub.withArgs('file.xml').resolves(xmlContent || '');
        utf8Stub.withArgs('file.json').resolves(metaContent || '{}');
        return $controller('FormsXmlCtrl', {
          $log: { error: sinon.stub() },
          $q: Q,
          $scope: scope,
          $rootScope: $rootScope,
          DB: () => db,
          AddAttachment: sinon.stub().resolves(),
          FileReader: { utf8: utf8Stub },
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

    it('should fail if no <meta><instanceID/></meta> node found', (done) => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController();
      scope.upload();
      setTimeout(() => {
        rootScope.$digest();
        setTimeout(() => {
          expectStatusError(
            'Upload failed: No &lt;meta&gt;&lt;instanceID/&gt;&lt;/meta&gt; ' +
            'node found for first child of &lt;instance&gt; element.');
          done();
        });
      });
    });

    it('should fail if No ID attribute found', (done) => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController('<instance><data><meta><instanceID/></meta></data></instance>');
      scope.upload();
      setTimeout(() => {
        rootScope.$digest();
        setTimeout(() => {
          expectStatusError(
            'Upload failed: No ID attribute found for first child of &lt;instance&gt; element.');
          done();
        });
      });
    });

    it('should fail if internalId property in the Meta file does not match formId', (done) => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta><instanceID/></meta></data></instance>',
        '{"internalId":"another:id"}');
      scope.upload();
      setTimeout(() => {
        rootScope.$digest();
        setTimeout(() => {
          expectStatusError(
            'Upload failed: The internalId property in the meta file will be overwritten ' +
            'by the ID attribute on the first child of &lt;instance&gt; element in the XML. ' +
            'Remove this property from the meta file and try again.'
          );
          done();
        });
      });
    });

    it('should fail if invalid XML', (done) => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta////><instanceID/></meta></data></instance>',
        '{"internalId":"contact:clinic:edit"}');
      scope.upload();
      setTimeout(() => {
        rootScope.$digest();
        setTimeout(() => {
          expectStatusError('Upload failed: Invalid XML');
          done();
        });
      });
    });

    it('should fail if invalid Meta', (done) => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta/><instanceID/></meta></data></instance>',
        'not a valid JSON file');
      scope.upload();
      setTimeout(() => {
        rootScope.$digest();
        setTimeout(() => {
          chai.expect(scope.status.uploading).to.equal(false);
          chai.expect(scope.status.error).to.equal(true);
          chai.expect(scope.status.success).to.equal(false);
          done();
        });
      });
    });

    it('should fail if ValidateForm fails', (done) => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta><instanceID/></meta></data></instance>',
        '{"internalId":"contact:clinic:edit"}',
        sinon.stub().rejects(new Error('Error validating form - wrong content'))
      );
      scope.upload();
      setTimeout(() => {
        rootScope.$digest();
        setTimeout(() => {
          expectStatusError('Upload failed: Error validating form - wrong content');
          done();
        });
      });
    });

    it('should succeed if XML and Meta files are right', (done) => {
      mockFormUploader(['file.xml']);
      mockMetaUploader(['file.json']);
      createController(
        '<instance><data id="contact:clinic:edit"><meta><instanceID/></meta></data></instance>');
      scope.upload();
      setTimeout(() => {
        rootScope.$digest();
        setTimeout(() => {
          chai.expect(scope.status).to.deep.equal({
            uploading: false,
            error: false,
            success: true,
            errorMessage: null
          });
          done();
        });
      });
    });

  });
});
