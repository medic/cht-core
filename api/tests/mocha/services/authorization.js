const service = require('../../../src/services/authorization'),
      db = require('../../../src/db-pouch'),
      sinon = require('sinon').sandbox.create(),
      config = require('../../../src/config'),
      auth = require('../../../src/auth');

require('chai').should();


describe('Authorization service', () => {
  afterEach(function() {
    sinon.restore();
  });

  describe('getDepth', () => {
    beforeEach(() => {
      sinon.stub(config, 'get');
    });

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
      sinon.stub(auth, 'hasAllPermissions');
      sinon.stub(config, 'get');
      sinon.stub(service._tombstoneUtils, 'extractDocId').returnsArg(0);
      db.medic = { query: sinon.stub().resolves({ rows: [] }) };
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

    it('extracts original docId from tombstone ID', () => {
      service.getDepth.returns(-1);
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [
          { id: 1, key: 'key', value: 's1' },
          { id: 2, key: 'key', value: 's2' },
        ]
      });
      db.medic.query.withArgs('medic-tombstone/contacts_by_depth').resolves({
        rows: [
          { id: 't1', key: 'key', value: 's3' },
          { id: 't2', key: 'key', value: 's4' },
          { id: 't3', key: 'key', value: 's5' },
        ]
      });
      return service
        .getSubjectIds({ facility_id: 'facility_id' })
        .then(() => {
          service._tombstoneUtils.extractDocId.callCount.should.equal(3);
          service._tombstoneUtils.extractDocId.args.should.deep.equal([['t1'], ['t2'], ['t3']]);
        });
    });

    it('pushes ID-s and values to subject list', () => {

    });
  });
});

