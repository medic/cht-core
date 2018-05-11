const service = require('../../../src/services/authorization'),
      db = require('../../../src/db-pouch'),
      sinon = require('sinon').sandbox.create(),
      config = require('../../../src/config'),
      auth = require('../../../src/auth');

require('chai').should();
const userCtx = { name: 'user', contact_id: 'contact_id', facility_id: 'facility_id' };
let contact,
    report,
    userInfo,
    viewResults;

describe('Authorization service', () => {
  afterEach(function() {
    sinon.restore();
  });

  beforeEach(() => {
    sinon.stub(config, 'get');
    sinon.stub(auth, 'hasAllPermissions');
    sinon.stub(service._tombstoneUtils, 'extractDocId').callsFake(t => t.replace('tombstone', 'deleted'));
    sinon.stub(service._viewMapUtils, 'getViewMapFn').returns(sinon.stub());
    db.medic = { query: sinon.stub().resolves({ rows: [] }) };
  });

  describe('getDepth', () => {
    it('unlimited depth for no roles', () => {
      service.getDepth({}).should.equal(-1);
      service.getDepth({ name : 'a'}).should.equal(-1);
      service.getDepth({ roles: []}).should.equal(-1);
    });

    it('unlimited depth when no settings found', () => {
      config.get.returns(false);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);
    });

    it('unlimited depth when no settings for role is found, or settings depth is incorrect', () => {
      config.get.returns([ { role: 'role' }, { role: 'alpha' } ]);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);

      config.get.returns([ { role: 'some_role' } ]);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);

      config.get.returns([ { role: 'some_role', depth: 'aaa' } ]);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);
    });

    it('returns biggest value', () => {
      const settings = [
        { role: 'a', depth: 1 },
        { role: 'b', depth: 2 },
        { role: 'c', depth: 3 },
        { role: 'd', depth: 4 }
      ];

      config.get.returns(settings);
      service.getDepth({ roles: ['a', 'b', 'd'] }).should.equal(4);
    });
  });

  describe('getSubjectIds', () => {
    beforeEach(() => {
      sinon.stub(service, 'getDepth');
    });

    it('queries correct views with correct keys when depth is not infinite', () => {
      service.getDepth.returns(2);
      return service
        .getSubjectIds({ facility_id: 'facilityId' })
        .then(() => {
          db.medic.query.callCount.should.equal(2);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');
          db.medic.query.args[1][0].should.equal('medic-tombstone/contacts_by_depth');

          db.medic.query.args[0][1].should.deep.equal({
            keys: [[ 'facilityId', 0 ], [ 'facilityId', 1 ], [ 'facilityId', 2 ]]
          });
          db.medic.query.args[1][1].should.deep.equal({
            keys: [[ 'facilityId', 0 ], [ 'facilityId', 1 ], [ 'facilityId', 2 ]]
          });
        });
    });

    it('queries with correct keys when depth is infinite', () => {
      service.getDepth.returns(-1);
      return service
        .getSubjectIds({ facility_id: 'facilityId' })
        .then(() => {
          db.medic.query.callCount.should.equal(2);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');
          db.medic.query.args[1][0].should.equal('medic-tombstone/contacts_by_depth');

          db.medic.query.args[0][1].should.deep.equal({ keys: [[ 'facilityId' ]] });
          db.medic.query.args[1][1].should.deep.equal({ keys: [[ 'facilityId' ]] });
        });
    });

    it('extracts original docId from tombstone ID, pushes ids and values to subject list', () => {
      auth.hasAllPermissions.returns(false);
      config.get.returns(false);
      service.getDepth.returns(-1);
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [
          { id: 1, key: 'key', value: 's1' },
          { id: 2, key: 'key', value: 's2' },
        ]
      });
      db.medic.query.withArgs('medic-tombstone/contacts_by_depth').resolves({
        rows: [
          { id: 'tombstone-1', key: 'key', value: 's3' },
          { id: 'tombstone-2', key: 'key', value: 's4' },
          { id: 'tombstone-3', key: 'key', value: 's5' },
        ]
      });
      return service
        .getSubjectIds({ facility_id: 'facility_id' })
        .then(result => {
          service._tombstoneUtils.extractDocId.callCount.should.equal(3);
          service._tombstoneUtils.extractDocId.args.should.deep.equal([
            ['tombstone-1'], ['tombstone-2'], ['tombstone-3']
          ]);
          result.sort().should.deep.equal([
            1, 2, 'deleted-1', 'deleted-2', 'deleted-3', '_all',
            's1', 's2', 's3', 's4', 's5'
          ].sort());
        });
    });

    it('adds unassigned key if the user has required permissions', () => {
      auth.hasAllPermissions.returns(true);
      config.get.returns(true);

      return service
        .getSubjectIds({ facility_id: 'aaa' })
        .then(result => {
          result.should.deep.equal(['_all', '_unassigned']);
        });
    });
  });
  
  describe('getValidatedDocIds', () => {
    it('queries correct views with correct keys', () => {
      const subjectIds = [1, 2, 3];
      return service
        .getValidatedDocIds(subjectIds, { name: 'user' })
        .then(() => {
          db.medic.query.callCount.should.equal(2);
          db.medic.query.args[0].should.deep.equal([ 'medic/docs_by_replication_key', { keys: subjectIds } ]);
          db.medic.query.args[1].should.deep.equal([ 'medic-tombstone/docs_by_replication_key', { keys: subjectIds } ]);
        });
    });

    it('comprises the list of IDs from both view results, except for sensitive ones, includes ddoc and user doc', () => {
      const subjectIds = [ 'sbj1', 'sbj2', 'sbj3', 'sbj4', 'facility_id', 'contact_id', 'c1', 'c2', 'c3', 'c4' ];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows: [
            { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
            { id: 'r2', key: 'sbj3', value: { } },
            { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
            { id: 'r4', key: null, value: { submitter: 'c2' } },
            { id: 'r5', key: 'facility_id', value: {} },
            { id: 'r6', key: 'contact_id', value: {} },
            { id: 'r7', key: 'facility_id', value: { submitter: 'c-unknown' } }, //sensitive
            { id: 'r8', key: 'contact_id', value: { submitter: 'c-unknown' } }, //sensitive
            { id: 'r9', key: 'facility_id', value: { submitter: 'c3' } },
            { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } }
          ]});
      db.medic.query
        .withArgs('medic-tombstone/docs_by_replication_key')
        .resolves({ rows: [
            { id: 'r11', key: 'sbj3', value: { } },
            { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
            { id: 'r13', key: false, value: { submitter: 'someone else' } }
          ]});

      return service
        .getValidatedDocIds(subjectIds, { name: 'user', facility_id: 'facility_id', contact_id: 'contact_id' })
        .then(result => {
          result.length.should.equal(13);
          result.should.deep.equal([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2', 'r3', 'r4',
            'r5', 'r6', 'r9', 'r10',
            'r11', 'r12', 'r13'
          ]);
        });
    });
  });

  describe('getViewResults', () => {
    it('initializes view map functions if needed and returns view results', () => {
      const contactsByDepthStub = sinon.stub().returns('contactsByDepthStubResult');
      const docsByReplicationKeyStub = sinon.stub().returns('docsByReplicationKeyStubResult');
      const doc = { _id: 1, _rev: 1 };
      service._viewMapUtils.getViewMapFn
        .withArgs('contacts_by_depth', true)
        .returns(contactsByDepthStub);
      service._viewMapUtils.getViewMapFn
        .withArgs('docs_by_replication_key')
        .returns(docsByReplicationKeyStub);

      config.get.returns('config');
      const result = service.getViewResults(doc);
      service._viewMapUtils.getViewMapFn.callCount.should.equal(2);
      docsByReplicationKeyStub.callCount.should.equal(1);
      docsByReplicationKeyStub.args[0][0].should.deep.equal(doc);
      contactsByDepthStub.callCount.should.equal(1);
      contactsByDepthStub.args[0][0].should.deep.equal(doc);
      result.should.deep.equal({
        replicationKey: 'docsByReplicationKeyStubResult',
        contactsByDepth: 'contactsByDepthStubResult'
      });
    });

    describe('allowedDoc', () => {
      it('returns false when document does not generate a replication key', () => {
        service.allowedDoc({}, {}, { replicationKey: null, contactsByDepth: null }).should.equal(false);
      });

      it('returns true for `allowed for all` docs', () => {
        service.allowedDoc({}, {}, { replicationKey: ['_all', {}], contactsByDepth: null }).should.equal(true);
      });

      describe('allowedContact', () => {
        beforeEach(() => {
          viewResults = { replicationKey: ['a', {}], contactsByDepth: [['parent1'], 'patient_id'] };
          userInfo = { userCtx, depth: -1 };
        });

        it('returns true for valid contacts', () => {
          contact = { _id: 'contact', patient_id: 'patient_id', parent: { _id: 'parent1', parent: { _id: userCtx.facility_id }}};
          viewResults.contactsByDepth = [
            [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
            [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
            [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 2], 'patient_id']
          ];
          service.allowedDoc(contact, userInfo, viewResults).should.equal(true);

          contact = { _id: userCtx.facility_id };
          viewResults.contactsByDepth = [
            [[userCtx.facility_id], null], [[userCtx.facility_id, 0], null]
          ];
          service.allowedDoc(contact, userInfo, viewResults).should.equal(true);

          contact = { _id: 'contact', patient_id: 'patient_id', parent: { _id: userCtx.facility_id } };
          viewResults.contactsByDepth = [
            [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
            [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 1], 'patient_id']
          ];
          service.allowedDoc(contact, userInfo, viewResults).should.equal(true);

          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2', parent: { _id: userCtx.facility_id }}}};
          viewResults.contactsByDepth = [
            [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
            [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
            [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id'],
            [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 3], 'patient_id']
          ];
          service.allowedDoc(contact, userInfo, viewResults).should.equal(true);
        });

        it('returns false for invalid contacts', () => {
          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2' }}};
          service.allowedDoc(contact, userInfo, viewResults).should.equal(false);
          contact = { _id: 'contact' };
          service.allowedDoc(contact, userInfo, viewResults).should.equal(false);
          contact = { _id: 'contact', parent: { _id: 'parent1' } };
          service.allowedDoc(contact, userInfo, viewResults).should.equal(false);
          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2', parent: { _id: 'parent3' }}}};
          service.allowedDoc(contact, userInfo, viewResults).should.equal(false);
        });

        it('respects depth', () => {
          contact = { _id: userCtx.facility_id, parent: { _id: 'parent1' }, patient_id: 'patient_id'};
          viewResults.contactsByDepth = [
            [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 0], 'patient_id'],
            [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id']
          ];
          service.allowedDoc(contact, { userCtx, depth: -1 }, viewResults).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, viewResults).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 1 }, viewResults).should.equal(true);

          contact = { _id: 'contact_id', parent: { _id: userCtx.facility_id, parent: { _id: 'parent1' }}};
          viewResults.contactsByDepth = [
            [['contact_id'], 'patient_id'], [['contact_id', 0], 'patient_id'],
            [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 1], 'patient_id'],
            [['parent1'], 'patient_id'], [['parent1', 2], 'patient_id']
          ];
          service.allowedDoc(contact, { userCtx, depth: -1 }, viewResults).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, viewResults).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 1 }, viewResults).should.equal(true);

          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: userCtx.facility_id }}};
          viewResults.contactsByDepth = [
            [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
            [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
            [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 2], 'patient_id'],
          ];
          service.allowedDoc(contact, { userCtx, depth: -1 }, viewResults).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, viewResults).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 1 }, viewResults).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 2 }, viewResults).should.equal(true);

          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2', parent: { _id: userCtx.facility_id }}}};
          viewResults.contactsByDepth = [
            [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
            [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
            [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id'],
            [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 3], 'patient_id'],
          ];
          service.allowedDoc(contact, { userCtx, depth: -1 }, viewResults).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, viewResults).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 1 }, viewResults).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 2 }, viewResults).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 3 }, viewResults).should.equal(true);
        });

        it('adds valid contact _id and reference to subjects list, while keeping them unique', () => {
          userInfo.subjectIds = [];
          userInfo.validatedIds = [];
          contact = { _id: 'new_contact_id', patient_id: 'new_patient_id', parent: { _id: userCtx.facility_id }};
          viewResults = {
            replicationKey: ['a', {}],
            contactsByDepth: [
              [['new_contact_id'], 'new_patient_id'], [['new_contact_id', 0], 'new_patient_id'],
              [[userCtx.facility_id], 'new_patient_id'], [[userCtx.facility_id, 1], 'new_patient_id']
            ]};

          service.allowedDoc(contact, userInfo, viewResults).should.equal(true);
          userInfo.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);

          service.allowedDoc(contact, userInfo, viewResults).should.equal(true);
          userInfo.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);

          contact = { id: 'second_new_contact_id', patient_id: 'second_patient_id', parent: { _id: 'parent1' }};
          viewResults = {
            replicationKey: ['a', {}],
            contactsByDepth: [
              [['second_new_contact_id'], 'second_patient_id'], [['second_new_contact_id', 0], 'second_patient_id'],
              [['parent1'], 'second_patient_id'], [['parent1', 1], 'second_patient_id']
            ]};
          service.allowedDoc(contact, userInfo, viewResults).should.equal(false);
          userInfo.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
        });

        it('removes invalid contact _id and reference from subjects list', () => {
          userInfo.subjectIds = ['person_id', 'person_id', 'contact_id', 'person_ref', 'contact_id', 'person_ref', 's'];

          contact = { _id: 'person_id', patient_id: 'person_ref', parent: { _id: 'parent1' }};
          viewResults = {
            replicationKey: ['a', {}],
            contactsByDepth: [
              [['person_id'], 'person_ref'], [['person_id', 0], 'person_ref'],
              [['parent1'], 'person_ref'], [['parent1', 1], 'person_ref']
            ]};

          service.allowedDoc(contact, userInfo, viewResults).should.equal(false);
          userInfo.subjectIds.should.deep.equal(['contact_id', 'contact_id', 's']);
        });
      });

      describe('allowedReport', () => {
        beforeEach(() => {
          userInfo = { userCtx, depth: -1, subjectIds: [], validatedIds: [] };
          report = { _id: 'report' };
        });

        it('returns true for reports with allowed subjects', () => {
          userInfo.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
          viewResults = { replicationKey: ['subject', { submitter: 'submitter' }], contactsByDepth: false };
          service.allowedDoc(report, userInfo, viewResults).should.equal(true);
        });

      });
    });
  });
});

