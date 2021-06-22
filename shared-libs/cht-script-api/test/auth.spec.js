const expect = require('chai').expect;
const auth = require('../src/auth');

describe('CHT Script API - Auth', () => {
  describe('hasPermissions', () => {
    it('should return false when no roles and no permissions configured in CHT-Core settings', () => {
      const resultPermissionsNull = auth.hasPermissions('can_edit', [ 'chw' ], null);
      const resultPermissionsEmpty = auth.hasPermissions('can_edit', [ 'chw' ], {});
      const resultRolesNull = auth.hasPermissions('can_edit', null, { can_edit: [ 'chw' ] });
      const resultRolesEmpty = auth.hasPermissions('can_edit', null, { can_edit: [ 'chw' ] });

      expect(resultPermissionsNull).to.be.false;
      expect(resultPermissionsEmpty).to.be.false;
      expect(resultRolesNull).to.be.false;
      expect(resultRolesEmpty).to.be.false;
    });

    it('should return false when permissions parameter is empty', () => {
      const resultNoPermissions = auth.hasPermissions(null, [ 'chw' ], { can_edit: [ 'chw' ] });
      const resultEmptyString = auth.hasPermissions('', [ 'chw' ], { can_edit: [ 'chw' ] });
      const resultEmptyArray = auth.hasPermissions([], [ 'chw' ], { can_edit: [ 'chw' ] });

      expect(resultNoPermissions).to.be.false;
      expect(resultEmptyArray).to.be.false;
      expect(resultEmptyString).to.be.false;
    });

    it('should return true when user has the permission', () => {
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

    it('should return true when checking for multiple permissions spread across roles', () => {
      const chtPermissions = {
        can_access_gateway_api: [ 'gateway', 'district-admin' ],
        can_view_analytics: [ 'analytics', 'district-admin' ],
        can_view_analytics_tab: [ 'analytics', 'district-admin' ],
        can_view_contacts: [ 'chw', 'district-admin' ],
        can_write_wealth_quintiles: [ 'district-admin' ]
      };
      const userRoles = [ 'analytics', 'gateway', 'chw' ];

      const result = auth.hasPermissions(
        [ 'can_access_gateway_api', 'can_view_analytics', 'can_view_contacts' ],
        userRoles,
        chtPermissions
      );

      expect(result).to.be.true;
    });

    it('should return false for unknown permission', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
      };

      const result = auth.hasPermissions([ 'xyz' ], [ 'district_admin' ], chtPermissions);

      expect(result).to.be.false;
    });

    it('should return true for disallowed unknown permission', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
      };

      const result = auth.hasPermissions([ '!xyz' ], [ 'district_admin' ], chtPermissions);

      expect(result).to.be.true;
    });

    it('should return false when user does not have all permissions', () => {
      const userRoles = [ 'district_admin' ];
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
      };

      const result = auth.hasPermissions([ 'can_backup_facilities', 'can_export_messages' ], userRoles, chtPermissions);

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions', () => {
      const userRoles = [ 'analytics' ];
      const chtPermissions = {
        can_backup_facilities: [ 'analytics' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
      };

      const result = auth.hasPermissions([ 'can_backup_facilities', 'can_export_messages' ], userRoles, chtPermissions);

      expect(result).to.be.true;
    });

    it('should return false when user is admin and has disallowed permission', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'analytics' ],
        can_export_messages: [ 'national_admin' ]
      };

      const result = auth.hasPermissions([ '!can_backup_facilities' ], [ '_admin' ], chtPermissions);

      expect(result).to.be.false;
    });

    it('should return false when user has one of disallowed permission', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
      };

      const result = auth.hasPermissions(
        [ '!can_backup_facilities', '!can_export_messages' ],
        [ 'analytics' ],
        chtPermissions
      );

      expect(result).to.be.false;
    });

    it('should return true when user doesnt have disallowed permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
      };

      const result = auth.hasPermissions(
        [ '!can_backup_facilities', 'can_export_messages' ],
        [ 'analytics' ],
        chtPermissions
      );

      expect(result).to.be.true;
    });
  });

  describe('hasAnyPermission', () => {
    it('should return false when no roles and no permissions configured in CHT-Core settings', () => {
      const resultPermissionsNull = auth.hasAnyPermission([ [ 'can_edit' ] ], [ 'chw' ], null);
      const resultPermissionsEmpty = auth.hasAnyPermission([ [ 'can_edit' ] ], [ 'chw' ], {});
      const resultRolesNull = auth.hasAnyPermission([ [ 'can_edit' ] ], null, { can_edit: [ 'chw' ] });
      const resultRolesEmpty = auth.hasAnyPermission([ [ 'can_edit' ] ], null, { can_edit: [ 'chw' ] });

      expect(resultPermissionsNull).to.be.false;
      expect(resultPermissionsEmpty).to.be.false;
      expect(resultRolesNull).to.be.false;
      expect(resultRolesEmpty).to.be.false;
    });

    it('should return false when permissionsGroupList parameter is empty', () => {
      const resultNoPermissions = auth.hasAnyPermission(null, [ 'chw' ], { can_edit: [ 'chw' ] });
      const resultEmptyArray = auth.hasAnyPermission([], [ 'chw' ], { can_edit: [ 'chw' ] });
      const resultListWrongType = auth.hasAnyPermission('can_edit', [ 'chw' ], { can_edit: [ 'chw' ] });
      const resultGroupWrongType = auth.hasAnyPermission([ 'can_edit' ], [ 'chw' ], { can_edit: [ 'chw' ] });

      expect(resultNoPermissions).to.be.false;
      expect(resultEmptyArray).to.be.false;
      expect(resultListWrongType).to.be.false;
      expect(resultGroupWrongType).to.be.false;
    });

    it('should return true when user is admin and doesnt have disallowed permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin', 'district_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
        some_permission: [ 'national_admin', 'district_admin' ]
      };

      const result = auth.hasAnyPermission(
        [[ 'can_backup_facilities' ], [ 'can_export_messages' ], [ 'some_permission' ]],
        [ '_admin' ],
        chtPermissions
      );

      expect(result).to.be.true;
    });

    it('should return true when user is admin and has some disallowed permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin', 'district_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
        some_permission: [ 'national_admin', 'district_admin' ]
      };

      const result = auth.hasAnyPermission(
        [[ '!can_backup_facilities' ], [ '!can_export_messages' ], [ 'some_permission' ]],
        [ '_admin' ],
        chtPermissions
      );

      expect(result).to.be.true;
    });

    it('should return false when user is admin and has all disallowed permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin', 'district_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
        some_permission: [ 'national_admin', 'district_admin' ]
      };

      const result = auth.hasAnyPermission(
        [[ '!can_backup_facilities' ], [ '!can_export_messages' ], [ '!some_permission' ]],
        [ '_admin' ],
        chtPermissions
      );

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin', 'district_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
        can_add_people: [ 'national_admin', 'district_admin' ],
        can_add_places: [ 'national_admin', 'district_admin' ],
        can_roll_over: [ 'national_admin', 'district_admin' ],
      };
      const anyPermissions = [
        [ 'can_backup_facilities' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ],
      ];

      const result = auth.hasAnyPermission(anyPermissions, [ 'district_admin' ], chtPermissions);

      expect(result).to.be.true;
    });

    it('should return true when user has some permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin', 'district_admin' ],
        can_backup_people: [ 'national_admin', 'district_admin' ],
      };
      const anyPermissions = [
        [ 'can_backup_facilities', 'can_backup_people' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ]
      ];

      const result = auth.hasAnyPermission(anyPermissions, [ 'district_admin' ], chtPermissions);

      expect(result).to.be.true;
    });

    it('should return true when checking for multiple permissions spread across roles', () => {
      const chtPermissions = {
        can_access_gateway_api: [ 'gateway', 'district-admin' ],
        can_view_analytics: [ 'analytics', 'district-admin' ],
        can_view_analytics_tab: [ 'analytics', 'district-admin' ],
        can_view_contacts: [ 'chw', 'district-admin' ],
        can_write_wealth_quintiles: [ 'district-admin' ],
        can_backup_facilities: [ 'district-admin' ],
        can_backup_people: [ 'district-admin' ]
      };
      const userRoles = [ 'analytics', 'gateway', 'chw' ];
      const anyPermissions = [
        ['can_access_gateway_api', 'can_view_analytics', 'can_view_contacts' ],
        [ 'can_backup_facilities', 'can_backup_people' ]
      ];

      const result = auth.hasAnyPermission(anyPermissions, userRoles, chtPermissions);

      expect(result).to.be.true;
    });

    it('should return false when user doesnt have any of the permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin' ],
        can_backup_people: [ 'national_admin' ]
      };
      const anyPermissions = [
        [ 'can_backup_facilities', 'can_backup_people' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ]
      ];

      const result = auth.hasAnyPermission(anyPermissions, [ 'district_admin' ], chtPermissions);

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions and no disallowed permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin', 'district_admin' ],
        can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
        can_add_people: [ 'national_admin', 'district_admin' ],
        random1: [ 'national_admin' ],
        random2: [ 'national_admin' ],
        random3: [ 'national_admin' ]
      };
      const anyPermissions = [
        ['can_backup_facilities', '!random1'],
        ['can_export_messages', '!random2'],
        ['can_add_people', '!random3']
      ];

      const result = auth.hasAnyPermission(anyPermissions, [ 'district_admin' ], chtPermissions);

      expect(result).to.be.true;
    });

    it('should return true when user has some permissions and some disallowed permissions', () => {
      const chtPermissions = {
        can_backup_facilities: [ 'national_admin', 'district_admin' ],
        can_backup_people: [ 'national_admin', 'district_admin' ],
        can_add_people: [ 'national_admin' ],
        can_add_places: [ 'national_admin' ],
        random1: [ 'national_admin' ],
        random3: [ 'national_admin' ]
      };
      const anyPermissions = [
        ['can_backup_facilities', '!can_add_people'],
        ['can_export_messages', '!random2'],
        ['can_backup_people', '!can_add_places']
      ];

      const result = auth.hasAnyPermission(anyPermissions, [ 'district_admin' ], chtPermissions);

      expect(result).to.be.true;
    });

    it('should return false when user has all disallowed permissions', () => {
      const chtPermissions = {
        can_backup_facilities: ['national_admin', 'district_admin'],
        can_backup_people: ['national_admin', 'district_admin'],
        can_backup_places: ['national_admin', 'district_admin'],
        random1: ['national_admin', 'district_admin'],
        random2: ['national_admin', 'district_admin'],
        random3: ['national_admin', 'district_admin'],
      };
      const anyPermissions = [
        [ 'can_backup_facilities', '!random1' ],
        [ 'can_backup_people', '!random2' ],
        [ 'can_backup_places', '!random3' ]
      ];
      const result = auth.hasAnyPermission(anyPermissions, [ 'district_admin' ], chtPermissions);

      expect(result).to.be.false;
    });
  });
});
