describe('Enketo service', function() {
  'use strict';

  /** @return a mock form ready for putting in #dbContent */
  var mockEnketoDoc = function(formInternalId) {
    return {
      internalId: formInternalId,
      _attachments: { xml: { something: true } },
    };
  };

  var VISIT_MODEL = `
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
    </model>`;

  var VISIT_MODEL_WITH_CONTACT_SUMMARY = `
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
      <instance id="contact-summary" />
      <itext>
        <translation lang="eng">
          <text id="patient_id:label">
            <value>Patient ID</value>
          </text>
        </translation>
      </itext>
      <bind nodeset="/data/patient_id" type="medicPatientSelect" required="true()" />
      <bind nodeset="/data/name" type="string" required="true()" />
    </model>`;

  var service,
      enketoInit = sinon.stub(),
      transform = sinon.stub(),
      dbGetAttachment = sinon.stub(),
      dbGet = sinon.stub(),
      dbBulkDocs = sinon.stub(),
      ContactSummary = sinon.stub(),
      UserContact = sinon.stub(),
      UserSettings = sinon.stub(),
      createObjectURL = sinon.stub(),
      FileReader = { utf8: sinon.stub() },
      Language = sinon.stub(),
      TranslateFrom = sinon.stub(),
      form = {
        validate: sinon.stub(),
        getDataStr: sinon.stub(),
      },
      AddAttachment = sinon.stub(),
      EnketoForm = sinon.stub(),
      EnketoPrepopulationData = sinon.stub(),
      XmlForm = sinon.stub(),
      Search = sinon.stub(),
      LineageModelGenerator = { contact: sinon.stub() };

  beforeEach(function() {
    module('inboxApp');

    window.EnketoForm = EnketoForm;
    EnketoForm.returns({
      init: enketoInit,
      calc: { update: function() {} },
      output: { update: function() {} },
    });

    XmlForm.returns(Promise.resolve({ id: 'abc' }));

    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        getAttachment: dbGetAttachment,
        get: dbGet,
        bulkDocs: dbBulkDocs
      }));
      $provide.value('XSLT', { transform: transform });
      $provide.value('$window', {
        angular: { callbacks: [] },
        URL: { createObjectURL: createObjectURL }
      });
      $provide.value('ContactSummary', ContactSummary);
      $provide.value('Search', Search);
      $provide.value('LineageModelGenerator', LineageModelGenerator);
      $provide.value('FileReader', FileReader);
      $provide.value('UserContact', UserContact);
      $provide.value('UserSettings', UserSettings);
      $provide.value('Language', Language);
      $provide.value('TranslateFrom', TranslateFrom);
      $provide.value('EnketoPrepopulationData', EnketoPrepopulationData);
      $provide.value('AddAttachment', AddAttachment);
      $provide.value('XmlForm', XmlForm);
      $provide.value('ZScore', () => Promise.resolve(sinon.stub()));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_Enketo_) {
      service = _Enketo_;
    });
    Language.returns(Promise.resolve('en'));
    TranslateFrom.returns('translated');
  });

  afterEach(function() {
    KarmaUtils.restore(EnketoForm, enketoInit, dbGetAttachment, dbGet, dbBulkDocs, transform, createObjectURL, ContactSummary, FileReader.utf8, UserContact, form.validate, form.getDataStr, Language, TranslateFrom, AddAttachment, Search, LineageModelGenerator.contact);
    sinon.restore();
  });

  describe('render', function() {

    it('renders error when user does not have associated contact', function(done) {
      UserContact.returns(Promise.resolve());
      service
        .render(null, 'not-defined')
        .then(function() {
          done(new Error('Should throw error'));
        })
        .catch(function(actual) {
          chai.expect(actual.message).to.equal('Your user does not have an associated contact, or does not have access to the associated contact. Talk to your administrator to correct this.');
          chai.expect(actual.translationKey).to.equal('error.loading.form.no_contact');
          done();
        });
    });

    it('return error when form initialisation fails', function(done) {
      UserContact.returns(Promise.resolve({ contact_id: '123' }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      dbGetAttachment.returns(Promise.resolve('xml'));
      transform
        .onFirstCall().returns(Promise.resolve($('<div>my form</div>')))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL));
      EnketoPrepopulationData.returns(Promise.resolve('<xml></xml>'));
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
      UserContact.returns(Promise.resolve({ contact_id: '123' }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      dbGetAttachment.returns(Promise.resolve('xmlblob'));
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve('<xml></xml>'));
      transform
        .onFirstCall().returns(Promise.resolve($('<div>my form</div>')))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL));
      return service.render($('<div></div>'), 'ok').then(function() {
        chai.expect(UserContact.callCount).to.equal(1);
        chai.expect(EnketoPrepopulationData.callCount).to.equal(2);
        chai.expect(transform.callCount).to.equal(2);
        chai.expect(transform.args[0][0]).to.equal('openrosa2html5form.xsl');
        chai.expect(transform.args[1][0]).to.equal('openrosa2xmlmodel.xsl');
        chai.expect(FileReader.utf8.callCount).to.equal(1);
        chai.expect(FileReader.utf8.args[0][0]).to.equal('xmlblob');
        chai.expect(enketoInit.callCount).to.equal(1);
      });
    });

    it('replaces img src with obj urls', function() {
      UserContact.returns(Promise.resolve({ contact_id: '123' }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      transform
        .onFirstCall().returns(Promise.resolve('<div><img src="jr://myimg"></div>'))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL));
      dbGetAttachment
        .onFirstCall().returns(Promise.resolve('xmlblob'))
        .onSecondCall().returns(Promise.resolve('myobjblob'));
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve('<xml></xml>'));
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
      UserContact.returns(Promise.resolve({ contact_id: '123' }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      transform
        .onFirstCall().returns(Promise.resolve('<div><img src="jr://myimg"></div>'))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL));
      dbGetAttachment
        .onFirstCall().returns(Promise.resolve('xmlblob'))
        .onSecondCall().returns(Promise.reject('not found'));
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve('<xml></xml>'));
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
      UserContact.returns(Promise.resolve({ contact_id: '123' }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      dbGetAttachment.returns(Promise.resolve('xmlblob'));
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve(data));
      transform
        .onFirstCall().returns(Promise.resolve($('<div>my form</div>')))
        .onSecondCall().returns(Promise.resolve('my model'));
      return service.render($('<div></div>'), 'ok', data).then(function() {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
        chai.expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes json instance data through to Enketo', function() {
      var data = '<data><patient_id>123</patient_id></data>';
      UserContact.returns(Promise.resolve({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      dbGetAttachment.returns(Promise.resolve('xmlblob'));
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve(data));
      transform
        .onFirstCall().returns(Promise.resolve($('<div>my form</div>')))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL));
      var instanceData = {
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), 'ok', instanceData).then(function() {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].modelStr).to.equal(VISIT_MODEL);
        chai.expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes contact summary data to enketo', function() {
      var data = '<data><patient_id>123</patient_id></data>';
      UserContact.returns(Promise.resolve({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      dbGetAttachment.returns(Promise.resolve('xmlblob'));
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve(data));
      transform
        .onFirstCall().returns(Promise.resolve($('<div>my form</div>')))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL_WITH_CONTACT_SUMMARY));
      var instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      ContactSummary.returns(Promise.resolve({ context: { pregnant: true } }));
      Search.returns(Promise.resolve([ { _id: 'somereport' }]));
      LineageModelGenerator.contact.returns(Promise.resolve({ lineage: [ { _id: 'someparent' } ] }));
      return service.render($('<div></div>'), 'ok', instanceData).then(function() {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].external.length).to.equal(1);
        var summary = EnketoForm.args[0][1].external[0];
        chai.expect(summary.id).to.equal('contact-summary');
        chai.expect(summary.xmlStr).to.equal('<context><pregnant>true</pregnant></context>');
        chai.expect(Search.callCount).to.equal(1);
        chai.expect(Search.args[0][0]).to.equal('reports');
        chai.expect(Search.args[0][1].subjectIds).to.deep.equal(['fffff', '44509']);
        chai.expect(LineageModelGenerator.contact.callCount).to.equal(1);
        chai.expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        chai.expect(ContactSummary.callCount).to.equal(1);
        chai.expect(ContactSummary.args[0][0]._id).to.equal('fffff');
        chai.expect(ContactSummary.args[0][1].length).to.equal(1);
        chai.expect(ContactSummary.args[0][1][0]._id).to.equal('somereport');
        chai.expect(ContactSummary.args[0][2].length).to.equal(1);
        chai.expect(ContactSummary.args[0][2][0]._id).to.equal('someparent');
      });
    });

    it('handles arrays and escaping characters', function() {
      var data = '<data><patient_id>123</patient_id></data>';
      UserContact.returns(Promise.resolve({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      dbGetAttachment.returns(Promise.resolve('xmlblob'));
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve(data));
      transform
        .onFirstCall().returns(Promise.resolve($('<div>my form</div>')))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL_WITH_CONTACT_SUMMARY));
      var instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      ContactSummary.returns(Promise.resolve({
        context: {
          pregnant: true,
          previousChildren: [ { dob: 2016 }, { dob: 2013 }, { dob: 2010 } ],
          notes: `always <uses> reserved "characters" & 'words'`
        }
      }));
      LineageModelGenerator.contact.returns(Promise.resolve({ lineage: [] }));
      return service.render($('<div></div>'), 'ok', instanceData).then(function() {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].external.length).to.equal(1);
        var summary = EnketoForm.args[0][1].external[0];
        chai.expect(summary.id).to.equal('contact-summary');
        chai.expect(summary.xmlStr).to.equal('<context><pregnant>true</pregnant><previousChildren><dob>2016</dob><dob>2013</dob><dob>2010</dob></previousChildren><notes>always &lt;uses&gt; reserved &quot;characters&quot; &amp; \'words\'</notes></context>');
        chai.expect(ContactSummary.callCount).to.equal(1);
        chai.expect(ContactSummary.args[0][0]._id).to.equal('fffff');
      });
    });

    it('does not get contact summary when the form has no instance for it', function() {
      var data = '<data><patient_id>123</patient_id></data>';
      UserContact.returns(Promise.resolve({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      }));
      dbGet.returns(Promise.resolve(mockEnketoDoc('myform')));
      dbGetAttachment.returns(Promise.resolve('xmlblob'));
      enketoInit.returns([]);
      FileReader.utf8.returns(Promise.resolve('<some-blob name="xml"/>'));
      EnketoPrepopulationData.returns(Promise.resolve(data));
      transform
        .onFirstCall().returns(Promise.resolve($('<div>my form</div>')))
        .onSecondCall().returns(Promise.resolve(VISIT_MODEL));
      var instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), 'ok', instanceData).then(function() {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].external).to.equal(undefined);
        chai.expect(ContactSummary.callCount).to.equal(0);
        chai.expect(LineageModelGenerator.contact.callCount).to.equal(0);
      });
    });
  });

  describe('save', function() {

    it('rejects on invalid form', function(done) {
      form.validate.returns(Promise.resolve(false));
      service.save('V', form).catch(function(actual) {
        chai.expect(actual.message).to.equal('Form is invalid');
        chai.expect(form.validate.callCount).to.equal(1);
        done();
      });
    });

    it('creates report', function() {
      form.validate.returns(Promise.resolve(true));
      var content = '<doc><name>Sally</name><lmp>10</lmp></doc>';
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => Promise.resolve([ { ok: true, id: docs[0]._id, rev: '1-abc' } ]));
      dbGetAttachment.returns(Promise.resolve('<form/>'));
      UserContact.returns(Promise.resolve({ _id: '123', phone: '555' }));
      UserSettings.returns(Promise.resolve({ name: 'Jim' }));
      return service.save('V', form).then(function(actual) {
        actual = actual[0];

        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);
        chai.expect(actual._id).to.match(/(\w+-)\w+/);
        chai.expect(actual._rev).to.equal('1-abc');
        chai.expect(actual.fields.name).to.equal('Sally');
        chai.expect(actual.fields.lmp).to.equal('10');
        chai.expect(actual.form).to.equal('V');
        chai.expect(actual.type).to.equal('data_record');
        chai.expect(actual.content_type).to.equal('xml');
        chai.expect(actual.contact._id).to.equal('123');
        chai.expect(actual.from).to.equal('555');
        chai.expect(dbGetAttachment.callCount).to.equal(1);
        chai.expect(dbGetAttachment.args[0][0]).to.equal('abc');
        chai.expect(AddAttachment.callCount).to.equal(1);
        chai.expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        chai.expect(AddAttachment.args[0][1]).to.equal('content');
        chai.expect(AddAttachment.args[0][2]).to.equal(content);
        chai.expect(AddAttachment.args[0][3]).to.equal('application/xml');
      });
    });

    it('creates report with hidden fields', function() {
      form.validate.returns(Promise.resolve(true));
      var content =
        `<doc>
          <name>Sally</name>
          <lmp>10</lmp>
          <secret_code_name tag="hidden">S4L</secret_code_name>
        </doc>`;
      form.getDataStr.returns(content);
      dbBulkDocs.returns(Promise.resolve([ { ok: true, id: '(generated-in-service)', rev: '1-abc' } ]));
      dbGetAttachment.returns(Promise.resolve('<form/>'));
      UserContact.returns(Promise.resolve({ _id: '123', phone: '555' }));
      return service.save('V', form).then(function(actual) {
        actual = actual[0];

        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);
        chai.expect(actual._id).to.match(/(\w+-)\w+/);
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
      form.validate.returns(Promise.resolve(true));
      var content = '<doc><name>Sally</name><lmp>10</lmp></doc>';
      form.getDataStr.returns(content);
      dbGet.returns(Promise.resolve({
        _id: '6',
        _rev: '1-abc',
        form: 'V',
        fields: { name: 'Silly' },
        content: '<doc><name>Silly</name></doc>',
        content_type: 'xml',
        type: 'data_record',
        reported_date: 500,
      }));
      dbBulkDocs.returns(Promise.resolve([ { ok: true, id: '6', rev: '2-abc' } ]));
      dbGetAttachment.returns(Promise.resolve('<form/>'));
      return service.save('V', form, null, '6').then(function(actual) {
        actual = actual[0];

        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbGet.callCount).to.equal(1);
        chai.expect(dbGet.args[0][0]).to.equal('6');
        chai.expect(dbBulkDocs.callCount).to.equal(1);
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

    it('creates extra docs', function() {

      const startTime = Date.now() - 1;

      form.validate.returns(Promise.resolve(true));
      var content =
          `<data>
            <name>Sally</name>
            <lmp>10</lmp>
            <secret_code_name tag="hidden">S4L</secret_code_name>
            <doc1 db-doc="true">
              <type>thing_1</type>
              <some_property_1>some_value_1</some_property_1>
            </doc1>
            <doc2 db-doc="true">
              <type>thing_2</type>
              <some_property_2>some_value_2</some_property_2>
            </doc2>
          </data>`;
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => {
        return Promise.resolve(docs.map(doc => {
          return { ok: true, id: doc._id, rev: `1-${doc._id}-abc` };
        }));
      });
      dbGetAttachment.returns(Promise.resolve('<form/>'));
      UserContact.returns(Promise.resolve({ _id: '123', phone: '555' }));
      return service.save('V', form).then(function(actual) {
        const endTime = Date.now() + 1;

        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(3);

        var actualReport = actual[0];
        chai.expect(actualReport._id).to.match(/(\w+-)\w+/);
        chai.expect(actualReport._rev).to.equal(`1-${actualReport._id}-abc`);
        chai.expect(actualReport.fields.name).to.equal('Sally');
        chai.expect(actualReport.fields.lmp).to.equal('10');
        chai.expect(actualReport.fields.secret_code_name).to.equal('S4L');
        chai.expect(actualReport.form).to.equal('V');
        chai.expect(actualReport.type).to.equal('data_record');
        chai.expect(actualReport.content_type).to.equal('xml');
        chai.expect(actualReport.contact._id).to.equal('123');
        chai.expect(actualReport.from).to.equal('555');
        chai.expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        chai.expect(actualReport.fields.doc1).to.equal(undefined);
        chai.expect(actualReport.fields.doc2).to.equal(undefined);

        var actualThing1 = actual[1];
        chai.expect(actualThing1._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing1._rev).to.equal(`1-${actualThing1._id}-abc`);
        chai.expect(actualThing1.reported_date).to.be.within(startTime, endTime);
        chai.expect(actualThing1.some_property_1).to.equal('some_value_1');

        var actualThing2 = actual[2];
        chai.expect(actualThing2._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing2._rev).to.equal(`1-${actualThing2._id}-abc`);
        chai.expect(actualThing2.reported_date).to.be.within(startTime, endTime);
        chai.expect(actualThing2.some_property_2).to.equal('some_value_2');

        chai.expect(_.uniq(_.pluck(actual, '_id')).length).to.equal(3);
      });
    });

    it('creates extra docs with geolocation', function() {

      const startTime = Date.now() - 1;

      form.validate.returns(Promise.resolve(true));
      var content =
          `<data>
            <name>Sally</name>
            <lmp>10</lmp>
            <secret_code_name tag="hidden">S4L</secret_code_name>
            <doc1 db-doc="true">
              <type>thing_1</type>
              <some_property_1>some_value_1</some_property_1>
            </doc1>
            <doc2 db-doc="true">
              <type>thing_2</type>
              <some_property_2>some_value_2</some_property_2>
            </doc2>
          </data>`;
      form.getDataStr.returns(content);
      dbBulkDocs.returns(Promise.resolve([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]));
      dbGetAttachment.returns(Promise.resolve('<form/>'));
      UserContact.returns(Promise.resolve({ _id: '123', phone: '555' }));
      return service.save('V', form, true).then(function(actual) {
        const endTime = Date.now() + 1;

        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(3);

        var actualReport = actual[0];
        chai.expect(actualReport._id).to.match(/(\w+-)\w+/);
        chai.expect(actualReport.fields.name).to.equal('Sally');
        chai.expect(actualReport.fields.lmp).to.equal('10');
        chai.expect(actualReport.fields.secret_code_name).to.equal('S4L');
        chai.expect(actualReport.form).to.equal('V');
        chai.expect(actualReport.type).to.equal('data_record');
        chai.expect(actualReport.content_type).to.equal('xml');
        chai.expect(actualReport.contact._id).to.equal('123');
        chai.expect(actualReport.from).to.equal('555');
        chai.expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        chai.expect(actualReport.fields.doc1).to.equal(undefined);
        chai.expect(actualReport.fields.doc2).to.equal(undefined);

        chai.expect(actualReport.geolocation).to.equal(true);

        var actualThing1 = actual[1];
        chai.expect(actualThing1._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing1.reported_date).to.be.above(startTime);
        chai.expect(actualThing1.reported_date).to.be.below(endTime);
        chai.expect(actualThing1.some_property_1).to.equal('some_value_1');

        chai.expect(actualThing1.geolocation).to.equal(true);

        var actualThing2 = actual[2];
        chai.expect(actualThing2._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing2.reported_date).to.be.above(startTime);
        chai.expect(actualThing2.reported_date).to.be.below(endTime);
        chai.expect(actualThing2.some_property_2).to.equal('some_value_2');

        chai.expect(actualThing2.geolocation).to.equal(true);

        chai.expect(_.uniq(_.pluck(actual, '_id')).length).to.equal(3);
      });
    });

    it('creates extra docs with references', function() {
      form.validate.returns(Promise.resolve(true));
      var content =
          `<data>
            <name>Sally</name>
            <lmp>10</lmp>
            <secret_code_name tag="hidden">S4L</secret_code_name>
            <doc1 db-doc="true">
              <type>thing_1</type>
              <some_property_1>some_value_1</some_property_1>
              <my_self_1 db-doc-ref="/data/doc1"/>
              <my_parent_1 db-doc-ref="/data"/>
              <my_sibling_1 db-doc-ref="/data/doc2"/>
            </doc1>
            <doc2 db-doc="true">
              <type>thing_2</type>
              <some_property_2>some_value_2</some_property_2>
              <my_self_2 db-doc-ref="/data/doc2"/>
              <my_parent_2 db-doc-ref="/data"/>
              <my_sibling_2 db-doc-ref="/data/doc1"/>
            </doc2>
            <my_self_0 db-doc-ref="/data"/>
            <my_child_01 db-doc-ref="/data/doc1"/>
            <my_child_02 db-doc-ref="/data/doc2"/>
          </data>`;
      form.getDataStr.returns(content);
      dbBulkDocs.returns(Promise.resolve([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]));
      dbGetAttachment.returns(Promise.resolve('<form/>'));
      UserContact.returns(Promise.resolve({ _id: '123', phone: '555' }));
      return service.save('V', form).then(function(actual) {
        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(3);
        const reportId = actual[0]._id;
        const doc1_id = actual[1]._id;
        const doc2_id = actual[2]._id;

        var actualReport = actual[0];
        chai.expect(actualReport._id).to.match(/(\w+-)\w+/);
        chai.expect(actualReport.fields.name).to.equal('Sally');
        chai.expect(actualReport.fields.lmp).to.equal('10');
        chai.expect(actualReport.fields.secret_code_name).to.equal('S4L');
        chai.expect(actualReport.fields.my_self_0).to.equal(reportId);
        chai.expect(actualReport.fields.my_child_01).to.equal(doc1_id);
        chai.expect(actualReport.fields.my_child_02).to.equal(doc2_id);
        chai.expect(actualReport.form).to.equal('V');
        chai.expect(actualReport.type).to.equal('data_record');
        chai.expect(actualReport.content_type).to.equal('xml');
        chai.expect(actualReport.contact._id).to.equal('123');
        chai.expect(actualReport.from).to.equal('555');
        chai.expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        chai.expect(actualReport.fields.doc1).to.equal(undefined);
        chai.expect(actualReport.fields.doc2).to.equal(undefined);

        var actualThing1 = actual[1];
        chai.expect(actualThing1._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing1.some_property_1).to.equal('some_value_1');
        chai.expect(actualThing1.my_self_1).to.equal(doc1_id);
        chai.expect(actualThing1.my_parent_1).to.equal(reportId);
        chai.expect(actualThing1.my_sibling_1).to.equal(doc2_id);

        var actualThing2 = actual[2];
        chai.expect(actualThing2._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing2.some_property_2).to.equal('some_value_2');
        chai.expect(actualThing2.my_self_2).to.equal(doc2_id);
        chai.expect(actualThing2.my_parent_2).to.equal(reportId);
        chai.expect(actualThing2.my_sibling_2).to.equal(doc1_id);

        chai.expect(_.uniq(_.pluck(actual, '_id')).length).to.equal(3);
      });
    });

    it('creates extra docs with repeats', function() {
      form.validate.returns(Promise.resolve(true));
      var content =
          `<data xmlns:jr="http://openrosa.org/javarosa">
            <name>Sally</name>
            <lmp>10</lmp>
            <secret_code_name tag="hidden">S4L</secret_code_name>
            <repeat_doc db-doc="true" jr:template="">
              <type>repeater</type>
              <some_property>some_value_1</some_property>
              <my_parent db-doc-ref="/data"/>
            </repeat_doc>
            <repeat_doc db-doc="true">
              <type>repeater</type>
              <some_property>some_value_2</some_property>
              <my_parent db-doc-ref="/data"/>
            </repeat_doc>
            <repeat_doc db-doc="true">
              <type>repeater</type>
              <some_property>some_value_3</some_property>
              <my_parent db-doc-ref="/data"/>
            </repeat_doc>
          </data>`;
      form.getDataStr.returns(content);
      dbBulkDocs.returns(Promise.resolve([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]));
      dbGetAttachment.returns(Promise.resolve('<form/>'));
      UserContact.returns(Promise.resolve({ _id: '123', phone: '555' }));
      return service.save('V', form).then(function(actual) {
        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(4);
        const reportId = actual[0]._id;

        var actualReport = actual[0];
        chai.expect(actualReport._id).to.match(/(\w+-)\w+/);
        chai.expect(actualReport.fields.name).to.equal('Sally');
        chai.expect(actualReport.fields.lmp).to.equal('10');
        chai.expect(actualReport.fields.secret_code_name).to.equal('S4L');
        chai.expect(actualReport.form).to.equal('V');
        chai.expect(actualReport.type).to.equal('data_record');
        chai.expect(actualReport.content_type).to.equal('xml');
        chai.expect(actualReport.contact._id).to.equal('123');
        chai.expect(actualReport.from).to.equal('555');
        chai.expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        for (var i=1; i<=3; ++i) {
          var repeatDocN = actual[i];
          chai.expect(repeatDocN._id).to.match(/(\w+-)\w+/);
          chai.expect(repeatDocN.my_parent).to.equal(reportId);
          chai.expect(repeatDocN.some_property).to.equal('some_value_'+i);
        }

        chai.expect(_.uniq(_.pluck(actual, '_id')).length).to.equal(4);
      });
    });

    it('saves attachments', () => {
      const jqFind = $.fn.find;
      sinon.stub($.fn, 'find');
      $.fn.find.callsFake(jqFind);
      $.fn.find
        .withArgs('input[type=file][name="/my-form/my_file"]')
        .returns([{ files: [{ type: 'image', foo: 'bar' }] }]);

      form.validate.resolves(true);
      const content = `
        <my-form>
          <name>Mary</name>
          <age>10</age>
          <gender>f</gender>
          <my_file type="file">some image name.png</my_file>
        </my-form>
      `;

      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: 'my-user', phone: '8989' });
      dbBulkDocs.callsFake(docs => Promise.resolve([ { ok: true, id: docs[0]._id, rev: '1-abc' } ]));
      return service.save('my-form', form, true).then(() => {
        chai.expect(AddAttachment.callCount).to.equal(2);
        chai.expect(AddAttachment.args[0][1]).to.equal('content');

        chai.expect(AddAttachment.args[1][1]).to.equal('user-file/my-form/my_file');
        chai.expect(AddAttachment.args[1][2]).to.deep.equal({ type: 'image', foo: 'bar' });
        chai.expect(AddAttachment.args[1][3]).to.equal('image');
      });
    });

    it('attachment names are relative to the form name not the root node name', () => {
      const jqFind = $.fn.find;
      sinon.stub($.fn, 'find');
      $.fn.find.callsFake(jqFind);
      $.fn.find
        .withArgs('input[type=file][name="/my-root-element/my_file"]')
        .returns([{ files: [{ type: 'image', foo: 'bar' }] }]);
      $.fn.find
        .withArgs('input[type=file][name="/my-root-element/sub_element/sub_sub_element/other_file"]')
        .returns([{ files: [{ type: 'mytype', foo: 'baz' }] }]);
      form.validate.resolves(true);
      const content = `
        <my-root-element>
          <name>Mary</name>
          <age>10</age>
          <gender>f</gender>
          <my_file type="file">some image name.png</my_file>
          <sub_element>
            <sub_sub_element>
              <other_file type="file">some other name.png</other_file>
            </sub_sub_element>
          </sub_element>
        </my-root-element>
      `;

      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: 'my-user', phone: '8989' });
      dbBulkDocs.callsFake(docs => Promise.resolve([ { ok: true, id: docs[0]._id, rev: '1-abc' } ]));
      return service.save('my-form-internal-id', form, true).then(() => {
        chai.expect(AddAttachment.callCount).to.equal(3);
        chai.expect(AddAttachment.args[0][1]).to.equal('content');

        chai.expect(AddAttachment.args[1][1]).to.equal('user-file/my-form-internal-id/my_file');
        chai.expect(AddAttachment.args[1][2]).to.deep.equal({ type: 'image', foo: 'bar' });
        chai.expect(AddAttachment.args[1][3]).to.equal('image');

        chai.expect(AddAttachment.args[2][1])
          .to.equal('user-file/my-form-internal-id/sub_element/sub_sub_element/other_file');
        chai.expect(AddAttachment.args[2][2]).to.deep.equal({ type: 'mytype', foo: 'baz' });
        chai.expect(AddAttachment.args[2][3]).to.equal('mytype');
      });
    });
  });

});
