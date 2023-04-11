require('chai').should();

const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const db = require('../../../src/db');

const controller = require('../../../src/controllers/export-data');
const service = require('../../../src/services/export-data');

let set;

describe('Export Data controller', () => {
  beforeEach(() => {
    sinon.stub(serverUtils, 'error');
    sinon.stub(auth, 'check');
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'isOnlineOnly');
    set = sinon.stub().returns({ set: sinon.stub() });
  });

  afterEach(() => sinon.restore());

  describe('get', () => {

    it('Throws an error if you try to query for an unsupported export', () => {
      controller.get({req: true, params: {type: 'fake'}}, {res: true});
      serverUtils.error.callCount.should.equal(1);
      serverUtils.error.args[0][0].message.should.equal('Invalid export type "fake"');
      serverUtils.error.args[0][1].req.should.equal(true);
      serverUtils.error.args[0][2].res.should.equal(true);
    });

    it('Checks permissions', () => {
      auth.check.returns(Promise.reject({message: 'Bad permissions'}));
      auth.getUserCtx.returns(Promise.resolve({}));
      auth.isOnlineOnly.returns(true);
      return controller.get({req: true, params: {type: 'reports'}}, {res: true})
        .then(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(1);
          serverUtils.error.args[0][0].message.should.contain('Bad permissions');
          serverUtils.error.args[0][1].req.should.equal(true);
          serverUtils.error.args[0][2].res.should.equal(true);
        });
    });

    describe('corrects filter & option types', () => {
      it('corrects dates, valid true, verified false', () => {
        const req = {
          params: {
            type: 'reports'
          },
          body: {
            filters: {
              date: { from: '1525813200000', to: '1528232399999' },
              valid: 'true',
              verified: 'false'
            }
          }
        };
        const res = {
          set: set,
          flushHeaders: sinon.stub(),
          end: sinon.stub()
        };
        auth.check.resolves();
        auth.getUserCtx.returns(Promise.resolve({}));
        auth.isOnlineOnly.returns(true);
        sinon.stub(service, 'exportStream');

        return controller.get(req, res).then(() => {
          service.exportStream.callCount.should.equal(1);
          service.exportStream.args[0].should.deep.equal([
            'reports',
            {
              date: { from: 1525813200000, to: 1528232399999 },
              valid: true,
              verified: [ false ],
            },
            {
              humanReadable: false
            }
          ]);
        });
      });

      it('correct valid false, verified true', () => {
        const req = {
          params: {
            type: 'reports'
          },
          body: {
            filters: {
              valid: 'false',
              verified: 'true'
            }
          }
        };
        const res = {
          set: set,
          flushHeaders: sinon.stub(),
          end: sinon.stub()
        };
        auth.check.resolves();
        auth.getUserCtx.returns(Promise.resolve({}));
        auth.isOnlineOnly.returns(true);
        sinon.stub(service, 'exportStream');

        return controller.get(req, res).then(() => {
          service.exportStream.callCount.should.equal(1);
          service.exportStream.args[0].should.deep.equal([
            'reports',
            {
              valid: false,
              verified: [ true ],
            },
            {
              humanReadable: false
            }
          ]);
        });
      });

      it('correct verified empty', () => {
        const req = {
          params: {
            type: 'reports'
          },
          body: {
            filters: {
              verified: ''
            }
          }
        };
        const res = {
          set: set,
          flushHeaders: sinon.stub(),
          end: sinon.stub()
        };
        auth.check.resolves();
        auth.getUserCtx.returns(Promise.resolve({}));
        auth.isOnlineOnly.returns(true);
        sinon.stub(service, 'exportStream');

        return controller.get(req, res).then(() => {
          service.exportStream.callCount.should.equal(1);
          service.exportStream.args[0].should.deep.equal([
            'reports',
            {
              verified: [ null ],
            },
            {
              humanReadable: false
            }
          ]);
        });
      });

      it('correct verified array', () => {
        const req = {
          params: {
            type: 'reports'
          },
          body: {
            filters: {
              verified: [ 'true', 'false', '' ],
            }
          }
        };
        const res = {
          set: set,
          flushHeaders: sinon.stub(),
          end: sinon.stub()
        };
        auth.check.resolves();
        auth.getUserCtx.returns(Promise.resolve({}));
        auth.isOnlineOnly.returns(true);
        sinon.stub(service, 'exportStream');

        return controller.get(req, res).then(() => {
          service.exportStream.callCount.should.equal(1);
          service.exportStream.args[0].should.deep.equal([
            'reports',
            {
              verified: [ true, false, null ],
            },
            {
              humanReadable: false
            }
          ]);
        });
      });
    });

    // NB: This is actually an integration test so we can test that
    // errors from the underlying mapper are handled correctly in
    // the controller.
    it('catches error from service.exportStream', () => {
      const req = {
        params: {
          type: 'feedback'
        }
      };
      const res = {
        set: set,
        flushHeaders: sinon.stub(),
        end: sinon.stub(),
        write: sinon.stub(),
        on: sinon.stub(),
      };
      auth.check.resolves();
      auth.getUserCtx.returns(Promise.resolve({}));
      auth.isOnlineOnly.returns(true);
      sinon.stub(db.medicUsersMeta, 'allDocs').returns(Promise.reject(new Error('db not found')));

      return controller.get(req, res).then(() => {
        // defer execution to allow the stream to write first
        setTimeout(() => {
          res.write.callCount.should.equal(1);
          res.write.args[0][0].toString().should.equal('id,reported_date,user,app_version,url,info\n');
          res.end.callCount.should.equal(1);
          res.end.args[0][0].should.equal('--ERROR--\nError exporting data: db not found\n');
        });
      });
    });
  });

});
