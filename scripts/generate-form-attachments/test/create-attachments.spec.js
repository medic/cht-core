const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const url = require('url');

const rpn = require('request-promise-native');

let createAttachmentsSpec;

describe('generate form attachments', () => {
  beforeEach(() => {
    createAttachmentsSpec = rewire('../src/create-attachments.js');
  });
  afterEach(() => sinon.restore());

  describe('create',  () => {
    it('should keep requesting reports until no more reports are returned with view', async () => {
      const getReportsByForm = sinon.stub();
      const createAttachments = sinon.stub();
      getReportsByForm
        .onCall(0).resolves({ nextKey: '"one"', nextKeyDocId: 'one-one', reports: ['1', '2', '3'] })
        .onCall(1).resolves({ nextKey: '"three"', nextKeyDocId: 'three-three', reports: ['3', '4', '5'] })
        .onCall(2).resolves({ nextKey: '"five"', nextKeyDocId: 'five-five', reports: ['5', '6', '7'] })
        .onCall(3).resolves({ nextKey: '"seven"', nextKeyDocId: 'seven-seven', reports: ['7', '8', '9'] })
        .onCall(4).resolves({});

      createAttachmentsSpec.__set__('getReportsByForm', getReportsByForm);
      createAttachmentsSpec.__set__('createAttachments', createAttachments);
      await createAttachmentsSpec.create('url');

      chai.expect(getReportsByForm.callCount).to.equal(5);
      chai.expect(getReportsByForm.args).to.deep.equal([
        ['url', undefined, undefined],
        ['url', '"one"', 'one-one'],
        ['url', '"three"', 'three-three'],
        ['url', '"five"', 'five-five'],
        ['url', '"seven"', 'seven-seven'],
      ]);
      chai.expect(createAttachments.callCount).to.equal(5);
      chai.expect(createAttachments.args).to.deep.equal([
        ['url', ['1', '2', '3']],
        ['url', ['3', '4', '5']],
        ['url', ['5', '6', '7']],
        ['url', ['7', '8', '9']],
        ['url', undefined],
      ]);
    });

    it('should keep requesting reports until no more reports are returned with all docs', async () => {
      const getReportsByAllDocs = sinon.stub();
      const createAttachments = sinon.stub();
      getReportsByAllDocs
        .resolves({})
        .onCall(0).resolves({ nextKey: 'one', nextKeyDocId: 'one', reports: ['1', '2', '3'] })
        .onCall(1).resolves({ nextKey: 'three', nextKeyDocId: 'three', reports: ['3', '4', '5'] })
        .onCall(2).resolves({ nextKey: 'five', nextKeyDocId: 'five', reports: ['5', '6', '7'] })
        .onCall(3).resolves({ nextKey: 'seven', nextKeyDocId: 'seven', reports: ['7', '8', '9'] })
        .onCall(4).resolves({});

      createAttachmentsSpec.__set__('getReportsByAllDocs', getReportsByAllDocs);
      createAttachmentsSpec.__set__('createAttachments', createAttachments);
      await createAttachmentsSpec.create('url', true);

      chai.expect(getReportsByAllDocs.callCount).to.equal(5);
      chai.expect(getReportsByAllDocs.args).to.deep.equal([
        ['url', undefined],
        ['url', 'one'],
        ['url', 'three'],
        ['url', 'five'],
        ['url', 'seven'],
      ]);
      chai.expect(createAttachments.callCount).to.equal(5);
      chai.expect(createAttachments.args).to.deep.equal([
        ['url', ['1', '2', '3']],
        ['url', ['3', '4', '5']],
        ['url', ['5', '6', '7']],
        ['url', ['7', '8', '9']],
        ['url', undefined],
      ]);
    });
  });

  describe('getReportsByForm', () => {
    const couchUrl = url.parse('http://admin:password@127.0.0.1/dbname');
    it('should skip startKey and startKeyDocId when not provided', async () => {
      const getReportsByForm = createAttachmentsSpec.__get__('getReportsByForm');
      sinon.stub(rpn, 'get').resolves({
        rows: [
          { id: 'report1', key: ['form1'], doc: { _id: 'report1', fields: {} } },
          { id: 'report2', key: ['form1'], doc: { _id: 'report2', fields: {} } },
          { id: 'report3', key: ['form2'], doc: { _id: 'report3', fields: {} } },
          { id: 'report4', key: ['form2'], doc: { _id: 'report4', fields: {} } },
        ]
      });
      const result = await getReportsByForm(couchUrl);
      chai.expect(result).to.deep.equal({
        nextKey: ['form2'],
        nextKeyDocId: 'report4',
        reports: [
          { _id: 'report1', fields: {} },
          { _id: 'report2', fields: {} },
          { _id: 'report3', fields: {} },
          { _id: 'report4', fields: {} },
        ]
      });

      chai.expect(rpn.get.callCount).to.equal(1);
      chai.expect(rpn.get.args[0]).to.deep.equal([{
        uri: 'http://admin:password@127.0.0.1/dbname/_design/medic-client/_view/reports_by_form',
        qs: {
          limit: 1000,
          include_docs: true,
          reduce: false,
        },
        json: true
      }]);
    });

    it('should request with provided startkey and startkeydocId', async () => {
      const getReportsByForm = createAttachmentsSpec.__get__('getReportsByForm');
      sinon.stub(rpn, 'get').resolves({
        rows: [
          { id: 'report4', key: ['form2'], doc: { _id: 'report4', fields: {} } },
          { id: 'report5', key: ['form2'], doc: { _id: 'report5', fields: {} } },
          { id: 'report6', key: ['form3'], doc: { _id: 'report6', fields: {} } },
          { id: 'report7', key: ['form4'], doc: { _id: 'report7', fields: {} } },
          { id: 'report8', key: ['form4'], doc: { _id: 'report8', fields: {} } },
        ]
      });
      const result = await getReportsByForm(couchUrl, ['form2'], 'report4');
      chai.expect(result).to.deep.equal({
        nextKey: ['form4'],
        nextKeyDocId: 'report8',
        reports: [
          { _id: 'report4', fields: {} },
          { _id: 'report5', fields: {} },
          { _id: 'report6', fields: {} },
          { _id: 'report7', fields: {} },
          { _id: 'report8', fields: {} },
        ]
      });

      chai.expect(rpn.get.callCount).to.equal(1);
      chai.expect(rpn.get.args[0]).to.deep.equal([{
        uri: 'http://admin:password@127.0.0.1/dbname/_design/medic-client/_view/reports_by_form',
        qs: {
          limit: 1000,
          include_docs: true,
          reduce: false,
          start_key: '["form2"]',
          start_key_doc_id: 'report4',
        },
        json: true
      }]);
    });
  });

  describe('getReportsByAllDocs', () => {
    const couchUrl = url.parse('http://admin:pass@127.0.0.1/dbname');
    it('should request with provided start key when empty', async () => {
      const getReportsByAllDocs = createAttachmentsSpec.__get__('getReportsByAllDocs');
      sinon.stub(rpn, 'get').resolves({
        rows: [
          { id: 'report1', key: 'report1', doc: { _id: 'report1', fields: {} } },
          { id: 'report2', key: 'report2', doc: { _id: 'report2', fields: {} } },
          { id: 'report3', key: 'report3', doc: { _id: 'report3', fields: {} } },
          { id: 'report4', key: 'report4', doc: { _id: 'report4', fields: {} } },
        ]
      });
      const result = await getReportsByAllDocs(couchUrl);
      chai.expect(result).to.deep.equal({
        nextKey: 'report4',
        nextKeyDocId: 'report4',
        reports: [
          { _id: 'report1', fields: {} },
          { _id: 'report2', fields: {} },
          { _id: 'report3', fields: {} },
          { _id: 'report4', fields: {} },
        ]
      });

      chai.expect(rpn.get.callCount).to.equal(1);
      chai.expect(rpn.get.args[0]).to.deep.equal([{
        uri: 'http://admin:pass@127.0.0.1/dbname/_all_docs',
        qs: {
          limit: 1000,
          include_docs: true,
          start_key: '""'
        },
        json: true
      }]);
    });

    it('should request with provided start key when not empty', async () => {
      const getReportsByAllDocs = createAttachmentsSpec.__get__('getReportsByAllDocs');
      sinon.stub(rpn, 'get').resolves({
        rows: [
          { id: 'report4', key: 'report4', doc: { _id: 'report4', fields: {} } },
          { id: 'report5', key: 'report5', doc: { _id: 'report5', fields: {} } },
          { id: 'report6', key: 'report6', doc: { _id: 'report6', fields: {} } },
          { id: 'report7', key: 'report7', doc: { _id: 'report7', fields: {} } },
        ]
      });
      const result = await getReportsByAllDocs(couchUrl, 'report4');
      chai.expect(result).to.deep.equal({
        nextKey: 'report7',
        nextKeyDocId: 'report7',
        reports: [
          { _id: 'report4', fields: {} },
          { _id: 'report5', fields: {} },
          { _id: 'report6', fields: {} },
          { _id: 'report7', fields: {} },
        ]
      });

      chai.expect(rpn.get.callCount).to.equal(1);
      chai.expect(rpn.get.args[0]).to.deep.equal([{
        uri: 'http://admin:pass@127.0.0.1/dbname/_all_docs',
        qs: {
          limit: 1000,
          include_docs: true,
          start_key: '"report4"'
        },
        json: true
      }]);
    });
  });

  describe('createAttachments', () => {
    const couchUrl = url.parse('http://admin:password@127.0.0.1/dbname');

    const getCompactXml = xml => {
      return xml
        .split('\n')
        .map(line => line.trim())
        .join('');
    };

    it('should do nothing when no reports passed', async () => {
      const createAttachments = createAttachmentsSpec.__get__('createAttachments');
      await createAttachments(couchUrl);
    });

    it('should do nothing when no reports passed', async () => {
      const createAttachments = createAttachmentsSpec.__get__('createAttachments');
      await createAttachments(couchUrl, []);
    });

    it('should skip reports that are xml reports', async () => {
      const createAttachments = createAttachmentsSpec.__get__('createAttachments');
      const reports = [
        { _id: 'report1' },
        { _id: 'report1', content_type: 'not_xml' },
        { _id: 'report1', type: 'other' },
        undefined,
        { _id: 'report1', type: 'data_record' },
        { _id: 'report1', type: 'data_record', form: 'form', content_type: 'not_xml' },
      ];
      await createAttachments(couchUrl, reports);
    });

    it('should skip reports that already have a "content" attachment', async () => {
      const createAttachments = createAttachmentsSpec.__get__('createAttachments');
      const reports = [
        { _id: 'report1', type: 'data_record', form: 'form', content_type: 'xml', _attachments: { content: {} }},
        { _id: 'report2', type: 'data_record', form: 'form', content_type: 'xml', _attachments: { content: {} }},
      ];
      await createAttachments(couchUrl, reports);
    });

    it('should create attachments for "simple" docs', async () => {
      const createAttachments = createAttachmentsSpec.__get__('createAttachments');
      sinon.stub(rpn, 'post').resolves([]);

      const reports = [
        {
          _id: 'report1',
          type: 'data_record',
          content_type: 'xml',
          form: 'pregnancy',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: '12345',
            patient_uuid: 'patient_uuid',
            lmp_date: '28-01-2020',
            weeks_pregnant: 10,
            patient_name: 'person'
          },
          hidden_fields: [],
        },
        {
          _id: 'report2',
          type: 'data_record',
          content_type: 'xml',
          form: 'home_visit',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: '999999',
            patient_uuid: 'the_uuid',
            visited_patient_uuid: 'hh_uuid',
            visited_date: '16-04-2020'
          },
          hidden_fields: [],
        },
      ];

      const xmlReport1 = `
      <pregnancy xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="pregnancy">
        <patient_id>12345</patient_id>
        <patient_uuid>patient_uuid</patient_uuid>
        <lmp_date>28-01-2020</lmp_date>
        <weeks_pregnant>10</weeks_pregnant>
        <patient_name>person</patient_name>
      </pregnancy>
      `;
      const xmlReport2 = `
      <home_visit xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="home_visit">
        <patient_id>999999</patient_id>
        <patient_uuid>the_uuid</patient_uuid>
        <visited_patient_uuid>hh_uuid</visited_patient_uuid>
        <visited_date>16-04-2020</visited_date>
      </home_visit>
      `;

      await createAttachments(couchUrl, reports);

      chai.expect(rpn.post.callCount).to.equal(1);
      chai.expect(rpn.post.args[0]).to.deep.equal([{
        uri: 'http://admin:password@127.0.0.1/dbname/_bulk_docs',
        json: true,
        body: {
          docs: [
            {
              _id: 'report1',
              type: 'data_record',
              content_type: 'xml',
              form: 'pregnancy',
              contact: { _id: 'contact_id' },
              fields: {
                patient_id: '12345',
                patient_uuid: 'patient_uuid',
                lmp_date: '28-01-2020',
                weeks_pregnant: 10,
                patient_name: 'person'
              },
              hidden_fields: [],
              _attachments: {
                content: {
                  content_type: 'application/xml',
                  data: new Buffer.from(getCompactXml(xmlReport1)).toString('base64'),
                }
              },
            },
            {
              _id: 'report2',
              type: 'data_record',
              content_type: 'xml',
              form: 'home_visit',
              contact: { _id: 'contact_id' },
              fields: {
                patient_id: '999999',
                patient_uuid: 'the_uuid',
                visited_patient_uuid: 'hh_uuid',
                visited_date: '16-04-2020'
              },
              hidden_fields: [],
              _attachments: {
                content: {
                  content_type: 'application/xml',
                  data: new Buffer.from(getCompactXml(xmlReport2)).toString('base64'),
                }
              },
            },
          ],
        },
      }]);
    });

    it('should support "array" fields', async () => {
      const createAttachments = createAttachmentsSpec.__get__('createAttachments');
      sinon.stub(rpn, 'post').resolves([]);

      const reports = [
        {
          _id: 'report1',
          type: 'data_record',
          content_type: 'xml',
          form: 'delivery',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: '12345',
            patient_uuid: 'patient_uuid',
            children: {
              child: [
                {
                  name: 'maria',
                  sex: 'female'
                },
                {
                  name: 'george',
                  sex: 'male'
                },
              ]
            },
          },
          hidden_fields: [
            'children.child.name'
          ],
        },
      ];

      const xmlReport = `
      <delivery xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="delivery">
        <patient_id>12345</patient_id>
        <patient_uuid>patient_uuid</patient_uuid>
        <children>
          <child>
            <name tag="hidden">maria</name>
            <sex>female</sex>
          </child>
          <child>
            <name tag="hidden">george</name>
            <sex>male</sex>
          </child>
        </children>
      </delivery>
      `;

      await createAttachments(couchUrl, reports);

      chai.expect(rpn.post.callCount).to.equal(1);
      chai.expect(rpn.post.args[0]).to.deep.equal([{
        uri: 'http://admin:password@127.0.0.1/dbname/_bulk_docs',
        json: true,
        body: {
          docs: [
            {
              _id: 'report1',
              type: 'data_record',
              content_type: 'xml',
              form: 'delivery',
              contact: { _id: 'contact_id' },
              fields: {
                patient_id: '12345',
                patient_uuid: 'patient_uuid',
                children: {
                  child: [
                    {
                      name: 'maria',
                      sex: 'female'
                    },
                    {
                      name: 'george',
                      sex: 'male'
                    },
                  ]
                },
              },
              hidden_fields: [
                'children.child.name'
              ],
              _attachments: {
                content: {
                  content_type: 'application/xml',
                  data: new Buffer.from(getCompactXml(xmlReport)).toString('base64'),
                }
              },
            },
          ],
        },
      }]);
    });

    it('should create attachments for complex reports', async () => {
      const createAttachments = createAttachmentsSpec.__get__('createAttachments');
      sinon.stub(rpn, 'post').resolves([]);

      const reports = [
        {
          _id: 'report1',
          type: 'data_record',
          content_type: 'xml',
          form: 'delivery',
          contact: { _id: 'contact_id' },
          fields: {
            inputs: {
              source: 'user',
              contact: {
                _id: 'contact_id',
                name: 'chw',
                parent: {
                  _id: 'parent_id',
                }
              }
            },
            household_id: '123',
            area_id: '456',
            facility_id: '789',
            patient_age_in_years: 23,
            patient_id: '12345',
            patient_uuid: 'patient_uuid',
            patient_name: 'person',
            condition: {
              woman_outcome: 'no'
            },
            death_info_woman: {
              woman_death_date: 'no',
              death_report: {
                form: 'death_report',
                type: 'data_record',
                content_type: 'xml',
                fields: {
                  patient_id: '12345',
                  patient_uuid: 'patient_uuid',
                  death_details: {
                    date_of_death: '2020-12-02',
                    place_of_death: 'home',
                  }
                }
              }
            },
            woman_death_report_doc: 'yes',
            delivery_outcome: {
              babies_delivered: 2,
              babies_alive: 2,
              delivery_mode: 'surgical',
            },
            baby_death: {
              baby_death_repeat_count: 0,
            },
            babys_condition: {
            },
            meta: {
              instanceID: 'instance_id'
            }
          },
          hidden_fields: [
            'inputs',
            'meta',
            'death_info_woman.death_report.fields',
          ],
        },
      ];

      const xmlReport = `
      <delivery xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="delivery">
        <inputs tag="hidden">
          <source>user</source>
          <contact>
            <_id>contact_id</_id>
            <name>chw</name>
            <parent>
              <_id>parent_id</_id>
            </parent>
          </contact>
        </inputs>
        <household_id>123</household_id>
        <area_id>456</area_id>
        <facility_id>789</facility_id>
        <patient_age_in_years>23</patient_age_in_years>
        <patient_id>12345</patient_id>
        <patient_uuid>patient_uuid</patient_uuid>
        <patient_name>person</patient_name>
        <condition>
          <woman_outcome>no</woman_outcome>
        </condition>
        <death_info_woman>
          <woman_death_date>no</woman_death_date>
          <death_report>
            <form>death_report</form>
            <type>data_record</type>
            <content_type>xml</content_type>
            <fields tag="hidden">
              <patient_id>12345</patient_id>
              <patient_uuid>patient_uuid</patient_uuid>
              <death_details>
                <date_of_death>2020-12-02</date_of_death>
                <place_of_death>home</place_of_death>
              </death_details>
            </fields>
          </death_report>
        </death_info_woman>
        <woman_death_report_doc>yes</woman_death_report_doc>
        <delivery_outcome>
          <babies_delivered>2</babies_delivered>
          <babies_alive>2</babies_alive>
          <delivery_mode>surgical</delivery_mode>
        </delivery_outcome>
        <baby_death>
          <baby_death_repeat_count>0</baby_death_repeat_count>
        </baby_death>
        <babys_condition/>
        <meta tag="hidden">
          <instanceID>instance_id</instanceID>
        </meta>   
      </delivery>
      `;

      await createAttachments(couchUrl, reports);

      chai.expect(rpn.post.callCount).to.equal(1);
      chai.expect(rpn.post.args[0]).to.deep.equal([{
        uri: 'http://admin:password@127.0.0.1/dbname/_bulk_docs',
        json: true,
        body: {
          docs: [
            {
              _id: 'report1',
              type: 'data_record',
              content_type: 'xml',
              form: 'delivery',
              contact: { _id: 'contact_id' },
              fields: {
                inputs: {
                  source: 'user',
                  contact: {
                    _id: 'contact_id',
                    name: 'chw',
                    parent: {
                      _id: 'parent_id',
                    }
                  }
                },
                household_id: '123',
                area_id: '456',
                facility_id: '789',
                patient_age_in_years: 23,
                patient_id: '12345',
                patient_uuid: 'patient_uuid',
                patient_name: 'person',
                condition: {
                  woman_outcome: 'no'
                },
                death_info_woman: {
                  woman_death_date: 'no',
                  death_report: {
                    form: 'death_report',
                    type: 'data_record',
                    content_type: 'xml',
                    fields: {
                      patient_id: '12345',
                      patient_uuid: 'patient_uuid',
                      death_details: {
                        date_of_death: '2020-12-02',
                        place_of_death: 'home',
                      }
                    }
                  }
                },
                woman_death_report_doc: 'yes',
                delivery_outcome: {
                  babies_delivered: 2,
                  babies_alive: 2,
                  delivery_mode: 'surgical',
                },
                baby_death: {
                  baby_death_repeat_count: 0,
                },
                babys_condition: {
                },
                meta: {
                  instanceID: 'instance_id'
                }
              },
              hidden_fields: [
                'inputs',
                'meta',
                'death_info_woman.death_report.fields',
              ],
              _attachments: {
                content: {
                  content_type: 'application/xml',
                  data: new Buffer.from(getCompactXml(xmlReport)).toString('base64'),
                }
              },
            },
          ],
        },
      }]);
    });
  });
});
