const chai = require('chai');
const sinon = require('sinon');

const config = require('../../src/libs/config');
const roles = require('../../src/roles');

describe('roles', () => {
  beforeEach(() => config.init({ get: sinon.stub() }));
  afterEach(() => sinon.restore());

  describe('hasOnlineRole', () => {
    it('should return false with bad params', () => {
      chai.expect(roles.hasOnlineRole()).to.equal(false);
      chai.expect(roles.hasOnlineRole(false)).to.equal(false);
      chai.expect(roles.hasOnlineRole(undefined)).to.equal(false);
      chai.expect(roles.hasOnlineRole('string')).to.equal(false);
      chai.expect(roles.hasOnlineRole({ ob: 'ject' })).to.equal(false);
      chai.expect(roles.hasOnlineRole([])).to.equal(false);
    });

    it('should return false when no online role was found', () => {
      const scenarios = [
        ['some_role'],
        ['one_role', 'district_manager', 'admin'],
        ['one_role', 'not_district_admin', 'not_admin'],
        ['not_chw', 'national_admin'],
        ['random', 'national_admin'],
        ['national_admin'],
      ];
      scenarios.forEach(userRoles => {
        const message = `hasOnlineRole failed for ${userRoles}`;
        chai.expect(roles.hasOnlineRole(userRoles)).to.equal(false, message);
      });
    });

    it('should return true when online role is found', () => {
      const scenarios = [
        ['_admin'],
        ['_admin', 'other_role'],
        ['chw', '_admin'],
        ['mm-online'],
        ['mm-online', 'other'],
        ['not-mm-online', 'mm-online'],
      ];
      scenarios.forEach(userRoles => {
        const message = `hasOnlineRole failed for ${userRoles}`;
        chai.expect(roles.hasOnlineRole(userRoles)).to.equal(true, message);
      });
    });
  });

  describe('isOnlineOnly', () => {

    it('checks for "admin" role', () => {
      chai.expect(roles.isOnlineOnly({ roles: ['_admin'] })).to.equal(true);
      chai.expect(roles.isOnlineOnly({ roles: ['_admin', 'some_role'] })).to.equal(true);
    });

    it('checks "national_admin" role', () => {
      chai.expect(roles.isOnlineOnly({ roles: ['national_admin'] })).to.equal(false);
      chai.expect(roles.isOnlineOnly({ roles: ['national_admin', 'chw'] })).to.equal(false);
    });

    it('should check for "mm-online" role', () => {
      chai.expect(roles.isOnlineOnly({ roles: ['mm-online'] })).to.equal(true);
      chai.expect(roles.isOnlineOnly({ roles: ['mm-online', 'offline'] })).to.equal(true);
    });

    it('should return false for non-admin roles', () => {
      chai.expect(roles.isOnlineOnly({ roles: ['district_admin'] })).to.equal(false);
      chai.expect(roles.isOnlineOnly({ roles: ['roleA'] })).to.equal(false);
      chai.expect(roles.isOnlineOnly({ roles: ['roleA', 'roleB'] })).to.equal(false);
      chai.expect(roles.isOnlineOnly({ roles: ['roleA', 'roleB', 'roleC'] })).to.equal(false);
      chai.expect(roles.isOnlineOnly({ roles: ['roleB', 'roleC'] })).to.equal(false);
      chai.expect(roles.isOnlineOnly({ roles: ['roleB'] })).to.equal(false);

      chai.expect(config.get.callCount).to.equal(0);
    });

  });

  describe('isOffline', () => {
    it('should return true for an empty array and for roles that are not configured', () => {
      config.get.withArgs('roles').returns({ roleA: { offline: true }, roleB: { offline: false }});
      chai.expect(roles.isOffline([])).to.equal(true);
      chai.expect(roles.isOffline(['random'])).to.equal(true);
      chai.expect(roles.isOffline(['role1', 'role2'])).to.equal(true);
    });

    it('should return true when at least one role is offline and no mm-online role', () => {
      config.get.withArgs('roles').returns({ roleA: { offline: true }, roleB: { offline: false }});
      chai.expect(roles.isOffline(['roleA'])).to.equal(true);
      chai.expect(roles.isOffline(['roleA', 'random'])).to.equal(true);
      chai.expect(roles.isOffline(['roleA', 'roleB'])).to.equal(true);
      chai.expect(roles.isOffline(['roleA', 'roleB', 'random'])).to.equal(true);
    });

    it('should return false when none of the configured roles are offline', () => {
      config.get.withArgs('roles').returns({ roleA: { offline: true }, roleB: { offline: false }});
      chai.expect(roles.isOffline(['roleB'])).to.equal(false);
      chai.expect(roles.isOffline(['roleB', 'roleC'])).to.equal(false);
    });
  });
});
