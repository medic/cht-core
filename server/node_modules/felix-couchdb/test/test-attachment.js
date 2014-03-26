require('./common');

var
  DB_NAME = 'node-couchdb-test',

  callbacks = {
    A: false,
    B: false,
    C: false,
    D: false,
    E: false,
  },

  db = client.db(DB_NAME);

// Init fresh db
db.remove();
db.create();

couchdb
  .toAttachment(__dirname+'/fixture/logo.png', function (er, attachment) {
    if (er) throw new Error(JSON.stringify(er));
    
    callbacks.A = true;
    assert.equal('image/png', attachment.content_type);
    assert.equal(4016, attachment.data.length);
    
    db.saveDoc('logo-doc', {
      name: 'The Logo',
      _attachments: {
        'logo.png': attachment
      }
    }, function (er, r) {
      if (er) throw new Error(JSON.stringify(er));
      callbacks.B = true;
      assert.ok(r.ok);
      assert.equal('logo-doc', r.id);

      db.getAttachment('logo-doc', 'logo.png', function (er, r) {
        callbacks.E = true;
        assert.equal(3010, r.length);
      })
    });
  });


db.saveAttachment(
  __dirname+'/fixture/logo.png',
  'logo-2',
  function (er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.C = true;
    assert.ok(r.ok);
    assert.equal('logo-2', r.id);

    db.removeAttachment('logo-2', 'logo.png', r.rev, function (er, r) {
      if (er) throw new Error(JSON.stringify(er));
      callbacks.D = true;
      assert.ok(r.ok);
    })
  });

process.on('exit', function() {
  checkCallbacks(callbacks);
});