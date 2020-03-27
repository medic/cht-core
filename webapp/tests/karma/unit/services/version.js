describe('Version service', () => {

  'use strict';

  let get;
  let allDocs;
  let service;

  beforeEach(() => {
    get = sinon.stub();
    allDocs = sinon.stub();

    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ get, allDocs }));
    });
    inject($injector => {
      service = $injector.get('Version');
    });
  });

  describe('getLocal', () => {

    it('gets the version and rev from local ddoc', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf',
        deploy_info: {
          version: '3.5.0-beta.3',
          base_version: '3.5.0'
        }
      });
      return service.getLocal().then(({ version, rev }) => {
        chai.expect(version).to.equal('3.5.0-beta.3 (~3.5.0)');
        chai.expect(rev).to.equal('123');
      });
    });

    it('handles no base version', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf',
        deploy_info: {
          version: '3.5.0-beta.3'
        }
      });
      return service.getLocal().then(({ version }) => {
        chai.expect(version).to.equal('3.5.0-beta.3');
      });
    });

    it('handles base version matching version', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf',
        deploy_info: {
          version: '3.5.0',
          base_version: '3.5.0'
        }
      });
      return service.getLocal().then(({ version }) => {
        chai.expect(version).to.equal('3.5.0');
      });
    });

    it('handles no deploy info', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf'
      });
      return service.getLocal().then(({ version }) => {
        chai.expect(version).to.be.undefined;
      });
    });

  });

  describe('getRemoteRev', () => {

    it('gets the rev from the remote ddoc', () => {
      allDocs.resolves({
        rows: [ { value: { rev: '584-jsdfkjsdfkjh' } } ]
      });
      return service.getRemoteRev().then(rev => {
        chai.expect(rev).to.equal('584');
      });
    });

  });
  
});
