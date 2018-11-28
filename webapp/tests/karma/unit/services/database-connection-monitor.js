const { expect } = chai;

describe('DatabaseConnectionMonitor service', function() {
  'use strict';

  let service; 

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('$window', window);
    });
    inject(function(_DatabaseConnectionMonitor_) {
      service = _DatabaseConnectionMonitor_;
    });
  });
  
  it('no resolution from another unhandled rejection', function(done) {
    service.onDatabaseClosed().then(() => expect.fail('onDatabaseClosed should not resolve'));
    new Promise((resolve, reject) => reject('foo'));
    setTimeout(done, 50);
  });

  it('resolution from DOMException', function(done) {
    service.onDatabaseClosed().then(() => done());
    triggerPouchDbDOMException();
  });

  const triggerPouchDbDOMException = () => { 
      let db = new window.PouchDB('test', { auto_compaction: true }); 
      const write = i => {
        db.put({ _id: i + 'a', bar: 'bar' }).then(() => {
          write(i + 1); 
        });
      };
      write(0); 
      db.destroy(); 
      db = new window.PouchDB('test', { auto_compaction: true }); 
  };
});
