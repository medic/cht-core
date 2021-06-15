
const expect = require('chai').expect;
const auth = require('../src/auth');

describe('CHT Script API - Auth', () => {
  describe('v1.hasPermissions()', () => {
    it('should return true when user have the permission', () => {
      const chtPermissions = {
        can_edit: [ 'chw_supervisor' ],
        can_configure: [ 'nurse' ]
      };
      const userRoles = [ 'chw_supervisor', 'gateway' ];

      const result = auth.hasPermissions('can_edit', userRoles, chtPermissions);

      expect(result).to.be.true;
    });

    it('should return false when user doesnt have the permission', () => {
      const chtPermissions = {
        can_edit: [ 'chw_supervisor' ],
        can_configure: [ 'nurse' ]
      };
      const userRoles = [ 'chw_supervisor', 'gateway' ];

      const result = auth.hasPermissions('can_configure', userRoles, chtPermissions);

      expect(result).to.be.false;
    });

    it('should return true when user is admin', () => {
      const chtPermissions = {
        can_edit: [ 'chw_supervisor' ],
        can_configure: [ 'nurse' ]
      };
      const userRoles = [ '_admin' ];

      const result = auth.hasPermissions('can_create_people', userRoles, chtPermissions);

      expect(result).to.be.true;
    });

    it('should return false when settings doesnt have roles assigned for the permission', () => {
      const chtPermissions = {
        can_edit: [ 'chw_supervisor' ],
        can_configure: null
      };
      const userRoles = [ 'chw_supervisor' ];

      const result = auth.hasPermissions('can_configure', userRoles, chtPermissions);

      expect(result).to.be.false;
    });
  });
});
