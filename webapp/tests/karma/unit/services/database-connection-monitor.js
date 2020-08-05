const { expect } = chai;

describe('DatabaseConnectionMonitor service', function() {
  'use strict';

  let service; let 
    rootScope;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('$window', window);
    });
    inject(function(_DatabaseConnectionMonitor_, _$rootScope_) {
      service = _DatabaseConnectionMonitor_;
      rootScope = _$rootScope_;
    });
  });
  
  it('no resolution from another unhandled rejection', function(done) {
    rootScope.$emit = sinon.stub();
    service.listenForDatabaseClosed();
    new Promise((resolve, reject) => reject('foo'));
    setTimeout(() => {
      expect(rootScope.$emit.callCount).to.eq(0);
      done();
    }, 50);
  });

  it('resolution from DOMException', function(done) {
    rootScope.$emit = () => done();
    service.listenForDatabaseClosed();
    triggerPouchDbDOMException();
  });

  const triggerPouchDbDOMException = () => { 
    let db = new window.PouchDB('test', { auto_compaction: true }); 
    const write = i => {
      db.put({ _id: i + 'a', bar: 'bar' }).then(() => {
        write(i + 1); 
      }).catch((err) => {
        throw err;
      });
    };
    write(0); 
    db.destroy(); 
    db = new window.PouchDB('test', { auto_compaction: true }); 
  };
});
