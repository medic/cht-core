const service = require('../../../src/services/authorization'),
      db = require('../../../src/db-pouch'),
      sinon = require('sinon').sandbox.create(),
      config = require('../../../src/config'),
      auth = require('../../../src/auth');

require('chai').should();
const userCtx = { name: 'user', contact_id: 'contact_id', facility_id: 'facility_id' };
let contact,
    userData,
    authData;

describe('Authorization service', () => {
  afterEach(function() {
    sinon.restore();
    service._reset();
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

  describe('initViewFunctions', () => {
    it('requests and stores required view map functions', () => {
      service._viewMapUtils.getViewMapFn.returnsArg(1);
      config.get.returns('config');
      service.initViewFunctions();
      service._viewMapUtils.getViewMapFn.callCount.should.equal(2);
      service._viewMapUtils.getViewMapFn.args[0].should.deep.equal(['config', 'contacts_by_depth']);
      service._viewMapUtils.getViewMapFn.args[1].should.deep.equal(['config', 'docs_by_replication_key']);
      config.get.callCount.should.equal(2);
      service._docsByReplicationKeyFn().should.equal('docs_by_replication_key');
      service._contactsByDepthFn().should.equal('contacts_by_depth');
    });
  });

  describe('getViewResults', () => {
    it('initializes view map functions if needed and returns view results', () => {
      const contactsByDepthStub = sinon.stub().returns('contactsByDepthStubResult');
      const docsByReplicationKeyStub = sinon.stub().returns('docsByReplicationKeyStubResult');
      const doc = { _id: 1, _rev: 1 };
      service._viewMapUtils.getViewMapFn
        .withArgs(sinon.match.any, 'contacts_by_depth')
        .returns(contactsByDepthStub);
      service._viewMapUtils.getViewMapFn
        .withArgs(sinon.match.any, 'docs_by_replication_key')
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
          authData = { replicationKey: ['a', {}], contactsByDepth: [['parent1'], 'patient_id'] };
          userData = { userCtx, depth: -1 };
        });

        it('returns true for valid contacts', () => {
          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: userCtx.facility_id }}};
          service.allowedDoc(contact, userData, authData).should.equal(true);
          contact = { _id: userCtx.facility_id };
          service.allowedDoc(contact, userData, authData).should.equal(true);
          contact = { _id: 'contact', parent: { _id: userCtx.facility_id } };
          service.allowedDoc(contact, userData, authData).should.equal(true);
          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2', parent: { _id: userCtx.facility_id }}}};
          service.allowedDoc(contact, userData, authData).should.equal(true);
        });

        it('returns false for invalid contacts', () => {
          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2' }}};
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'contact' };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'contact', parent: { _id: 'parent1' } };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2', parent: { _id: 'parent3' }}}};
          service.allowedDoc(contact, userData, authData).should.equal(false);
        });

        it('respects depth', () => {
          contact = { _id: userCtx.facility_id, parent: { _id: 'parent1' }};
          service.allowedDoc(contact, { userCtx, depth: -1 }, authData).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, authData).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 1 }, authData).should.equal(true);

          contact = { _id: 'contact_id', parent: { _id: userCtx.facility_id, parent: { _id: 'parent1' }}};
          service.allowedDoc(contact, { userCtx, depth: -1 }, authData).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, authData).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 1 }, authData).should.equal(true);

          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: userCtx.facility_id }}};
          service.allowedDoc(contact, { userCtx, depth: -1 }, authData).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, authData).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 1 }, authData).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 2 }, authData).should.equal(true);

          contact = { _id: 'contact', parent: { _id: 'parent1', parent: { _id: 'parent2', parent: { _id: userCtx.facility_id }}}};
          service.allowedDoc(contact, { userCtx, depth: -1 }, authData).should.equal(true);
          service.allowedDoc(contact, { userCtx, depth: 0 }, authData).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 1 }, authData).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 2 }, authData).should.equal(false);
          service.allowedDoc(contact, { userCtx, depth: 3 }, authData).should.equal(true);
        });

        it('does not crash on invalid lineages', () => {
          contact = { _id: false };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'id', parent: null };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'id', parent: {} };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'id', parent: { foo: 'bar' } };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'id', parent: { foo: 'bar', parent: 'string' } };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'id', parent: { foo: 'bar', parent: false } };
          service.allowedDoc(contact, userData, authData).should.equal(false);
          contact = { _id: 'id', parent: { foo: 'bar', parent: { bar: 'baz' } } };
          service.allowedDoc(contact, userData, authData).should.equal(false);
        });


      });
    });
  });
});

