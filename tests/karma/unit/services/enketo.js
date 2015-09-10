describe('Enketo service', function() {
  'use strict';

  /** @return a mock form ready for putting in #dbContent */
  var mockEnketoForm = function(formInternalId, docId) {
    return {
      id: docId || 'form-0',
      doc: {
        internalId: formInternalId,
        _attachments: { xml: { something: true } },
      },
    };
  };

  /** @return a mock form ready for putting in #dbContent */
  var mockJsonForm = function() {
    return { doc: { _attachments: {} } };
  };

  var service,
      enketoInit,
      transform,
      dbGetAttachment,
      dbGet,
      dbQuery,
      createObjectURL,
      FileReader;

  beforeEach(function() {
    module('inboxApp');

    enketoInit = sinon.stub();
    dbGetAttachment = sinon.stub();
    dbGet = sinon.stub();
    dbQuery = sinon.stub();
    transform = sinon.stub();
    createObjectURL = sinon.stub();
    FileReader = sinon.stub();

    window.EnketoForm = function() {
      return {
        init: enketoInit
      };
    };

    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        getAttachment: dbGetAttachment,
        get: dbGet,
        query: dbQuery
      }));
      $provide.value('XSLT', { transform: transform });
      $provide.value('$window', { URL: { createObjectURL: createObjectURL } });
      $provide.value('FileReader', FileReader);
    });
    inject(function(Enketo) {
      service = Enketo;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(dbGetAttachment, dbGet, dbQuery, transform, createObjectURL, FileReader);
  });

  describe('render', function() {

    it('return error when form not found', function(done) {
      // given only irrelevant forms are available
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        mockJsonForm('not-defined'), mockEnketoForm('irrelevant')
      ] }));
      service
        .render(null, 'not-defined')
        .then(function() {
          done('Should not call callback');
        })
        .catch(function(actual) {
          chai.expect(actual.message).to.equal('Requested form not found');
          done();
        });
    });

    it('return error when form initialisation fails', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        mockEnketoForm('bad'),
        mockJsonForm('ok'),
        mockEnketoForm('ok', 'form-9'),
        mockJsonForm('bad')
      ] }));
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
    });

    it('return form when everything works', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        mockEnketoForm('ok', 'form-9')
      ] }));
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
    });

    it('replaces img src with obj urls', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        mockEnketoForm('ok', 'form-9')
      ] }));
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
    });

    it('leaves img wrapped if failed to load', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        mockEnketoForm('ok', 'form-9')
      ] }));
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
    });

  });

  describe('withAllForms', function() {
    it('should get all forms from DB, but only pass on ones with XML attachment', function(done) {
      // given
      var expected = [
        mockEnketoForm(),
        mockJsonForm(),
        mockJsonForm(),
        mockEnketoForm(),
        mockEnketoForm(),
      ];
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: expected }));
      service.withAllForms(function(actual) {
        chai.expect(actual.length).to.equal(3);
        chai.expect(actual[0]).to.deep.equal(expected[0].doc);
        chai.expect(actual[1]).to.deep.equal(expected[3].doc);
        chai.expect(actual[2]).to.deep.equal(expected[4].doc);
        done();
      });
    });
  });

});
