const expect = require('chai').expect;
const sinon = require('sinon');
const chtScriptApi = require('../src/index');
const auth = require('../src/auth');

describe('CHT Script API - index', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should return versioned api and set functions', () => {
    expect(chtScriptApi).to.have.all.keys([ 'v1' ]);
    expect(chtScriptApi.v1).to.have.all.keys([ 'hasPermissions', 'hasAnyPermission' ]);
    expect(chtScriptApi.v1.hasPermissions).to.be.a('function');
    expect(chtScriptApi.v1.hasAnyPermission).to.be.a('function');
  });

  it('should call auth.hasPermissions', () => {
    const authHasPermissions = sinon.stub(auth, 'hasPermissions').returns(true);
    const userRoles = [ 'chw' ];
    const chtPermissionsSettings = {
      can_backup_facilities: [ 'chw', 'national_admin' ],
      can_export_messages: [ 'national_admin', 'chw', 'analytics' ]
    };
    const permissions = [ 'can_backup_facilities', 'can_export_messages' ];

    const result = chtScriptApi.v1.hasPermissions(permissions, userRoles, chtPermissionsSettings);

    expect(result).to.be.true;
    expect(authHasPermissions.callCount).to.equal(1);
    expect(authHasPermissions.args[0]).to.deep.equal([ permissions, userRoles, chtPermissionsSettings ]);
  });

  it('should call auth.hasAnyPermission', () => {
    const authHasAnyPermission = sinon.stub(auth, 'hasAnyPermission').returns(true);
    const userRoles = [ 'district_admin' ];
    const chtPermissionsSettings = {
      can_backup_facilities: [ 'national_admin', 'district_admin' ],
      can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
      can_add_people: [ 'national_admin', 'district_admin' ],
      can_add_places: [ 'national_admin', 'district_admin' ],
      can_roll_over: [ 'national_admin', 'district_admin' ],
    };
    const permissions = [
      [ 'can_backup_facilities' ],
      [ 'can_export_messages', 'can_roll_over' ],
      [ 'can_add_people', 'can_add_places' ],
    ];

    const result = chtScriptApi.v1.hasAnyPermission(permissions, userRoles, chtPermissionsSettings);

    expect(result).to.be.true;
    expect(authHasAnyPermission.callCount).to.equal(1);
    expect(authHasAnyPermission.args[0]).to.deep.equal([ permissions, userRoles, chtPermissionsSettings ]);
  });
});
