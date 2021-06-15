
const expect = require('chai').expect;
const chtScriptApi = require('../src/index');

describe('CHT Script API - index', () => {
  it('should contain all functions', () => {
    expect(chtScriptApi).to.have.all.keys([ 'setChtCoreSettingsDoc', 'setUserSettingsDoc', 'getApi' ]);
    expect(chtScriptApi.setChtCoreSettingsDoc).to.be.a('function');
    expect(chtScriptApi.setUserSettingsDoc).to.be.a('function');
    expect(chtScriptApi.getApi).to.be.a('function');
  });

  it('should return versioned api and set functions', () => {
    const result = chtScriptApi.getApi();

    expect(result).to.have.all.keys([ 'v1' ]);
    expect(result.v1).to.have.all.keys([ 'hasPermissions' ]);
    expect(result.v1.hasPermissions).to.be.a('function');
  });

  it('should call auth.hasPermission and react to cache changes', () => {
    chtScriptApi.setChtCoreSettingsDoc({
      permissions: {
        can_edit: [ 'chw_supervisor' ],
        can_configure: [ 'nurse' ]
      }
    });
    chtScriptApi.setUserSettingsDoc(undefined);
    const api = chtScriptApi.getApi();

    const resultUserUndefined = api.v1.hasPermissions('can_create_people');

    chtScriptApi.setUserSettingsDoc({ roles: [ 'nurse' ] });
    chtScriptApi.setChtCoreSettingsDoc({
      permissions: {
        can_edit: [ 'chw_supervisor' ],
        can_create_people: [ 'nurse' ]
      }
    });

    const resultHasPermission = api.v1.hasPermissions('can_create_people');

    expect(resultUserUndefined).to.be.false;
    expect(resultHasPermission).to.be.true;
  });
});
