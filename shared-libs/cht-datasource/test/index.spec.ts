import { expect } from 'chai';
import { getDatasource } from '../src';
import { hasPermissions, hasAnyPermission } from '../src/auth';

describe('CHT Script API - index', () => {
  it('should return versioned api and set functions', async () => {
    const chtScriptApi = await getDatasource();
    expect(chtScriptApi).to.have.all.keys([ 'v1' ]);
    expect(chtScriptApi.v1).to.have.all.keys([ 'hasPermissions', 'hasAnyPermission', 'person' ]);
    expect(chtScriptApi.v1.hasPermissions).to.be.a('function');
    expect(chtScriptApi.v1.hasAnyPermission).to.be.a('function');

    expect(chtScriptApi.v1.hasPermissions).to.equal(hasPermissions);
    expect(chtScriptApi.v1.hasAnyPermission).to.equal(hasAnyPermission);
  });
});
