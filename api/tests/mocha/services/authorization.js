const service = require('../../../src/services/authorization');
//const db = require('../../../src/db-pouch');
const sinon = require('sinon').sandbox.create();
//const fs = require('fs');
//const path = require('path');
require('chai').should();
const config = require('../../../src/config');

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

    it('returns role with deepest depth', () => {
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


});

