describe('Enketo service', function() {
  'use strict';

  /** @return a mock form ready for putting in #dbContent */
  var mockEnketoDoc = function(formInternalId, docId) {
    return {
      id: docId || 'form-0',
      doc: {
        internalId: formInternalId,
        _attachments: { xml: { something: true } },
      },
    };
  };

  /** @return a mock form ready for putting in #dbContent */
  var mockJsonDoc = function() {
    return { doc: { _attachments: {} } };
  };

  var digest = function(times) {
    setTimeout(function() {
      $rootScope.$digest();
      if (times > 1) {
        digest(times - 1);
      }
    });
  };

  var service,
      enketoInit = sinon.stub(),
      transform = sinon.stub(),
      dbGetAttachment = sinon.stub(),
      dbGet = sinon.stub(),
      dbQuery = sinon.stub(),
      dbPost = sinon.stub(),
      dbPut = sinon.stub(),
      UserSettings = sinon.stub(),
      createObjectURL = sinon.stub(),
      FileReader = sinon.stub(),
      form = {
        validate: sinon.stub(),
        isValid: sinon.stub(),
        getDataStr: sinon.stub(),
        resetView: sinon.stub()
      },
      $rootScope;

  beforeEach(function() {
    module('inboxApp');

    window.EnketoForm = function() {
      return {
        init: enketoInit
      };
    };

    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        getAttachment: dbGetAttachment,
        get: dbGet,
        query: dbQuery,
        post: dbPost,
        put: dbPut
      }));
      $provide.value('XSLT', { transform: transform });
      $provide.value('$window', { URL: { createObjectURL: createObjectURL } });
      $provide.value('FileReader', FileReader);
      $provide.value('UserSettings', UserSettings);
    });
    inject(function(_$rootScope_, _Enketo_) {
      service = _Enketo_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(enketoInit, dbGetAttachment, dbGet, dbQuery, dbPost, dbPut, transform, createObjectURL, FileReader, UserSettings, form.validate, form.isValid, form.getDataStr, form.resetView);
  });

  describe('render', function() {

    it('return error when form not found', function(done) {
      // given only irrelevant forms are available
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      service
        .render(null, 'not-defined')
        .then(function() {
          done('Should not call callback');
        })
        .catch(function(actual) {
          chai.expect(actual.message).to.equal('Requested form not found');
          done();
        });
      digest(1);
    });

    it('return error when form initialisation fails', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ mockEnketoDoc('ok', 'form-9') ] }));
      dbGetAttachment.returns(KarmaUtils.mockPromise(null, 'xml'));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, $('<div>my form</div>')))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, 'my model'));
      var expected = [ 'nope', 'still nope' ];
      enketoInit.returns(expected);
      service
        .render($('<div></div>'), 'ok')
        .then(function() {
          done('Should not call callback');
        })
        .catch(function(actual) {
          chai.expect(enketoInit.callCount).to.equal(1);
          chai.expect(actual).to.deep.equal(expected);
          done();
        });
      digest(2);
    });

    it('return form when everything works', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ mockEnketoDoc('ok', 'form-9') ] }));
      dbGetAttachment.returns(KarmaUtils.mockPromise(null, 'xmlblob'));
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, $('<div>my form</div>')))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, 'my model'));
      service
        .render($('<div></div>'), 'ok')
        .then(function() {
          chai.expect(transform.callCount).to.equal(2);
          chai.expect(transform.args[0][0]).to.equal('openrosa2html5form.xsl');
          chai.expect(transform.args[1][0]).to.equal('openrosa2xmlmodel.xsl');
          chai.expect(FileReader.callCount).to.equal(1);
          chai.expect(FileReader.args[0][0]).to.equal('xmlblob');
          chai.expect(enketoInit.callCount).to.equal(1);
          done();
        })
        .catch(done);
      digest(2);
    });

    it('replaces img src with obj urls', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ mockEnketoDoc('ok', 'form-9') ] }));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, '<div><img src="jr://myimg"></div>'))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, 'my model'));
      dbGetAttachment
        .onFirstCall().returns(KarmaUtils.mockPromise(null, 'xmlblob'))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, 'myobjblob'));
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      var wrapper = $('<div><div class="container"></div><form></form></div>');
      service
        .render(wrapper, 'ok')
        .then(function() {
          var img = wrapper.find('img').first();
          chai.expect(img.attr('src')).to.equal('myobjurl');
          chai.expect(img.css('visibility')).to.satisfy(function(val) {
            // different browsers return different values but both are equivalent
            return val === '' || val === 'visible';
          });
          chai.expect(transform.callCount).to.equal(2);
          chai.expect(enketoInit.callCount).to.equal(1);
          chai.expect(createObjectURL.callCount).to.equal(1);
          chai.expect(createObjectURL.args[0][0]).to.equal('myobjblob');
          done();
        })
        .catch(done);
      digest(2);
    });

    it('leaves img wrapped if failed to load', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ mockEnketoDoc('ok', 'form-9') ] }));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, '<div><img src="jr://myimg"></div>'))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, 'my model'));
      dbGetAttachment
        .onFirstCall().returns(KarmaUtils.mockPromise(null, 'xmlblob'))
        .onSecondCall().returns(KarmaUtils.mockPromise('not found'));
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      var wrapper = $('<div><div class="container"></div><form></form></div>');
      service
        .render(wrapper, 'ok')
        .then(function() {
          var img = wrapper.find('img').first();
          chai.expect(img.attr('src')).to.equal('#jr://myimg');
          chai.expect(img.css('visibility')).to.equal('hidden');
          chai.expect(img.closest('div').hasClass('loader')).to.equal(true);
          chai.expect(transform.callCount).to.equal(2);
          chai.expect(enketoInit.callCount).to.equal(1);
          chai.expect(createObjectURL.callCount).to.equal(0);
          done();
        })
        .catch(done);
      digest(2);
    });

  });

  describe('withAllForms', function() {
    it('should get all forms from DB, but only pass on ones with XML attachment', function(done) {
      // given
      var expected = [
        mockEnketoDoc(),
        mockJsonDoc(),
        mockJsonDoc(),
        mockEnketoDoc(),
        mockEnketoDoc(),
      ];
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: expected }));
      service.withAllForms()
        .then(function(actual) {
          chai.expect(actual.length).to.equal(3);
          chai.expect(actual[0]).to.deep.equal(expected[0].doc);
          chai.expect(actual[1]).to.deep.equal(expected[3].doc);
          chai.expect(actual[2]).to.deep.equal(expected[4].doc);
          done();
        })
        .catch(done);
      digest(1);
    });
  });

  describe('save', function() {

    it('rejects on invalid form', function(done) {
      form.isValid.returns(false);
      service.save('V', form)
        .catch(function(actual) {
          chai.expect(actual.message).to.equal('Form is invalid');
          chai.expect(form.validate.callCount).to.equal(1);
          chai.expect(form.isValid.callCount).to.equal(1);
          done();
        });
      digest(1);
    });

    it('creates report', function(done) {
      form.isValid.returns(true);
      var content = '<doc><name>Sally</name><lmp>10</lmp></doc>';
      form.getDataStr.returns(content);
      dbPost.returns(KarmaUtils.mockPromise(null, { id: '5', rev: '1-abc' }));
      UserSettings.callsArgWith(0, null, { contact_id: '123' });
      dbGet.returns(KarmaUtils.mockPromise(null, { _id: '123', phone: '555' } ));
      service.save('V', form)
        .then(function(actual) {
          chai.expect(form.validate.callCount).to.equal(1);
          chai.expect(form.isValid.callCount).to.equal(1);
          chai.expect(form.getDataStr.callCount).to.equal(1);
          chai.expect(form.resetView.callCount).to.equal(1);
          chai.expect(dbPost.callCount).to.equal(1);
          chai.expect(UserSettings.callCount).to.equal(1);
          chai.expect(dbGet.callCount).to.equal(1);
          chai.expect(dbGet.args[0][0]).to.equal('123');
          chai.expect(actual._id).to.equal('5');
          chai.expect(actual._rev).to.equal('1-abc');
          chai.expect(actual.content).to.equal(content);
          chai.expect(actual.fields.name).to.equal('Sally');
          chai.expect(actual.fields.lmp).to.equal('10');
          chai.expect(actual.form).to.equal('V');
          chai.expect(actual.type).to.equal('data_record');
          chai.expect(actual.content_type).to.equal('xml');
          chai.expect(actual.contact._id).to.equal('123');
          chai.expect(actual.from).to.equal('555');
          done();
        })
        .catch(done);
      digest(4);
    });

    it('updates report', function(done) {
      form.isValid.returns(true);
      var content = '<doc><name>Sally</name><lmp>10</lmp></doc>';
      form.getDataStr.returns(content);
      dbGet.returns(KarmaUtils.mockPromise(null, {
        _id: '6',
        _rev: '1-abc',
        form: 'V',
        fields: { name: 'Silly' },
        content: '<doc><name>Silly</name></doc>',
        content_type: 'xml',
        type: 'data_record',
        reported_date: 500,
      }));
      dbPut.returns(KarmaUtils.mockPromise(null, { id: '6', rev: '2-abc' }));
      service.save('V', form, '6')
        .then(function(actual) {
          chai.expect(form.validate.callCount).to.equal(1);
          chai.expect(form.isValid.callCount).to.equal(1);
          chai.expect(form.getDataStr.callCount).to.equal(1);
          chai.expect(form.resetView.callCount).to.equal(1);
          chai.expect(dbGet.callCount).to.equal(1);
          chai.expect(dbGet.args[0][0]).to.equal('6');
          chai.expect(dbPut.callCount).to.equal(1);
          chai.expect(actual._id).to.equal('6');
          chai.expect(actual._rev).to.equal('2-abc');
          chai.expect(actual.content).to.equal(content);
          chai.expect(actual.fields.name).to.equal('Sally');
          chai.expect(actual.fields.lmp).to.equal('10');
          chai.expect(actual.form).to.equal('V');
          chai.expect(actual.type).to.equal('data_record');
          chai.expect(actual.reported_date).to.equal(500);
          chai.expect(actual.content_type).to.equal('xml');
          done();
        })
        .catch(done);
      digest(3);
    });

  });

});
