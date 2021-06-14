
const expect = require('chai').expect;
const chtScriptApi = require('../src/index');

describe('CHTScriptApi', () => {
  it('should contain all functions', () => {
    expect(chtScriptApi).to.have.all.keys([ 'setChtCoreSettingsDoc', 'setUserSettingsDoc', 'getApi' ]);
    expect(chtScriptApi.setChtCoreSettingsDoc).to.be.a('function');
    expect(chtScriptApi.setUserSettingsDoc).to.be.a('function');
    expect(chtScriptApi.getApi).to.be.a('function');
  });

  it('should return versioned api and set functions', () => {
    const result = chtScriptApi.getApi();

    expect(result).to.have.all.keys([ 'v1' ]);
    expect(result.v1).to.have.all.keys([ 'hasPermission' ]);
    expect(result.v1.hasPermission).to.be.a('function');
  });

  describe('v1.hasPermission()', () => {
    it('should return true when user have the permission', () => {
      chtScriptApi.setChtCoreSettingsDoc({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      chtScriptApi.setUserSettingsDoc({ roles: [ 'chw_supervisor', 'gateway' ] });
      const api = chtScriptApi.getApi();

      const result = api.v1.hasPermission('can_edit');

      expect(result).to.be.true;
    });

    it('should return false when user doesnt have the permission', () => {
      chtScriptApi.setChtCoreSettingsDoc({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      chtScriptApi.setUserSettingsDoc({ roles: [ 'chw_supervisor', 'gateway' ] });
      const api = chtScriptApi.getApi();

      const result = api.v1.hasPermission('can_create_people');

      expect(result).to.be.false;
    });

    it('should react to cache changes', () => {
      chtScriptApi.setChtCoreSettingsDoc({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      chtScriptApi.setUserSettingsDoc(undefined);
      const api = chtScriptApi.getApi();

      const resultUserUndefined = api.v1.hasPermission('can_create_people');

      chtScriptApi.setUserSettingsDoc({ roles: [ 'nurse' ] });
      chtScriptApi.setChtCoreSettingsDoc({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_create_people: [ 'nurse' ]
        }
      });

      const resultHasPermission = api.v1.hasPermission('can_create_people');

      expect(resultUserUndefined).to.be.false;
      expect(resultHasPermission).to.be.true;
    });

    it('should return true when user is admin', () => {
      chtScriptApi.setChtCoreSettingsDoc({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      chtScriptApi.setUserSettingsDoc({ roles: [ '_admin' ] });
      const api = chtScriptApi.getApi();

      const result = api.v1.hasPermission('can_create_people');

      expect(result).to.be.true;
    });

    it('should return false when settings doesnt have roles assigned for the permission', () => {
      chtScriptApi.setChtCoreSettingsDoc({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: null
        }
      });
      chtScriptApi.setUserSettingsDoc({ roles: [ 'chw_supervisor' ] });
      const api = chtScriptApi.getApi();

      const result = api.v1.hasPermission('can_configure');

      expect(result).to.be.false;
    });
  });
});
