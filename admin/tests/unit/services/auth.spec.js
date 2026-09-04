describe('Auth service', function() {

  'use strict';

  let service;
  let userCtx;
  let isOnlineOnly;
  let hasPermissions;
  let hasAnyPermission;
  let dataContext;

  beforeEach(function () {
    module('adminApp');
    userCtx = sinon.stub();
    isOnlineOnly = sinon.stub();
    hasPermissions = sinon.stub();
    hasAnyPermission = sinon.stub();

    const datasource = { v1: { hasPermissions, hasAnyPermission } };
    dataContext = { getDatasource: () => datasource };

    module(function ($provide) {
      $provide.factory('Session', function() {
        return { userCtx: userCtx, isOnlineOnly: isOnlineOnly };
      });
      $provide.value('DataContext', Promise.resolve(dataContext));
    });
    inject(function($injector) {
      service = $injector.get('Auth');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(userCtx);
  });

  describe('has', () => {
    it('delegates to datasource.v1.hasPermissions and returns its result', async () => {
      userCtx.returns({ roles: ['chw_supervisor'] });
      hasPermissions.returns(true);

      const result = await service.has('can_edit');

      chai.expect(result).to.be.true;
      chai.expect(hasPermissions.calledOnceWithExactly('can_edit', ['chw_supervisor'])).to.be.true;
    });

    it('returns false when hasPermissions returns false', async () => {
      userCtx.returns({ roles: ['chw'] });
      hasPermissions.returns(false);

      const result = await service.has('can_edit');

      chai.expect(result).to.be.false;
    });

    it('returns false when no session, without consulting the datasource', async () => {
      userCtx.returns(null);

      const result = await service.has('can_edit');

      chai.expect(result).to.be.false;
      chai.expect(hasPermissions.notCalled).to.be.true;
    });

    it('returns false when hasPermissions throws', async () => {
      userCtx.returns({ roles: ['chw'] });
      hasPermissions.throws(new Error('boom'));

      const result = await service.has('can_edit');

      chai.expect(result).to.be.false;
    });

    it('returns false when getDatasource throws', async () => {
      userCtx.returns({ roles: ['chw'] });
      dataContext.getDatasource = () => {
        throw new Error('boom');
      };

      const result = await service.has('can_edit');

      chai.expect(result).to.be.false;
    });
  });

  describe('any', () => {
    it('delegates to datasource.v1.hasAnyPermission and returns its result', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      hasAnyPermission.returns(true);
      const groups = [['can_backup_facilities'], ['can_export_messages']];

      const result = await service.any(groups);

      chai.expect(result).to.be.true;
      chai.expect(hasAnyPermission.calledOnceWithExactly(groups, ['district_admin'])).to.be.true;
    });

    it('returns false when hasAnyPermission returns false', async () => {
      userCtx.returns({ roles: ['chw'] });
      hasAnyPermission.returns(false);

      const result = await service.any([['can_edit']]);

      chai.expect(result).to.be.false;
    });

    it('falls through to has() when the argument is not an array', async () => {
      userCtx.returns({ roles: ['chw_supervisor'] });
      hasPermissions.returns(true);

      const result = await service.any('can_edit');

      chai.expect(result).to.be.true;
      chai.expect(hasPermissions.calledOnceWithExactly('can_edit', ['chw_supervisor'])).to.be.true;
      chai.expect(hasAnyPermission.notCalled).to.be.true;
    });

    it('returns false when no session, without consulting the datasource', async () => {
      userCtx.returns(null);

      const result = await service.any([['can_edit']]);

      chai.expect(result).to.be.false;
      chai.expect(hasAnyPermission.notCalled).to.be.true;
    });

    it('returns false when getDatasource throws', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      dataContext.getDatasource = () => {
        throw new Error('boom');
      };

      const result = await service.any([['can_backup_facilities']]);

      chai.expect(result).to.be.false;
    });
  });

  describe('online', () => {
    it('false when no session', () => {
      userCtx.returns(null);
      const result = service.online(true);
      chai.expect(result).to.be.false;
      chai.expect(isOnlineOnly.callCount).to.equal(0);
    });

    it('true when requesting online and user is online', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(true);

      const result = service.online(true);
      chai.expect(result).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('true when requesting offline and user is offline', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(false);

      const result = service.online(false);
      chai.expect(result).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('false when requesting online and user is offline', () => {
      userCtx.returns({ roles: ['a', 'b'] });
      isOnlineOnly.returns(false);

      const result = service.online(true);
      chai.expect(result).to.be.false;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('false when requesting offline and user is online', () => {
      userCtx.returns({ roles: ['a', 'b'] });
      isOnlineOnly.returns(true);

      const result = service.online(false);
      chai.expect(result).to.be.false;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('accept any kind of truthy input', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(true);

      chai.expect(service.online('yes')).to.be.true;
      chai.expect(service.online('true')).to.be.true;
      chai.expect(service.online(['something'])).to.be.true;
      chai.expect(service.online({ foo: 'bar' })).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(4);
    });

    it('accept any kind of input falsey input', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(false);

      chai.expect(service.online()).to.be.true;
      chai.expect(service.online(undefined)).to.be.true;
      chai.expect(service.online(null)).to.be.true;
      chai.expect(service.online(0)).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(4);
    });
  });
});
