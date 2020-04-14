describe('Enketo service', () => {
  const { expect } = chai;

  'use strict';

  // return a mock form ready for putting in #dbContent
  const mockEnketoDoc = formInternalId => {
    return {
      _id: `form:${formInternalId}`,
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

  let service;
  let ServicesActions;

  const enketoInit = sinon.stub();
  const dbGetAttachment = sinon.stub();
  const dbGet = sinon.stub();
  const dbBulkDocs = sinon.stub();
  const ContactSummary = sinon.stub();
  const Form2Sms = sinon.stub();
  const UserContact = sinon.stub();
  const UserSettings = sinon.stub();
  const createObjectURL = sinon.stub();
  const FileReader = { utf8: sinon.stub() };
  const Language = sinon.stub();
  const TranslateFrom = sinon.stub();
  const form = {
    validate: sinon.stub(),
    getDataStr: sinon.stub(),
  };
  const AddAttachment = sinon.stub();
  const EnketoForm = sinon.stub();
  const EnketoPrepopulationData = sinon.stub();
  const Search = sinon.stub();
  const LineageModelGenerator = { contact: sinon.stub() };

  beforeEach(() => {
    module('inboxApp');

    window.EnketoForm = EnketoForm;
    EnketoForm.returns({
      init: enketoInit,
      langs: { setAll: () => {} },
      calc: { update: () => {} },
      output: { update: () => {} },
    });

    ServicesActions = { setLastChangedDoc: sinon.stub() };

    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({
        getAttachment: dbGetAttachment,
        get: dbGet,
        bulkDocs: dbBulkDocs
      }));
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
      $provide.value('XmlForms', {
        get: sinon.stub().resolves({ _id: 'abc' }),
        findXFormAttachmentName: sinon.stub().resolves('mydoc')
      });
      $provide.value('ZScore', () => Promise.resolve(sinon.stub()));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('ServicesActions', () => ServicesActions);
    });
    inject(_Enketo_ => service = _Enketo_ );
    Language.resolves('en');
    TranslateFrom.returns('translated');
  });

  afterEach(() => {
    KarmaUtils.restore(EnketoForm, EnketoPrepopulationData, enketoInit, dbGetAttachment, dbGet, dbBulkDocs,
      createObjectURL, ContactSummary, FileReader.utf8, Form2Sms, UserContact, form.validate, form.getDataStr,
      Language, TranslateFrom, AddAttachment, Search, LineageModelGenerator.contact);
    sinon.restore();
  });

  describe('render', () => {

    it('renders error when user does not have associated contact', done => {
      UserContact.resolves();
      service
        .render(null, 'not-defined')
        .then(() => {
          done(new Error('Should throw error'));
        })
        .catch(actual => {
          expect(actual.message).to.equal('Your user does not have an associated contact, or does not have access ' +
            'to the associated contact. Talk to your administrator to correct this.');
          expect(actual.translationKey).to.equal('error.loading.form.no_contact');
          done();
        });
    });

    it('return error when form initialisation fails', done => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      EnketoPrepopulationData.resolves('<xml></xml>');
      const expected = [ 'nope', 'still nope' ];
      enketoInit.returns(expected);
      service
        .render($('<div></div>'), mockEnketoDoc('myform'))
        .then(function() {
          done(new Error('Should throw error'));
        })
        .catch(actual => {
          expect(enketoInit.callCount).to.equal(1);
          expect(actual.message).to.equal(JSON.stringify(expected));
          done();
        });
    });

    it('return form when everything works', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      return service.render($('<div></div>'), mockEnketoDoc('myform')).then(() => {
        expect(UserContact.callCount).to.equal(1);
        expect(EnketoPrepopulationData.callCount).to.equal(1);
        expect(FileReader.utf8.callCount).to.equal(2);
        expect(FileReader.utf8.args[0][0]).to.equal('<div>my form</div>');
        expect(FileReader.utf8.args[1][0]).to.equal(VISIT_MODEL);
        expect(enketoInit.callCount).to.equal(1);
        expect(dbGetAttachment.callCount).to.equal(2);
        expect(dbGetAttachment.args[0][0]).to.equal('form:myform');
        expect(dbGetAttachment.args[0][1]).to.equal('form.html');
        expect(dbGetAttachment.args[1][0]).to.equal('form:myform');
        expect(dbGetAttachment.args[1][1]).to.equal('model.xml');
      });
    });

    it('replaces img src with obj urls', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL)
        .onThirdCall().resolves('myobjblob');
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      return service.render(wrapper, mockEnketoDoc('myform')).then(() => {
        return Promise.resolve().then(() => {
          // need to wait for async get attachment to complete
          const img = wrapper.find('img').first();
          expect(img.css('visibility')).to.satisfy(val => {
            // different browsers return different values but both are equivalent
            return val === '' || val === 'visible';
          });
          expect(enketoInit.callCount).to.equal(1);
          expect(createObjectURL.callCount).to.equal(1);
          expect(createObjectURL.args[0][0]).to.equal('myobjblob');
        });
      });
    });

    it('leaves img wrapped and hides loader if failed to load', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL)
        .onThirdCall().rejects('not found');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      return service.render(wrapper, mockEnketoDoc('myform')).then(() => {
        const img = wrapper.find('img').first();
        expect(img.attr('src')).to.equal(undefined);
        expect(img.attr('data-media-src')).to.equal('myimg');
        expect(img.css('visibility')).to.equal('hidden');
        const loader = img.closest('div');
        expect(loader.hasClass('loader')).to.equal(true);
        expect(loader.is(':hidden')).to.equal(true);
        expect(enketoInit.callCount).to.equal(1);
        expect(createObjectURL.callCount).to.equal(0);
      });
    });

    it('passes users language to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      EnketoPrepopulationData.resolves(data);
      Language.resolves('sw');
      return service.render($('<div></div>'), mockEnketoDoc('myform'), data).then(() => {
        expect(Language.callCount).to.equal(1);
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][2].language).to.equal('sw');
      });
    });

    it('passes xml instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      EnketoPrepopulationData.resolves(data);
      return service.render($('<div></div>'), mockEnketoDoc('myform'), data).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes json instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      EnketoPrepopulationData.resolves(data);
      const instanceData = {
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal(VISIT_MODEL);
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes contact summary data to enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      EnketoPrepopulationData.resolves(data);
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
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('contact-summary');
        expect(summary.xmlStr).to.equal('<context><pregnant>true</pregnant></context>');
        expect(Search.callCount).to.equal(1);
        expect(Search.args[0][0]).to.equal('reports');
        expect(Search.args[0][1].subjectIds).to.deep.equal(['fffff', '44509']);
        expect(LineageModelGenerator.contact.callCount).to.equal(1);
        expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        expect(ContactSummary.callCount).to.equal(1);
        expect(ContactSummary.args[0][0]._id).to.equal('fffff');
        expect(ContactSummary.args[0][1].length).to.equal(1);
        expect(ContactSummary.args[0][1][0]._id).to.equal('somereport');
        expect(ContactSummary.args[0][2].length).to.equal(1);
        expect(ContactSummary.args[0][2][0]._id).to.equal('someparent');
      });
    });

    it('handles arrays and escaping characters', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      EnketoPrepopulationData.resolves(data);
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
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('contact-summary');
        expect(summary.xmlStr).to.equal('<context><pregnant>true</pregnant><previousChildren><dob>2016</dob>' +
          '<dob>2013</dob><dob>2010</dob></previousChildren><notes>always &lt;uses&gt; reserved &quot;' +
          'characters&quot; &amp; \'words\'</notes></context>');
        expect(ContactSummary.callCount).to.equal(1);
        expect(ContactSummary.args[0][0]._id).to.equal('fffff');
      });
    });

    it('does not get contact summary when the form has no instance for it', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves(data);
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external).to.equal(undefined);
        expect(ContactSummary.callCount).to.equal(0);
        expect(LineageModelGenerator.contact.callCount).to.equal(0);
      });
    });

    it('ContactSummary receives empty lineage if contact doc is missing', () => {
      LineageModelGenerator.contact.rejects({ code: 404 });

      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      EnketoPrepopulationData.resolves('<data><patient_id>123</patient_id></data>');
      dbGetAttachment
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
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(LineageModelGenerator.contact.callCount).to.equal(1);
        expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        expect(ContactSummary.callCount).to.equal(1);
        expect(ContactSummary.args[0][2].length).to.equal(0);
      });
    });
  });

  describe('save', () => {

    it('rejects on invalid form', done => {
      form.validate.resolves(false);
      service.save('V', form).catch(actual => {
        expect(actual.message).to.equal('Form is invalid');
        expect(form.validate.callCount).to.equal(1);
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

      return service.save('V', form).then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);
        expect(actual._id).to.match(/(\w+-)\w+/);
        expect(actual._rev).to.equal('1-abc');
        expect(actual.fields.name).to.equal('Sally');
        expect(actual.fields.lmp).to.equal('10');
        expect(actual.form).to.equal('V');
        expect(actual.type).to.equal('data_record');
        expect(actual.content_type).to.equal('xml');
        expect(actual.contact._id).to.equal('123');
        expect(actual.from).to.equal('555');
        expect(dbGetAttachment.callCount).to.equal(1);
        expect(dbGetAttachment.args[0][0]).to.equal('abc');
        expect(AddAttachment.callCount).to.equal(1);
        expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        expect(AddAttachment.args[0][1]).to.equal('content');
        expect(AddAttachment.args[0][2]).to.equal(content);
        expect(AddAttachment.args[0][3]).to.equal('application/xml');
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
      return service.save('V', form, null, null).then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);
        expect(actual._id).to.match(/(\w+-)\w+/);
        expect(actual.fields.name).to.equal('Sally');
        expect(actual.fields.lmp).to.equal('10');
        expect(actual.fields.secret_code_name).to.equal('S4L');
        expect(actual.form).to.equal('V');
        expect(actual.type).to.equal('data_record');
        expect(actual.content_type).to.equal('xml');
        expect(actual.contact._id).to.equal('123');
        expect(actual.from).to.equal('555');
        expect(actual.hidden_fields).to.deep.equal([ 'secret_code_name' ]);
        expect(ServicesActions.setLastChangedDoc.callCount).to.equal(1);
        expect(ServicesActions.setLastChangedDoc.args[0]).to.deep.equal([actual]);
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
      return service.save('V', form, null, '6').then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0][0]).to.equal('6');
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(actual._id).to.equal('6');
        expect(actual._rev).to.equal('2-abc');
        expect(actual.fields.name).to.equal('Sally');
        expect(actual.fields.lmp).to.equal('10');
        expect(actual.form).to.equal('V');
        expect(actual.type).to.equal('data_record');
        expect(actual.reported_date).to.equal(500);
        expect(actual.content_type).to.equal('xml');
        expect(AddAttachment.callCount).to.equal(1);
        expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        expect(AddAttachment.args[0][1]).to.equal('content');
        expect(AddAttachment.args[0][2]).to.equal(content);
        expect(AddAttachment.args[0][3]).to.equal('application/xml');
        expect(ServicesActions.setLastChangedDoc.callCount).to.equal(1);
        expect(ServicesActions.setLastChangedDoc.args[0]).to.deep.equal([actual]);
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

      return service.save('V', form, null, null).then(actual => {
        const endTime = Date.now() + 1;

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

        expect(actual.length).to.equal(3);

        const actualReport = actual[0];
        expect(actualReport._id).to.match(/(\w+-)\w+/);
        expect(actualReport._rev).to.equal(`1-${actualReport._id}-abc`);
        expect(actualReport.fields.name).to.equal('Sally');
        expect(actualReport.fields.lmp).to.equal('10');
        expect(actualReport.fields.secret_code_name).to.equal('S4L');
        expect(actualReport.form).to.equal('V');
        expect(actualReport.type).to.equal('data_record');
        expect(actualReport.content_type).to.equal('xml');
        expect(actualReport.contact._id).to.equal('123');
        expect(actualReport.from).to.equal('555');
        expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        expect(actualReport.fields.doc1).to.equal(undefined);
        expect(actualReport.fields.doc2).to.equal(undefined);

        const actualThing1 = actual[1];
        expect(actualThing1._id).to.match(/(\w+-)\w+/);
        expect(actualThing1._rev).to.equal(`1-${actualThing1._id}-abc`);
        expect(actualThing1.reported_date).to.be.within(startTime, endTime);
        expect(actualThing1.some_property_1).to.equal('some_value_1');

        const actualThing2 = actual[2];
        expect(actualThing2._id).to.match(/(\w+-)\w+/);
        expect(actualThing2._rev).to.equal(`1-${actualThing2._id}-abc`);
        expect(actualThing2.reported_date).to.be.within(startTime, endTime);
        expect(actualThing2.some_property_2).to.equal('some_value_2');

        expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);

        expect(ServicesActions.setLastChangedDoc.callCount).to.equal(1);
        expect(ServicesActions.setLastChangedDoc.args[0]).to.deep.equal([actualReport]);
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
      return service.save('V', form, true).then(actual => {
        const endTime = Date.now() + 1;

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

        expect(actual.length).to.equal(3);

        const actualReport = actual[0];
        expect(actualReport._id).to.match(/(\w+-)\w+/);
        expect(actualReport.fields.name).to.equal('Sally');
        expect(actualReport.fields.lmp).to.equal('10');
        expect(actualReport.fields.secret_code_name).to.equal('S4L');
        expect(actualReport.form).to.equal('V');
        expect(actualReport.type).to.equal('data_record');
        expect(actualReport.content_type).to.equal('xml');
        expect(actualReport.contact._id).to.equal('123');
        expect(actualReport.from).to.equal('555');
        expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        expect(actualReport.fields.doc1).to.equal(undefined);
        expect(actualReport.fields.doc2).to.equal(undefined);

        expect(actualReport.geolocation).to.equal(true);

        const actualThing1 = actual[1];
        expect(actualThing1._id).to.match(/(\w+-)\w+/);
        expect(actualThing1.reported_date).to.be.above(startTime);
        expect(actualThing1.reported_date).to.be.below(endTime);
        expect(actualThing1.some_property_1).to.equal('some_value_1');
        expect(actualThing1.geolocation).to.equal(true);

        const actualThing2 = actual[2];
        expect(actualThing2._id).to.match(/(\w+-)\w+/);
        expect(actualThing2.reported_date).to.be.above(startTime);
        expect(actualThing2.reported_date).to.be.below(endTime);
        expect(actualThing2.some_property_2).to.equal('some_value_2');

        expect(actualThing2.geolocation).to.equal(true);

        expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);
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

      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

        expect(actual.length).to.equal(3);
        const reportId = actual[0]._id;
        const doc1_id = actual[1]._id;
        const doc2_id = actual[2]._id;

        const actualReport = actual[0];

        expect(actualReport._id).to.match(/(\w+-)\w+/);
        expect(actualReport.fields.name).to.equal('Sally');
        expect(actualReport.fields.lmp).to.equal('10');
        expect(actualReport.fields.secret_code_name).to.equal('S4L');
        expect(actualReport.fields.my_self_0).to.equal(reportId);
        expect(actualReport.fields.my_child_01).to.equal(doc1_id);
        expect(actualReport.fields.my_child_02).to.equal(doc2_id);
        expect(actualReport.form).to.equal('V');
        expect(actualReport.type).to.equal('data_record');
        expect(actualReport.content_type).to.equal('xml');
        expect(actualReport.contact._id).to.equal('123');
        expect(actualReport.from).to.equal('555');
        expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        expect(actualReport.fields.doc1).to.equal(undefined);
        expect(actualReport.fields.doc2).to.equal(undefined);

        const actualThing1 = actual[1];
        expect(actualThing1._id).to.match(/(\w+-)\w+/);
        expect(actualThing1.some_property_1).to.equal('some_value_1');
        expect(actualThing1.my_self_1).to.equal(doc1_id);
        expect(actualThing1.my_parent_1).to.equal(reportId);
        expect(actualThing1.my_sibling_1).to.equal(doc2_id);

        const actualThing2 = actual[2];
        expect(actualThing2._id).to.match(/(\w+-)\w+/);
        expect(actualThing2.some_property_2).to.equal('some_value_2');
        expect(actualThing2.my_self_2).to.equal(doc2_id);
        expect(actualThing2.my_parent_2).to.equal(reportId);
        expect(actualThing2.my_sibling_2).to.equal(doc1_id);

        expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);
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
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

        expect(actual.length).to.equal(4);
        const reportId = actual[0]._id;

        const actualReport = actual[0];

        expect(actualReport._id).to.match(/(\w+-)\w+/);
        expect(actualReport.fields.name).to.equal('Sally');
        expect(actualReport.fields.lmp).to.equal('10');
        expect(actualReport.fields.secret_code_name).to.equal('S4L');
        expect(actualReport.form).to.equal('V');
        expect(actualReport.type).to.equal('data_record');
        expect(actualReport.content_type).to.equal('xml');
        expect(actualReport.contact._id).to.equal('123');
        expect(actualReport.from).to.equal('555');
        expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        for (let i=1; i<=3; ++i) {
          const repeatDocN = actual[i];
          chai.expect(repeatDocN._id).to.match(/(\w+-)\w+/);
          chai.expect(repeatDocN.my_parent).to.equal(reportId);
          chai.expect(repeatDocN.some_property).to.equal('some_value_'+i);
        }

        expect(_.uniq(_.map(actual, '_id')).length).to.equal(4);
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
        expect(AddAttachment.callCount).to.equal(2);

        expect(AddAttachment.args[0][1]).to.equal('user-file/my-form/my_file');
        expect(AddAttachment.args[0][2]).to.deep.equal({ type: 'image', foo: 'bar' });
        expect(AddAttachment.args[0][3]).to.equal('image');

        expect(AddAttachment.args[1][1]).to.equal('content');
      });
    });

    it('removes binary data from content', () => {
      form.validate.resolves(true);
      const content =
`<my-form>
  <name>Mary</name>
  <age>10</age>
  <gender>f</gender>
  <my_file type="binary">some image data</my_file>
</my-form>`;

      const expected =
`<my-form>
  <name>Mary</name>
  <age>10</age>
  <gender>f</gender>
  <my_file type="binary"/>
</my-form>`;

      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: 'my-user', phone: '8989' });
      dbBulkDocs.callsFake(docs => Promise.resolve([ { ok: true, id: docs[0]._id, rev: '1-abc' } ]));
      return service.save('my-form', form, true).then(() => {
        expect(AddAttachment.callCount).to.equal(2);

        expect(AddAttachment.args[0][1]).to.equal('user-file/my-form/my_file');
        expect(AddAttachment.args[0][2]).to.deep.equal('some image data');
        expect(AddAttachment.args[0][3]).to.equal('image/png');

        expect(AddAttachment.args[1][1]).to.equal('content');
        expect(AddAttachment.args[1][2]).to.equal(expected);
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
        expect(AddAttachment.callCount).to.equal(3);

        expect(AddAttachment.args[0][1]).to.equal('user-file/my-form-internal-id/my_file');
        expect(AddAttachment.args[0][2]).to.deep.equal({ type: 'image', foo: 'bar' });
        expect(AddAttachment.args[0][3]).to.equal('image');

        expect(AddAttachment.args[1][1])
          .to.equal('user-file/my-form-internal-id/sub_element/sub_sub_element/other_file');
        expect(AddAttachment.args[1][2]).to.deep.equal({ type: 'mytype', foo: 'baz' });
        expect(AddAttachment.args[1][3]).to.equal('mytype');

        expect(AddAttachment.args[2][1]).to.equal('content');
      });
    });
  });

});
