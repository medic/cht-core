describe('Enketo service', () => {
  'use strict';

  /** @return a mock form ready for putting in #dbContent */
  const mockEnketoDoc = formInternalId => {
    return {
      internalId: formInternalId,
      _attachments: { xml: { something: true } },
    };
  };

  const VISIT_MODEL = `
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

  const VISIT_MODEL_WITH_CONTACT_SUMMARY = `
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

  let service,
      GlobalActions;
  const enketoInit = sinon.stub(),
      transform = sinon.stub(),
      dbGetAttachment = sinon.stub(),
      dbGet = sinon.stub(),
      dbBulkDocs = sinon.stub(),
      ContactSummary = sinon.stub(),
      Form2Sms = sinon.stub(),
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

  beforeEach(() => {
    module('inboxApp');

    window.EnketoForm = EnketoForm;
    EnketoForm.returns({
      init: enketoInit,
      calc: { update: () => {} },
      output: { update: () => {} },
    });

    XmlForm.resolves({ id: 'abc' });
    GlobalActions = { setLastChangedDoc: sinon.stub() };

    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        getAttachment: dbGetAttachment,
        get: dbGet,
        bulkDocs: dbBulkDocs
      }));
      $provide.value('XSLT', { transform: transform });
      $provide.value('$window', {
        angular: { callbacks: [] },
        URL: { createObjectURL: createObjectURL },
        history: { replaceState: () => {} }
      });
      $provide.value('ContactSummary', ContactSummary);
      $provide.value('Form2Sms', Form2Sms);
      $provide.value('Search', Search);
      $provide.value('Settings', Promise.resolve({}));
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
      $provide.value('GlobalActions', () => GlobalActions);
    });
    inject(function(_Enketo_) {
      service = _Enketo_;
    });
    Language.resolves('en');
    TranslateFrom.returns('translated');
  });

  afterEach(() => {
    KarmaUtils.restore(EnketoForm, EnketoPrepopulationData, enketoInit, dbGetAttachment, dbGet, dbBulkDocs, transform, createObjectURL, ContactSummary, FileReader.utf8, Form2Sms, UserContact, form.validate, form.getDataStr, Language, TranslateFrom, AddAttachment, Search, LineageModelGenerator.contact);
    sinon.restore();
  });

  describe('render', () => {

    it('renders error when user does not have associated contact', function(done) {
      UserContact.resolves();
      service
        .render(null, 'not-defined')
        .then(() => {
          done(new Error('Should throw error'));
        })
        .catch(function(actual) {
          chai.expect(actual.message).to.equal('Your user does not have an associated contact, or does not have access to the associated contact. Talk to your administrator to correct this.');
          chai.expect(actual.translationKey).to.equal('error.loading.form.no_contact');
          done();
        });
    });

    it('return error when form initialisation fails', function(done) {
      UserContact.resolves({ contact_id: '123' });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xml');
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      EnketoPrepopulationData.resolves('<xml></xml>');
      const expected = [ 'nope', 'still nope' ];
      enketoInit.returns(expected);
      service.render($('<div></div>'), 'ok')
        .then(() => {
          done(new Error('Should throw error'));
        })
        .catch(function(actual) {
          chai.expect(enketoInit.callCount).to.equal(1);
          chai.expect(actual.message).to.equal(JSON.stringify(expected));
          done();
        });
    });

    it('return form when everything works', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xmlblob');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      return service.render($('<div></div>'), 'ok').then(() => {
        chai.expect(UserContact.callCount).to.equal(1);
        chai.expect(EnketoPrepopulationData.callCount).to.equal(1);
        chai.expect(transform.callCount).to.equal(2);
        chai.expect(transform.args[0][0]).to.equal('openrosa2html5form.xsl');
        chai.expect(transform.args[1][0]).to.equal('openrosa2xmlmodel.xsl');
        chai.expect(FileReader.utf8.callCount).to.equal(1);
        chai.expect(FileReader.utf8.args[0][0]).to.equal('xmlblob');
        chai.expect(enketoInit.callCount).to.equal(1);
      });
    });

    it('replaces img src with obj urls', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGet.resolves(mockEnketoDoc('myform'));
      transform
        .onFirstCall().resolves('<div><img src="jr://myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL);
      dbGetAttachment
        .onFirstCall().resolves('xmlblob')
        .onSecondCall().resolves('myobjblob');
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      return service.render(wrapper, 'ok').then(() => {
        // need to wait for async get attachment to complete
        const img = wrapper.find('img').first();
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

    it('leaves img wrapped if failed to load', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGet.resolves(mockEnketoDoc('myform'));
      transform
        .onFirstCall().resolves('<div><img src="jr://myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL);
      dbGetAttachment
        .onFirstCall().resolves('xmlblob')
        .onSecondCall().rejects('not found');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      return service.render(wrapper, 'ok').then(() => {
        const img = wrapper.find('img').first();
        chai.expect(img.attr('src')).to.equal(undefined);
        chai.expect(img.attr('data-media-src')).to.equal('myimg');
        chai.expect(img.css('visibility')).to.equal('hidden');
        chai.expect(img.closest('div').hasClass('loader')).to.equal(true);
        chai.expect(transform.callCount).to.equal(2);
        chai.expect(enketoInit.callCount).to.equal(1);
        chai.expect(createObjectURL.callCount).to.equal(0);
      });
    });

    it('passes xml instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xmlblob');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves(data);
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      return service.render($('<div></div>'), 'ok', data).then(() => {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
        chai.expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes json instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xmlblob');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves(data);
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      const instanceData = {
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), 'ok', instanceData).then(() => {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].modelStr).to.equal(VISIT_MODEL);
        chai.expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes contact summary data to enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xmlblob');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves(data);
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      ContactSummary.resolves({ context: { pregnant: true } });
      Search.resolves([ { _id: 'somereport' }]);
      LineageModelGenerator.contact.resolves({ lineage: [ { _id: 'someparent' } ] });
      return service.render($('<div></div>'), 'ok', instanceData).then(() => {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
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

    it('handles arrays and escaping characters', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xmlblob');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves(data);
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      ContactSummary.resolves({
        context: {
          pregnant: true,
          previousChildren: [ { dob: 2016 }, { dob: 2013 }, { dob: 2010 } ],
          notes: `always <uses> reserved "characters" & 'words'`
        }
      });
      LineageModelGenerator.contact.resolves({ lineage: [] });
      return service.render($('<div></div>'), 'ok', instanceData).then(() => {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        chai.expect(summary.id).to.equal('contact-summary');
        chai.expect(summary.xmlStr).to.equal('<context><pregnant>true</pregnant><previousChildren><dob>2016</dob><dob>2013</dob><dob>2010</dob></previousChildren><notes>always &lt;uses&gt; reserved &quot;characters&quot; &amp; \'words\'</notes></context>');
        chai.expect(ContactSummary.callCount).to.equal(1);
        chai.expect(ContactSummary.args[0][0]._id).to.equal('fffff');
      });
    });

    it('does not get contact summary when the form has no instance for it', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xmlblob');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves(data);
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), 'ok', instanceData).then(() => {
        chai.expect(EnketoForm.callCount).to.equal(1);
        chai.expect(EnketoForm.args[0][1].external).to.equal(undefined);
        chai.expect(ContactSummary.callCount).to.equal(0);
        chai.expect(LineageModelGenerator.contact.callCount).to.equal(0);
      });
    });

    it('ContactSummary receives empty lineage if contact doc is missing', () => {
      LineageModelGenerator.contact.rejects({ code: 404 });

      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGet.resolves(mockEnketoDoc('myform'));
      dbGetAttachment.resolves('xmlblob');
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<data><patient_id>123</patient_id></data>');
      transform
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        }
      };
      ContactSummary.resolves({ context: { pregnant: true } });
      Search.resolves([ { _id: 'somereport' }]);
      return service.render($('<div></div>'), 'ok', instanceData).then(() => {
        chai.expect(LineageModelGenerator.contact.callCount).to.equal(1);
        chai.expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        chai.expect(ContactSummary.callCount).to.equal(1);
        chai.expect(ContactSummary.args[0][2].length).to.equal(0);
      });
    });
  });

  describe('save', () => {

    it('rejects on invalid form', function(done) {
      form.validate.resolves(false);
      service.save('V', form).catch(function(actual) {
        chai.expect(actual.message).to.equal('Form is invalid');
        chai.expect(form.validate.callCount).to.equal(1);
        done();
      });
    });

    it('creates report', () => {
      form.validate.resolves(true);
      const content = '<doc><name>Sally</name><lmp>10</lmp></doc>';
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => Promise.resolve([ { ok: true, id: docs[0]._id, rev: '1-abc' } ]));
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: '123', phone: '555' });
      UserSettings.resolves({ name: 'Jim' });

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

    it('creates report with hidden fields', () => {
      form.validate.resolves(true);
      const content =
        `<doc>
          <name>Sally</name>
          <lmp>10</lmp>
          <secret_code_name tag="hidden">S4L</secret_code_name>
        </doc>`;
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([ { ok: true, id: '(generated-in-service)', rev: '1-abc' } ]);
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form, null, null).then(function(actual) {
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
        chai.expect(GlobalActions.setLastChangedDoc.callCount).to.equal(1);
        chai.expect(GlobalActions.setLastChangedDoc.args[0]).to.deep.equal([actual]);
      });
    });

    it('updates report', () => {
      form.validate.resolves(true);
      const content = '<doc><name>Sally</name><lmp>10</lmp></doc>';
      form.getDataStr.returns(content);
      dbGet.resolves({
        _id: '6',
        _rev: '1-abc',
        form: 'V',
        fields: { name: 'Silly' },
        content: '<doc><name>Silly</name></doc>',
        content_type: 'xml',
        type: 'data_record',
        reported_date: 500,
      });
      dbBulkDocs.resolves([ { ok: true, id: '6', rev: '2-abc' } ]);
      dbGetAttachment.resolves('<form/>');
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
        chai.expect(GlobalActions.setLastChangedDoc.callCount).to.equal(1);
        chai.expect(GlobalActions.setLastChangedDoc.args[0]).to.deep.equal([actual]);
      });
    });

    it('creates extra docs', () => {

      const startTime = Date.now() - 1;

      form.validate.resolves(true);
      const content =
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
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: '123', phone: '555' });

      return service.save('V', form, null, null).then(function(actual) {
        const endTime = Date.now() + 1;

        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(3);

        const actualReport = actual[0];
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

        const actualThing1 = actual[1];
        chai.expect(actualThing1._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing1._rev).to.equal(`1-${actualThing1._id}-abc`);
        chai.expect(actualThing1.reported_date).to.be.within(startTime, endTime);
        chai.expect(actualThing1.some_property_1).to.equal('some_value_1');

        const actualThing2 = actual[2];
        chai.expect(actualThing2._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing2._rev).to.equal(`1-${actualThing2._id}-abc`);
        chai.expect(actualThing2.reported_date).to.be.within(startTime, endTime);
        chai.expect(actualThing2.some_property_2).to.equal('some_value_2');

        chai.expect(_.uniq(_.pluck(actual, '_id')).length).to.equal(3);

        chai.expect(GlobalActions.setLastChangedDoc.callCount).to.equal(1);
        chai.expect(GlobalActions.setLastChangedDoc.args[0]).to.deep.equal([actualReport]);
      });
    });

    it('creates extra docs with geolocation', () => {

      const startTime = Date.now() - 1;

      form.validate.resolves(true);
      const content =
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
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form, true).then(function(actual) {
        const endTime = Date.now() + 1;

        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(3);

        const actualReport = actual[0];
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

        const actualThing1 = actual[1];
        chai.expect(actualThing1._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing1.reported_date).to.be.above(startTime);
        chai.expect(actualThing1.reported_date).to.be.below(endTime);
        chai.expect(actualThing1.some_property_1).to.equal('some_value_1');

        chai.expect(actualThing1.geolocation).to.equal(true);

        const actualThing2 = actual[2];
        chai.expect(actualThing2._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing2.reported_date).to.be.above(startTime);
        chai.expect(actualThing2.reported_date).to.be.below(endTime);
        chai.expect(actualThing2.some_property_2).to.equal('some_value_2');

        chai.expect(actualThing2.geolocation).to.equal(true);

        chai.expect(_.uniq(_.pluck(actual, '_id')).length).to.equal(3);
      });
    });

    it('creates extra docs with references', () => {
      form.validate.resolves(true);
      const content =
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
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(function(actual) {
        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(3);
        const reportId = actual[0]._id;
        const doc1_id = actual[1]._id;
        const doc2_id = actual[2]._id;

        const actualReport = actual[0];
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

        const actualThing1 = actual[1];
        chai.expect(actualThing1._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing1.some_property_1).to.equal('some_value_1');
        chai.expect(actualThing1.my_self_1).to.equal(doc1_id);
        chai.expect(actualThing1.my_parent_1).to.equal(reportId);
        chai.expect(actualThing1.my_sibling_1).to.equal(doc2_id);

        const actualThing2 = actual[2];
        chai.expect(actualThing2._id).to.match(/(\w+-)\w+/);
        chai.expect(actualThing2.some_property_2).to.equal('some_value_2');
        chai.expect(actualThing2.my_self_2).to.equal(doc2_id);
        chai.expect(actualThing2.my_parent_2).to.equal(reportId);
        chai.expect(actualThing2.my_sibling_2).to.equal(doc1_id);

        chai.expect(_.uniq(_.pluck(actual, '_id')).length).to.equal(3);
      });
    });

    it('creates extra docs with repeats', () => {
      form.validate.resolves(true);
      const content =
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
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(function(actual) {
        chai.expect(form.validate.callCount).to.equal(1);
        chai.expect(form.getDataStr.callCount).to.equal(1);
        chai.expect(dbBulkDocs.callCount).to.equal(1);
        chai.expect(UserContact.callCount).to.equal(1);

        chai.expect(actual.length).to.equal(4);
        const reportId = actual[0]._id;

        const actualReport = actual[0];
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

        for (let i=1; i<=3; ++i) {
          const repeatDocN = actual[i];
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
