const expect = require('chai').expect;
const auth = require('../src/auth');
const { DB_ADMIN_ROLES } = require('@medic/constants');

const makeCtx = settings => ({ settings: { getAll: () => settings } });
const hasPermissions = (permissions, userRoles, settings, chtPermissionsSettings) => auth.hasPermissions(
  makeCtx(settings)
)(permissions, userRoles, chtPermissionsSettings);
const hasAnyPermission = (permissionsGroupList, userRoles, settings, chtPermissionsSettings) => auth.hasAnyPermission(
  makeCtx(settings)
)(permissionsGroupList, userRoles, chtPermissionsSettings);

describe('CHT Script API - Auth', () => {
  describe('hasPermissions', () => {
    it('should return false when no roles and no permissions configured in CHT-Core settings', () => {
      const resultPermissionsNull = hasPermissions(
        'can_edit', [ 'chw' ], { permissions: null, rolls: { chw: { } } }
      );
      const resultPermissionsEmpty = hasPermissions(
        'can_edit', [ 'chw' ], { permissions: { }, roles: { chw: { } } }
      );
      const resultRolesNull = hasPermissions('can_edit', null, { permissions: { can_edit: [ 'chw' ] } });
      const resultRolesEmpty = hasPermissions('can_edit', null, { permissions: { can_edit: [ 'chw' ] } });

      expect(resultPermissionsNull).to.be.false;
      expect(resultPermissionsEmpty).to.be.false;
      expect(resultRolesNull).to.be.false;
      expect(resultRolesEmpty).to.be.false;
    });

    it('should return false when permissions parameter is empty', () => {
      const settings = { permissions: { can_edit: [ 'chw' ] }, roles: { chw: { } } };
      const resultNoPermissions = hasPermissions(null, [ 'chw' ], settings);
      const resultEmptyString = hasPermissions('', [ 'chw' ], settings);
      const resultEmptyArray = hasPermissions([], [ 'chw' ], settings);

      expect(resultNoPermissions).to.be.false;
      expect(resultEmptyArray).to.be.false;
      expect(resultEmptyString).to.be.false;
    });

    it('should return true when user has the permission', () => {
      const settings = {
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        },
        roles: { chw_supervisor: { name: 'chw_supervisor' }, gateway: { name: 'gateway' } }
      };
      const userRoles = [ 'chw_supervisor', 'gateway' ];

      const result = hasPermissions('can_edit', userRoles, settings);

      expect(result).to.be.true;
    });

    it('should return false when user doesnt have the permission', () => {
      const settings = {
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        },
        roles: { chw_supervisor: { name: 'chw_supervisor' }, gateway: { name: 'gateway' } }
      };
      const userRoles = [ 'chw_supervisor', 'gateway' ];

      const result = hasPermissions('can_configure', userRoles, settings);

      expect(result).to.be.false;
    });

    DB_ADMIN_ROLES.forEach(adminRole => {
      it('should return true when user is admin', () => {
        const settings = {
          permissions: {
            can_edit: [ 'chw_supervisor' ],
            can_configure: [ 'nurse' ]
          }
        };

        const result = hasPermissions('can_create_people', [adminRole], settings);

        expect(result).to.be.true;
      });
    });

    it('should return false when settings doesnt have roles assigned for the permission', () => {
      const settings = {
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: null
        },
        roles: { chw_supervisor: { name: 'chw_supervisor' } }
      };
      const userRoles = [ 'chw_supervisor' ];

      const result = hasPermissions('can_configure', userRoles, settings);

      expect(result).to.be.false;
    });

    it('should return true when checking for multiple permissions spread across roles', () => {
      const settings = {
        permissions: {
          can_access_gateway_api: [ 'gateway', 'district-admin' ],
          can_view_analytics: [ 'analytics', 'district-admin' ],
          can_view_analytics_tab: [ 'analytics', 'district-admin' ],
          can_view_contacts: [ 'chw', 'district-admin' ],
          can_write_wealth_quintiles: [ 'district-admin' ]
        },
        roles: {
          gateway: {}, analytics: {}, chw: {}, 'district-admin': {}
        }
      };
      const userRoles = [ 'analytics', 'gateway', 'chw' ];

      const result = hasPermissions(
        [ 'can_access_gateway_api', 'can_view_analytics', 'can_view_contacts' ],
        userRoles,
        settings
      );

      expect(result).to.be.true;
    });

    it('should return false for unknown permission', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
        },
        roles: { national_admin: {}, district_admin: {}, analytics: {} }
      };

      const result = hasPermissions([ 'xyz' ], [ 'district_admin' ], settings);

      expect(result).to.be.false;
    });

    it('should return true for disallowed unknown permission', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
        },
        roles: { national_admin: {}, district_admin: {}, analytics: {} }
      };

      const result = hasPermissions([ '!xyz' ], [ 'district_admin' ], settings);

      expect(result).to.be.true;
    });

    it('should return false when user does not have all permissions', () => {
      const userRoles = [ 'district_admin' ];
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
        },
        roles: { national_admin: {}, district_admin: {}, analytics: {} }
      };

      const result = hasPermissions([ 'can_backup_facilities', 'can_export_messages' ], userRoles, settings);

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions', () => {
      const userRoles = [ 'analytics' ];
      const settings = {
        permissions: {
          can_backup_facilities: [ 'analytics' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
        },
        roles: { analytics: {}, national_admin: {}, district_admin: {} }
      };

      const result = hasPermissions([ 'can_backup_facilities', 'can_export_messages' ], userRoles, settings);

      expect(result).to.be.true;
    });

    DB_ADMIN_ROLES.forEach(adminRole => {
      it('should return false when user is admin and has disallowed permission', () => {
        const settings = {
          permissions: {
            can_backup_facilities: [ 'analytics' ],
            can_export_messages: [ 'national_admin' ]
          }
        };

        const result = hasPermissions([ '!can_backup_facilities' ], [adminRole], settings);

        expect(result).to.be.false;
      });
    });

    it('should return false when user has one of disallowed permission', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
        },
        roles: { national_admin: {}, district_admin: {}, analytics: {} }
      };

      const result = hasPermissions(
        [ '!can_backup_facilities', '!can_export_messages' ],
        [ 'analytics' ],
        settings
      );

      expect(result).to.be.false;
    });

    it('should return true when user doesnt have disallowed permissions', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ]
        },
        roles: { national_admin: {}, district_admin: {}, analytics: {} }
      };

      const result = hasPermissions(
        [ '!can_backup_facilities', 'can_export_messages' ],
        [ 'analytics' ],
        settings
      );

      expect(result).to.be.true;
    });

    it('should return false when the user role has been deleted from the configured roles', () => {
      const settings = {
        permissions: { can_edit: [ 'chw_supervisor' ] },
        roles: { chw: { name: 'usertype.chw', offline: true } }
      };
      // User still has 'chw_supervisor' in their profile, but the role is no longer in app_settings.roles
      const userRoles = [ 'chw_supervisor' ];

      const result = hasPermissions('can_edit', userRoles, settings);

      expect(result).to.be.false;
    });

    it('should return true when the user has a valid configured role with the permission', () => {
      const settings = {
        permissions: { can_edit: [ 'chw_supervisor', 'chw' ] },
        roles: { chw: { name: 'usertype.chw', offline: true } }
      };
      // User has both 'chw_supervisor' (deleted) and 'chw' (still configured)
      const userRoles = [ 'chw_supervisor', 'chw' ];

      const result = hasPermissions('can_edit', userRoles, settings);

      expect(result).to.be.true;
    });

    [
      {},
      undefined
    ].forEach(roles => {
      it('should return false when no roles are configured and user is not admin', () => {
        const settings = {
          permissions: { can_edit: [ 'chw_supervisor' ] },
          roles
        };
        const userRoles = [ 'chw_supervisor' ];

        // Restrictive: when no roles configured, non-admin users get no permissions
        const result = hasPermissions('can_edit', userRoles, settings);

        expect(result).to.be.false;
      });
    });
  });

  describe('hasAnyPermission', () => {
    it('should return false when no roles and no permissions configured in CHT-Core settings', () => {
      const resultPermissionsNull = hasAnyPermission(
        [ [ 'can_edit' ] ], [ 'chw' ], { permissions: null, roles: { chw: { } } }
      );
      const resultPermissionsEmpty = hasAnyPermission(
        [ [ 'can_edit' ] ], [ 'chw' ], { permissions: {}, roles: { chw: { } } }
      );
      const resultRolesNull = hasAnyPermission([ [ 'can_edit' ] ], null, { permissions: { can_edit: [ 'chw' ] } });
      const resultRolesEmpty = hasAnyPermission([ [ 'can_edit' ] ], [], { permissions: { can_edit: [ 'chw' ] } });

      expect(resultPermissionsNull).to.be.false;
      expect(resultPermissionsEmpty).to.be.false;
      expect(resultRolesNull).to.be.false;
      expect(resultRolesEmpty).to.be.false;
    });

    it('should return false when permissionsGroupList parameter is empty', () => {
      const settings = { permissions: { can_edit: [ 'chw' ] }, roles: { chw: { } } };
      const resultNoPermissions = hasAnyPermission(null, [ 'chw' ], settings);
      const resultEmptyArray = hasAnyPermission([], [ 'chw' ], settings);
      const resultListWrongType = hasAnyPermission('can_edit', [ 'chw' ], settings);
      const resultGroupWrongType = hasAnyPermission([ 'can_edit' ], [ 'chw' ], settings);

      expect(resultNoPermissions).to.be.false;
      expect(resultEmptyArray).to.be.false;
      expect(resultListWrongType).to.be.false;
      expect(resultGroupWrongType).to.be.false;
    });

    DB_ADMIN_ROLES.forEach(adminRole => {
      it('should return true when user is admin and doesnt have disallowed permissions', () => {
        const settings = {
          permissions: {
            can_backup_facilities: [ 'national_admin', 'district_admin' ],
            can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
            some_permission: [ 'national_admin', 'district_admin' ]
          }
        };

        const result = hasAnyPermission(
          [[ 'can_backup_facilities' ], [ 'can_export_messages' ], [ 'some_permission' ]],
          [adminRole],
          settings
        );

        expect(result).to.be.true;
      });

      it('should return true when user is admin and has some disallowed permissions', () => {
        const settings = {
          permissions: {
            can_backup_facilities: [ 'national_admin', 'district_admin' ],
            can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
            some_permission: [ 'national_admin', 'district_admin' ]
          }
        };

        const result = hasAnyPermission(
          [[ '!can_backup_facilities' ], [ '!can_export_messages' ], [ 'some_permission' ]],
          [adminRole],
          settings
        );

        expect(result).to.be.true;
      });

      it('should return false when user is admin and has all disallowed permissions', () => {
        const settings = {
          permissions: {
            can_backup_facilities: [ 'national_admin', 'district_admin' ],
            can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
            some_permission: [ 'national_admin', 'district_admin' ]
          }
        };

        const result = hasAnyPermission(
          [[ '!can_backup_facilities' ], [ '!can_export_messages' ], [ '!some_permission' ]],
          [adminRole],
          settings
        );

        expect(result).to.be.false;
      });
    });

    it('should return true when user has all permissions', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin', 'district_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
          can_add_people: [ 'national_admin', 'district_admin' ],
          can_add_places: [ 'national_admin', 'district_admin' ],
          can_roll_over: [ 'national_admin', 'district_admin' ],
        },
        roles: { national_admin: {}, district_admin: {}, analytics: {} }
      };
      const anyPermissions = [
        [ 'can_backup_facilities' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ],
      ];

      const result = hasAnyPermission(anyPermissions, [ 'district_admin' ], settings);

      expect(result).to.be.true;
    });

    it('should return true when user has some permissions', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin', 'district_admin' ],
          can_backup_people: [ 'national_admin', 'district_admin' ],
        },
        roles: { national_admin: {}, district_admin: {} }
      };
      const anyPermissions = [
        [ 'can_backup_facilities', 'can_backup_people' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ]
      ];

      const result = hasAnyPermission(anyPermissions, [ 'district_admin' ], settings);

      expect(result).to.be.true;
    });

    it('should return true when checking for multiple permissions spread across roles', () => {
      const settings = {
        permissions: {
          can_access_gateway_api: [ 'gateway', 'district-admin' ],
          can_view_analytics: [ 'analytics', 'district-admin' ],
          can_view_analytics_tab: [ 'analytics', 'district-admin' ],
          can_view_contacts: [ 'chw', 'district-admin' ],
          can_write_wealth_quintiles: [ 'district-admin' ],
          can_backup_facilities: [ 'district-admin' ],
          can_backup_people: [ 'district-admin' ]
        },
        roles: { gateway: {}, analytics: {}, chw: {}, 'district-admin': {} }
      };
      const userRoles = [ 'analytics', 'gateway', 'chw' ];
      const anyPermissions = [
        ['can_access_gateway_api', 'can_view_analytics', 'can_view_contacts' ],
        [ 'can_backup_facilities', 'can_backup_people' ]
      ];

      const result = hasAnyPermission(anyPermissions, userRoles, settings);

      expect(result).to.be.true;
    });

    it('should return false when user doesnt have any of the permissions', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin' ],
          can_backup_people: [ 'national_admin' ]
        },
        roles: { national_admin: {}, district_admin: {} }
      };
      const anyPermissions = [
        [ 'can_backup_facilities', 'can_backup_people' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ]
      ];

      const result = hasAnyPermission(anyPermissions, [ 'district_admin' ], settings);

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions and no disallowed permissions', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin', 'district_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
          can_add_people: [ 'national_admin', 'district_admin' ],
          random1: [ 'national_admin' ],
          random2: [ 'national_admin' ],
          random3: [ 'national_admin' ]
        },
        roles: { national_admin: {}, district_admin: {}, analytics: {} }
      };
      const anyPermissions = [
        ['can_backup_facilities', '!random1'],
        ['can_export_messages', '!random2'],
        ['can_add_people', '!random3']
      ];

      const result = hasAnyPermission(anyPermissions, [ 'district_admin' ], settings);

      expect(result).to.be.true;
    });

    it('should return true when user has some permissions and some disallowed permissions', () => {
      const settings = {
        permissions: {
          can_backup_facilities: [ 'national_admin', 'district_admin' ],
          can_backup_people: [ 'national_admin', 'district_admin' ],
          can_add_people: [ 'national_admin' ],
          can_add_places: [ 'national_admin' ],
          random1: [ 'national_admin' ],
          random3: [ 'national_admin' ]
        },
        roles: { national_admin: {}, district_admin: {} }
      };
      const anyPermissions = [
        ['can_backup_facilities', '!can_add_people'],
        ['can_export_messages', '!random2'],
        ['can_backup_people', '!can_add_places']
      ];

      const result = hasAnyPermission(anyPermissions, [ 'district_admin' ], settings);

      expect(result).to.be.true;
    });

    it('should return false when user has all disallowed permissions', () => {
      const settings = {
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_backup_people: ['national_admin', 'district_admin'],
          can_backup_places: ['national_admin', 'district_admin'],
          random1: ['national_admin', 'district_admin'],
          random2: ['national_admin', 'district_admin'],
          random3: ['national_admin', 'district_admin'],
        },
        roles: { national_admin: {}, district_admin: {} }
      };
      const anyPermissions = [
        [ 'can_backup_facilities', '!random1' ],
        [ 'can_backup_people', '!random2' ],
        [ 'can_backup_places', '!random3' ]
      ];
      const result = hasAnyPermission(anyPermissions, [ 'district_admin' ], settings);

      expect(result).to.be.false;
    });

    it('should return false when the user role has been deleted from the configured roles', () => {
      const settings = {
        permissions: { can_edit: [ 'chw_supervisor' ], can_view: [ 'chw_supervisor' ] },
        roles: { chw: { name: 'usertype.chw', offline: true } }
      };
      // User still has 'chw_supervisor' in their profile, but the role is no longer in app_settings.roles
      const userRoles = [ 'chw_supervisor' ];

      const result = hasAnyPermission([ [ 'can_edit' ], [ 'can_view' ] ], userRoles, settings);

      expect(result).to.be.false;
    });

    it('should return true when user has a valid configured role with any of the permissions', () => {
      const settings = {
        permissions: { can_edit: [ 'chw_supervisor' ], can_view: [ 'chw' ] },
        roles: { chw: { name: 'usertype.chw', offline: true } }
      };
      // User has 'chw_supervisor' (deleted) and 'chw' (configured), 'chw' grants can_view
      const userRoles = [ 'chw_supervisor', 'chw' ];

      const result = hasAnyPermission([ [ 'can_edit' ], [ 'can_view' ] ], userRoles, settings);

      expect(result).to.be.true;
    });
  });

  describe('chtPermissionsSettings override', () => {
    it('hasPermissions uses the override when provided', () => {
      const ctxSettings = {
        permissions: { can_edit: [ 'chw' ] },
        roles: { chw: {}, chw_supervisor: {} }
      };
      const override = { can_edit: [ 'chw_supervisor' ] };

      const result = auth.hasPermissions(makeCtx(ctxSettings))('can_edit', [ 'chw_supervisor' ], override);

      expect(result).to.be.true;
    });

    it('hasPermissions falls back to ctx settings.permissions when override is not provided', () => {
      const ctxSettings = {
        permissions: { can_edit: [ 'chw_supervisor' ] },
        roles: { chw_supervisor: {} }
      };

      const result = auth.hasPermissions(makeCtx(ctxSettings))('can_edit', [ 'chw_supervisor' ]);

      expect(result).to.be.true;
    });

    it('hasAnyPermission uses the override when provided', () => {
      const ctxSettings = {
        permissions: { can_edit: [ 'chw' ] },
        roles: { chw: {}, chw_supervisor: {} }
      };
      const override = { can_edit: [ 'chw_supervisor' ] };

      const result = auth.hasAnyPermission(makeCtx(ctxSettings))(
        [[ 'can_edit' ]], [ 'chw_supervisor' ], override
      );

      expect(result).to.be.true;
    });

    it('hasAnyPermission falls back to ctx settings.permissions when override is not provided', () => {
      const ctxSettings = {
        permissions: { can_edit: [ 'chw_supervisor' ] },
        roles: { chw_supervisor: {} }
      };

      const result = auth.hasAnyPermission(makeCtx(ctxSettings))([[ 'can_edit' ]], [ 'chw_supervisor' ]);

      expect(result).to.be.true;
    });
  });
});
