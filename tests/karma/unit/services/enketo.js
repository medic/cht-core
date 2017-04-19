describe('Enketo service', function() {
  'use strict';

  /** @return a mock form ready for putting in #dbContent */
  var mockEnketoDoc = function(formInternalId) {
    return {
      internalId: formInternalId,
      _attachments: { xml: { something: true } },
    };
  };

  var VISIT_FORM = `
    <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
      <h:head>
        <h:title>Visit</h:title>
        <model>
          <instance>
            <data id="V" version="2015-06-05">
              <patient_id tag="id"/>
              <name tag="name"/>
              <inputs>
                <patient_id tag="n"/>
                <user>
                  <_id tag="ui"/>
                  <facility_id tag="ufi"/>
                </user>
              </inputs>
            </data>
          </instance>
          <itext>
            <translation lang="eng">
              <text id="patient_id:label">
                <value>Patient ID</value>
              </text>
            </translation>
          </itext>
          <bind nodeset="/data/patient_id" type="medicPatientSelect" required="true()" />
          <bind nodeset="/data/name" type="string" required="true()" />
        </model>
      </h:head>
    </h:html>`;

  var service,
      enketoInit = sinon.stub(),
      transform = sinon.stub(),
      dbGetAttachment = sinon.stub(),
      dbGet = sinon.stub(),
      dbPost = sinon.stub(),
      UserContact = sinon.stub(),
      UserSettings = sinon.stub(),
      createObjectURL = sinon.stub(),
      FileReader = sinon.stub(),
      Language = sinon.stub(),
      TranslateFrom = sinon.stub(),
      form = {
        validate: sinon.stub(),
        getDataStr: sinon.stub(),
      },
      AddAttachment = sinon.stub(),
      EnketoForm = sinon.stub(),
      EnketoPrepopulationData = sinon.stub();

  beforeEach(function() {
    module('inboxApp');

    window.EnketoForm = EnketoForm;
    EnketoForm.returns({
      init: enketoInit
    });

    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        getAttachment: dbGetAttachment,
        get: dbGet,
        post: dbPost
      }));
      $provide.value('XSLT', { transform: transform });
      $provide.value('$window', {
        angular: { callbacks: [] },
        URL: { createObjectURL: createObjectURL }
      });
      $provide.value('FileReader', FileReader);
      $provide.value('UserContact', UserContact);
      $provide.value('UserSettings', UserSettings);
      $provide.value('Language', Language);
      $provide.value('TranslateFrom', TranslateFrom);
      $provide.value('EnketoPrepopulationData', EnketoPrepopulationData);
      $provide.value('AddAttachment', AddAttachment);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_Enketo_) {
      service = _Enketo_;
    });
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    TranslateFrom.returns('translated');
  });

  afterEach(function() {
    KarmaUtils.restore(EnketoForm, enketoInit, dbGetAttachment, dbGet, dbPost, transform, createObjectURL, FileReader, UserContact, form.validate, form.getDataStr, Language, TranslateFrom, AddAttachment);
  });

  describe('render', function() {

    it('renders error when user does not have associated contact', function(done) {
      UserContact.returns(KarmaUtils.mockPromise());
      service
        .render(null, 'not-defined')
        .then(function() {
          done(new Error('Should throw error'));
        })
        .catch(function(actual) {
          chai.expect(actual.message).to.equal('Your user does not have an associated contact. Talk to your administrator to correct this.');
          done();
        });
    });

    it('return error when form initialisation fails', function(done) {
      UserContact.returns(KarmaUtils.mockPromise(null, { contact_id: '123' }));
      dbGet.returns(KarmaUtils.mockPromise(null, mockEnketoDoc('myform')));
      dbGetAttachment.returns(KarmaUtils.mockPromise(null, 'xml'));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, $('<div>my form</div>')))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, VISIT_FORM));
      EnketoPrepopulationData.returns(KarmaUtils.mockPromise(null, '<xml></xml>'));
      var expected = [ 'nope', 'still nope' ];
      enketoInit.returns(expected);
      service
        .render($('<div></div>'), 'ok')
        .then(function() {
          done(new Error('Should throw error'));
        })
        .catch(function(actual) {
          chai.expect(enketoInit.callCount).to.equal(1);
          chai.expect(actual.message).to.equal(JSON.stringify(expected));
          done();
        });
    });

    it('return form when everything works', function() {
      UserContact.returns(KarmaUtils.mockPromise(null, { contact_id: '123' }));
      dbGet.returns(KarmaUtils.mockPromise(null, mockEnketoDoc('myform')));
      dbGetAttachment.returns(KarmaUtils.mockPromise(null, 'xmlblob'));
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(KarmaUtils.mockPromise(null, '<xml></xml>'));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, $('<div>my form</div>')))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, VISIT_FORM));
      return service.render($('<div></div>'), 'ok').then(function() {
        chai.expect(UserContact.callCount).to.equal(1);
        chai.expect(EnketoPrepopulationData.callCount).to.equal(2);
        chai.expect(transform.callCount).to.equal(2);
        chai.expect(transform.args[0][0]).to.equal('openrosa2html5form.xsl');
        chai.expect(transform.args[1][0]).to.equal('openrosa2xmlmodel.xsl');
        chai.expect(FileReader.callCount).to.equal(1);
        chai.expect(FileReader.args[0][0]).to.equal('xmlblob');
        chai.expect(enketoInit.callCount).to.equal(1);
      });
    });

    it('replaces img src with obj urls', function() {
      UserContact.returns(KarmaUtils.mockPromise(null, { contact_id: '123' }));
      dbGet.returns(KarmaUtils.mockPromise(null, mockEnketoDoc('myform')));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, '<div><img src="jr://myimg"></div>'))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, VISIT_FORM));
      dbGetAttachment
        .onFirstCall().returns(KarmaUtils.mockPromise(null, 'xmlblob'))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, 'myobjblob'));
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(KarmaUtils.mockPromise(null, '<xml></xml>'));
      var wrapper = $('<div><div class="container"></div><form></form></div>');
      return service.render(wrapper, 'ok').then(function() {
        // need to wait for async get attachment to complete
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
      });
    });

    it('leaves img wrapped if failed to load', function() {
      UserContact.returns(KarmaUtils.mockPromise(null, { contact_id: '123' }));
      dbGet.returns(KarmaUtils.mockPromise(null, mockEnketoDoc('myform')));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, '<div><img src="jr://myimg"></div>'))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, VISIT_FORM));
      dbGetAttachment
        .onFirstCall().returns(KarmaUtils.mockPromise(null, 'xmlblob'))
        .onSecondCall().returns(KarmaUtils.mockPromise('not found'));
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(KarmaUtils.mockPromise(null, '<xml></xml>'));
      var wrapper = $('<div><div class="container"></div><form></form></div>');
      return service.render(wrapper, 'ok').then(function() {
        var img = wrapper.find('img').first();
        chai.expect(img.attr('src')).to.equal('#jr://myimg');
        chai.expect(img.css('visibility')).to.equal('hidden');
        chai.expect(img.closest('div').hasClass('loader')).to.equal(true);
        chai.expect(transform.callCount).to.equal(2);
        chai.expect(enketoInit.callCount).to.equal(1);
        chai.expect(createObjectURL.callCount).to.equal(0);
      });
    });

    it('passes xml instance data through to Enketo', function() {
      var data = '<data><patient_id>123</patient_id></data>';
      UserContact.returns(KarmaUtils.mockPromise(null, { contact_id: '123' }));
      dbGet.returns(KarmaUtils.mockPromise(null, mockEnketoDoc('myform')));
      dbGetAttachment.returns(KarmaUtils.mockPromise(null, 'xmlblob'));
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(KarmaUtils.mockPromise(null, data));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, $('<div>my form</div>')))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, 'my model'));
      return service.render($('<div></div>'), 'ok', data).then(function() {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
        chai.expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes json instance data through to Enketo', function() {
      var data = '<data><patient_id>123</patient_id></data>';
      UserContact.returns(KarmaUtils.mockPromise(null, {
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      }));
      dbGet.returns(KarmaUtils.mockPromise(null, mockEnketoDoc('myform')));
      dbGetAttachment.returns(KarmaUtils.mockPromise(null, 'xmlblob'));
      enketoInit.returns([]);
      FileReader.returns(KarmaUtils.mockPromise(null, '<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(KarmaUtils.mockPromise(null, data));
      transform
        .onFirstCall().returns(KarmaUtils.mockPromise(null, $('<div>my form</div>')))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, VISIT_FORM));
      var instanceData = {
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), 'ok', instanceData).then(function() {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].modelStr).to.equal(VISIT_FORM);
        chai.expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });
  });

  describe('save', function() {

    it('rejects on invalid form', function(done) {
      form.validate.returns(KarmaUtils.mockPromise(null, false));
      service.save('V', form).catch(function(actual) {
        chai.expect(actual.message).to.equal('Form is invalid');
        chai.expect(form.validate.callCount).to.equal(1);
        done();
      });
    });

    it('creates report', function() {
      form.validate.returns(KarmaUtils.mockPromise(null, true));
      var content = '<doc><name>Sally</name><lmp>10</lmp></doc>';
      form.getDataStr.returns(content);
      dbPost.returns(KarmaUtils.mockPromise(null, { id: '5', rev: '1-abc' }));
      UserContact.returns(KarmaUtils.mockPromise(null, { _id: '123', phone: '555' }));
      UserSettings.returns(KarmaUtils.mockPromise(null, { name: 'Jim' }));
      return service.save('V', form).then(function(actual) {
        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbPost.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);
        chai.expect(actual._id).to.equal('5');
        chai.expect(actual._rev).to.equal('1-abc');
        chai.expect(actual.fields.name).to.equal('Sally');
        chai.expect(actual.fields.lmp).to.equal('10');
        chai.expect(actual.form).to.equal('V');
        chai.expect(actual.type).to.equal('data_record');
        chai.expect(actual.content_type).to.equal('xml');
        chai.expect(actual.contact._id).to.equal('123');
        chai.expect(actual.from).to.equal('555');
        chai.expect(actual.read.length).to.equal(1);
        chai.expect(actual.read[0]).to.equal('Jim');
        chai.expect(AddAttachment.callCount).to.equal(1);
        chai.expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        chai.expect(AddAttachment.args[0][1]).to.equal('content');
        chai.expect(AddAttachment.args[0][2]).to.equal(content);
        chai.expect(AddAttachment.args[0][3]).to.equal('application/xml');
      });
    });

    it('creates report with hidden fields', function() {
      form.validate.returns(KarmaUtils.mockPromise(null, true));
      var content =
        '<doc>' +
          '<name>Sally</name>' +
          '<lmp>10</lmp>' +
          '<secret_code_name tag="hidden">S4L</secret_code_name>' +
        '</doc>';
      form.getDataStr.returns(content);
      dbPost.returns(KarmaUtils.mockPromise(null, { id: '5', rev: '1-abc' }));
      UserContact.returns(KarmaUtils.mockPromise(null, { _id: '123', phone: '555' }));
      return service.save('V', form).then(function(actual) {
        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbPost.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);
        chai.expect(actual._id).to.equal('5');
        chai.expect(actual._rev).to.equal('1-abc');
        chai.expect(actual.fields.name).to.equal('Sally');
        chai.expect(actual.fields.lmp).to.equal('10');
        chai.expect(actual.fields.secret_code_name).to.equal('S4L');
        chai.expect(actual.form).to.equal('V');
        chai.expect(actual.type).to.equal('data_record');
        chai.expect(actual.content_type).to.equal('xml');
        chai.expect(actual.contact._id).to.equal('123');
        chai.expect(actual.from).to.equal('555');
        chai.expect(actual.hidden_fields).to.deep.equal([ 'secret_code_name' ]);
      });
    });

    it('updates report', function() {
      form.validate.returns(KarmaUtils.mockPromise(null, true));
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
      dbPost.returns(KarmaUtils.mockPromise(null, { id: '6', rev: '2-abc' }));
      return service.save('V', form, '6').then(function(actual) {
        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbGet.callCount).to.equal(1);
        chai.expect(dbGet.args[0][0]).to.equal('6');
        chai.expect(dbPost.callCount).to.equal(1);
        chai.expect(actual._id).to.equal('6');
        chai.expect(actual._rev).to.equal('2-abc');
        chai.expect(actual.fields.name).to.equal('Sally');
        chai.expect(actual.fields.lmp).to.equal('10');
        chai.expect(actual.form).to.equal('V');
        chai.expect(actual.type).to.equal('data_record');
        chai.expect(actual.reported_date).to.equal(500);
        chai.expect(actual.content_type).to.equal('xml');
        chai.expect(AddAttachment.callCount).to.equal(1);
        chai.expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        chai.expect(AddAttachment.args[0][1]).to.equal('content');
        chai.expect(AddAttachment.args[0][2]).to.equal(content);
        chai.expect(AddAttachment.args[0][3]).to.equal('application/xml');
      });
    });

  });

});
