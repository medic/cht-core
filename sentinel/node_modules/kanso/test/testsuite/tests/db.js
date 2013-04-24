
var settings = require('settings/root'),
    db = require('db'),
    replication = require('replication'),
    users = require('users'),
    utils = require('duality/utils'),
    duality = require('duality/core'),
    session = require('session'),
    async = require('async'),
    _ = require('underscore')._;


exports['database creation/deletion'] = function (test)
{
    test.expect(6);
    var database_name = 'kanso_testsuite_database';

    db.createDatabase(database_name, function (err_c, rv_c) {
        if (err_c) {
            test.done(err_c);
        }
        test.equal(err_c, undefined, 'Created database successfully');
        test.notEqual(rv_c, undefined, 'Return value is defined');
        test.equal(rv_c.ok, true, 'createDatabase returns okay');

        db.deleteDatabase(database_name, function (err_d, rv_d) {
            if (err_d) {
                test.done(err_d);
            }
            test.equal(err_d, undefined, 'Deleted database successfully');
            test.notEqual(rv_d, undefined, 'Return value is defined');
            test.equal(rv_d.ok, true, 'deleteDatabase returns okay');
            test.done();
        });
    });
};

exports['options.db for saveDoc/getDoc/removeDoc, async'] = function (test)
{
    test.expect(16);
    var database_name = 'kanso_testsuite_options';

    async.waterfall([
        function (callback) {
            db.createDatabase(database_name, function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'createDatabase has no error');
                test.notEqual(rv, undefined, 'createDatabase returns a value');
                test.equal(rv.ok, true, 'createDatabase returns okay');
                callback();
            });
        },
        function (callback) {
            db.use(database_name).saveDoc({ test: true }, function (err, rv) {
                test.notEqual(rv, undefined, 'New test document #1 created');
                test.notEqual(rv.id, undefined, 'New test document #1 has id');
                callback(null, rv);
            });
        },
        function (doc1, callback) {
            db.use(database_name).saveDoc({ test: true }, function (err, rv) {
                test.notEqual(rv, undefined, 'New test document #2 created');
                test.notEqual(rv.id, undefined, 'New test document #2 has id');
                callback(null, doc1, rv);
            });
        },
        function (doc1, doc2, callback) {
            db.use(database_name).getDoc(doc1.id, {}, function (err, rv) {
                test.notEqual(rv, undefined, 'Test document #1 found');
                test.notEqual(rv._rev, undefined, 'Test document #1 has rev');
                callback(null, doc1, doc2);
            });
        },
        function (doc1, doc2, callback) {
            db.use('/' + database_name).getDoc(doc2.id, {}, function (err, rv) {
                test.notEqual(rv, undefined, 'Test document #2 found');
                test.notEqual(rv._rev, undefined, 'Test document #2 has rev');
                callback(null, doc1, doc2);
            });
        },
        function (doc1, doc2, callback) {
            db.use('/' + database_name).removeDoc(
                { _id: doc1.id, _rev: doc1.rev },
                function (err, rv) {
                    if (err) {
                        test.done(err);
                    }
                    test.notEqual(rv.ok, undefined, 'Test document #1 removed');
                    callback(null, doc2);
                }
            );
        },
        function (doc2, callback) {
            db.use(database_name).removeDoc(
                { _id: doc2.id, _rev: doc2.rev },
                function (err, rv) {
                    if (err) {
                        test.done(err);
                    }
                    test.notEqual(rv.ok, undefined, 'Test document #2 removed');
                    callback();
                }
            );
        },
        function (callback) {
            db.deleteDatabase('/' + database_name, function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'deleteDatabase has no error');
                test.notEqual(rv, undefined, 'deleteDatabase returns a value');
                test.equal(rv.ok, true, 'deleteDatabase returns okay');
                callback();
            });
        }
    ], function () {
        test.done();
    });
};

/* A deeply-nested version; no async.js dependency */
exports['simple replication, no async'] = function (test)
{
    test.expect(16);

    /* Create databases */
    db.createDatabase('kanso_testsuite_source', function (e1, r1) {
        if (e1) {
            test.done(e1);
        }
        test.equal(e1, undefined, 'first createDatabase has no error');
        test.notEqual(r1, undefined, 'first createDatabase returns a value');
        test.equal(r1.ok, true, 'first createDatabase returns okay');

        db.createDatabase('kanso_testsuite_target', function (e2, r2) {
            if (e2) {
                test.done(e2);
            }
            test.equal(e2, undefined, 'second createDatabase has no error');
            test.notEqual(r2, undefined, 'second createDatabase returns a value');
            test.equal(r2.ok, true, 'second createDatabase returns okay');

            /* Start replication job */
            replication.start(
                { source: 'kanso_testsuite_source',
                    target: 'kanso_testsuite_target',
                    create_target: false, continuous: false },

                function (err_start, rv_start) {
                    test.equal(err_start, undefined, 'No error starting replication');
                    test.notEqual(rv_start.id, undefined, 'Replication job ID defined');

                    /* Stop replication: Should retry by default */
                    replication.stop(
                        { _id: rv_start.id, _rev: rv_start.rev },

                        function (err_stop, rv_stop) {
                            if (err_stop) {
                                test.done(err_stop);
                            }
                            test.equal(err_stop, undefined, 'No error while stopping replication');
                            test.equal(rv_stop.ok, true, 'stopReplication returns');

                            /* Delete databases */
                            db.deleteDatabase('kanso_testsuite_source', function (e3, r3) {
                                if (e3) {
                                    test.done(e3);
                                }
                                test.equal(e3, undefined, 'first deleteDatabase has no error');
                                test.notEqual(r3, undefined, 'first deleteDatabase returns a value');
                                test.equal(r3.ok, true, 'first deleteDatabase returns okay');

                                db.deleteDatabase('kanso_testsuite_target', function (e4, r4) {
                                    if (e4) {
                                        test.done(e4);
                                    }
                                    test.equal(e4, undefined, 'second deleteDatabase has no error');
                                    test.notEqual(r4, undefined, 'second deleteDatabase returns a value');
                                    test.equal(r4.ok, true, 'second deleteDatabase returns okay');
                                    test.done();
                                });
                            });
                        }
                    );
                }
            );
        });
    });
};

/* Same as above, but using async.js */
exports['simple replication, async'] = function (test)
{
    test.expect(12);

    async.waterfall([
        function (callback) {
            db.createDatabase('kanso_testsuite_source', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'first createDatabase has no error');
                test.notEqual(rv, undefined, 'first createDatabase returns a value');
                test.equal(rv.ok, true, 'first createDatabase returns okay');
                callback();
            });
        },
        function (callback) {
            db.createDatabase('kanso_testsuite_target', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'second createDatabase has no error');
                test.notEqual(rv, undefined, 'second createDatabase returns a value');
                test.equal(rv.ok, true, 'second createDatabase returns okay');
                callback();
            });
        },
        function (callback) {
            replication.start(
                { source: 'kanso_testsuite_source',
                    target: 'kanso_testsuite_target',
                    create_target: false, continuous: false },

                function (err, rv) {
                    test.equal(err, undefined, 'No error starting replication');
                    test.notEqual(rv.id, undefined, 'Replication job ID is defined');
                    callback(null, rv);
                }
            );
        },
        function (doc, callback) {
            replication.stop(
                { _id: doc.id, _rev: doc.rev },

                function (err_stop, rv_stop) {
                    if (err_stop) {
                        test.done(err_stop);
                    }
                    test.equal(err_stop, undefined, 'No error stopping replication');
                    test.equal(rv_stop.ok, true, 'stopReplication returns okay');
                    callback();
                }
            );
        },
        function (callback) {
            db.deleteDatabase('kanso_testsuite_target', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(rv.ok, true, 'first deleteDatabase returns okay');
                callback();
            });
        },
        function (callback) {
            db.deleteDatabase('kanso_testsuite_source', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(rv.ok, true, 'second deleteDatabase returns okay');
                callback();
            });
        }
    ], function () {
        test.done();
    });

};

exports['complex replication, async'] = function (test)
{
    var num_docs = 10;
    var all_created_docs = [];
    var kanso_database = (utils.getBaseURL().slice(1).split('/'))[0];

    test.expect((num_docs * 6) + 34);

    async.waterfall([
        function (callback) {
            db.createDatabase('kanso_testsuite_target1', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'first createDatabase has no error');
                test.notEqual(rv, undefined, 'first createDatabase returns a value');
                test.equal(rv.ok, true, 'first createDatabase returns okay');
                callback();
            });
        },
        function (callback) {
            db.createDatabase('kanso_testsuite_target2', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'second createDatabase has no error');
                test.notEqual(rv, undefined, 'second createDatabase returns a value');
                test.equal(rv.ok, true, 'second createDatabase returns okay');
                callback();
            });
        },
        function (callback) {

            /* Function generator:
                    Generates steps to be used inside of async.waterfall. */

            var make_create_doc_fn = function (i) {
                return function (next_fn) {
                    var example_doc = {
                        i: i,
                        test: true,
                        data: 'abcdefghijklmnopqrstuvwxyz'
                    };
                    db.use(settings.name).saveDoc(example_doc, function (err, rv) {
                        test.notEqual(rv, undefined, 'New document is defined');
                        test.notEqual(rv.id, undefined, 'ID for new document is defined');
                        all_created_docs[i] = rv;
                        next_fn();
                    });
                };
            };

            /* Create 100 test documents */
            var create_fn_list = [];

            for (var i = 0; i < num_docs; ++i) {
                create_fn_list[i] = make_create_doc_fn(i);
            }
            
            async.waterfall(create_fn_list, function () {
                callback();
            });
        },
        function (callback) {
            replication.start(
                { source: kanso_database,
                    target: 'kanso_testsuite_target1',
                    create_target: false, continuous: false },

                function (err, rv) {
                    test.equal(err, undefined, 'No error starting replication');
                    test.notEqual(rv, undefined, 'Replication job returns a value');
                    test.notEqual(rv.id, undefined, 'Replication job ID is defined');
                    callback(null, rv);
                }
            );
        },
        function (doc1, callback) {
            replication.start(
                { source: kanso_database,
                    target: 'kanso_testsuite_target2',
                    create_target: false, continuous: false },

                function (err, rv) {
                    test.equal(err, undefined, 'No error starting replication');
                    test.notEqual(rv, undefined, 'Replication job returns a value');
                    test.notEqual(rv.id, undefined, 'Replication job ID is defined');
                    callback(null, doc1, rv);
                }
            );
        },

        function (doc1, doc2, callback) {
            replication.get(
                doc1.id,
                function (err, rv) {
                    test.equal(err, undefined, 'No error getting replication #1');
                    test.notEqual(rv, undefined, 'Replication job #1 has a value');
                    test.notEqual(rv._id, undefined, 'getReplication #1 has id');
                    test.notEqual(rv._rev, undefined, 'getReplication #1 has rev');
                    callback(null, doc1, doc2);
                }
            );
        },
        function (doc1, doc2, callback) {
            replication.get(
                doc2.id,
                function (err, rv) {
                    test.equal(err, undefined, 'No error getting replication #2');
                    test.notEqual(rv, undefined, 'Replication job #2 has a value');
                    test.notEqual(rv._id, undefined, 'getReplication #2 has id');
                    test.notEqual(rv._rev, undefined, 'getReplication #2 has rev');
                    callback(null, doc1, doc2);
                }
            );
        },
        function (doc1, doc2, callback) {
            replication.wait(doc1, function (err1) {
                test.equal(err1, undefined, 'waitReplication #1 encoutered no error');

                replication.wait(doc2, function (err2) {
                    test.equal(err2, undefined, 'waitReplication #2 encoutered no error');

                    /* Function generator:
                            Generates steps to be used inside of async.waterfall.
                            Each step is itself a two-step waterfall. Probably confusing. */

                    var make_verify_doc_fn = function (i) {
                        return function (next_fn) {
                            var id = all_created_docs[i].id;
                            async.waterfall([
                                function (nxt) {
                                    db.use(settings.name).getDoc(
                                        id, {}, { db: 'kanso_testsuite_target1' },
                                        function (err, rv) {
                                            test.notEqual(rv, undefined, 'Test document #1 exists');
                                            test.notEqual(rv._rev, undefined, 'Test document #1 has rev');
                                            nxt();
                                        }
                                    );
                                },
                                function (nxt) {
                                    db.use(settings.name).getDoc(
                                        id, {}, { db: 'kanso_testsuite_target2' },
                                        function (err, rv) {
                                            test.notEqual(rv, undefined, 'Test document #2 exists');
                                            test.notEqual(rv._rev, undefined, 'Test document #2 has rev');
                                            nxt();
                                        }
                                    );
                                }
                            ],
                            function () {
                                next_fn();
                            });
                        };
                    };

                    /* Verify 100 previously-crated documents */
                    var verify_fn_list = [];

                    for (var i = 0; i < num_docs; ++i) {
                        verify_fn_list[i] = make_verify_doc_fn(i);
                    }
                    
                    async.waterfall(verify_fn_list, function () {
                        callback(null, doc1, doc2);
                    });
                });
            });
        },
        function (doc1, doc2, callback) {
            replication.stop(
                { _id: doc1.id, _rev: doc1.rev },

                function (err, rv) {
                    if (err) {
                        test.done(err);
                    }
                    test.equal(err, undefined, 'No error stopping replication #1');
                    test.notEqual(rv, undefined, 'stopReplication #1 returns value');
                    test.equal(rv.ok, true, 'stopReplication #1 returns okay');
                    callback(null, doc1, doc2);
                }
            );
        },
        function (doc1, doc2, callback) {
            replication.stop(
                { _id: doc2.id, _rev: doc2.rev },

                function (err, rv) {
                    if (err) {
                        test.done(err);
                    }
                    test.equal(err, undefined, 'No error stopping replication #2');
                    test.notEqual(rv, undefined, 'stopReplication #2 returns value');
                    test.equal(rv.ok, true, 'stopReplication #2 returns okay');
                    callback();
                }
            );
        },
        function (callback) {
            db.deleteDatabase('kanso_testsuite_target2', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'first deleteDatabase has no error');
                test.notEqual(rv, undefined, 'first deleteDatabase returns a value');
                test.equal(rv.ok, true, 'first deleteDatabase returns okay');
                callback();
            });
        },
        function (callback) {
            db.deleteDatabase('kanso_testsuite_target1', function (err, rv) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'second deleteDatabase has no error');
                test.notEqual(rv, undefined, 'second deleteDatabase returns a value');
                test.equal(rv.ok, true, 'second deleteDatabase returns okay');
                callback();
            });
        }
    ], function () {
        test.done();
    });

};

exports['bulk docs - simple'] = function (test)
{
    test.expect(7);
    var appdb = db.use(duality.getDBURL());
    var max = 1024;

    async.waterfall([
        function (callback) {
            var docs = [];
            for (var i = 0; i < max; ++i) {
                docs.push({
                    offset: i,
                    test: true,
                    type: 'example'
                });
            }
            appdb.bulkSave(docs, { transactional: true }, function (err, rv) {
                test.equal(err, undefined, 'bulkSave has no error');
                test.notEqual(rv, undefined, 'bulkSave returns a value');
                test.equal(rv.length, max, 'bulkSave yields an array');
                callback(null, rv);
            });
        },
        function (ids, callback) {
            var fetch = _.map(ids, function (x) {
                return x.id;
            });
            appdb.bulkGet(fetch, { include_docs: true }, function (err, rv) {
                test.equal(err, undefined, 'bulkGet has no error');
                test.notEqual(rv, undefined, 'bulkGet returns a value');
                test.equal(rv.rows.length, ids.length, 'bulkGet yields an array');
                test.equal(
                    _.inject(rv.rows, function (a, x) {
                        a += x.doc.offset;
                        return a;
                    }, 0),
                    ((max - 1) * max) / 2,
                    "sum of bulkGet's return value is correct"
                );
                callback();
            });
        },
    ], function () {
        test.done();
    });
};

exports['bulk docs - range'] = function (test)
{
    test.expect(6);
    var appdb = db.use(duality.getDBURL());
    var s = 'abcdefghijklmnopqrstuvwxyz';

    async.waterfall([
        function (callback) {
            var docs = [];
            for (var i = 0, len = s.length; i < len; ++i) {
                docs.push({
                    _id: s[i],
                    test: true,
                    type: 'example'
                });
            }
            appdb.bulkSave(docs, function (err, rv) {
                test.equal(err, undefined, 'bulkSave has no error');
                test.notEqual(rv, undefined, 'bulkSave returns a value');
                test.equal(rv.length, s.length, 'bulkSave yields an array');
                callback();
            });
        },
        function (callback) {
            appdb.bulkGet(
                false,
                { startkey: s[10], endkey: s.slice(-1) }, function (err, rv) {
                test.equal(err, undefined, 'bulkGet has no error');
                test.notEqual(rv, undefined, 'bulkGet returns a value');
                test.equal(rv.rows.length, s.length - 10, 'bulkGet yields an array');
                callback();
            });
        }
    ], function () {
        test.done();
    });
};

exports['getDoc - cached'] = function (test)
{
    test.expect(15);
    var appdb = db.use(duality.getDBURL());

    var doc = { data: '1234567890' };
    var get_options = { useCache: true };
    var replacement_data = '0987654321';

    async.waterfall([
        function (callback) {
            appdb.saveDoc(doc, function (err, rv) {
                test.equal(err, undefined, 'saveDoc has no error');
                test.notEqual(rv, undefined, 'New document is defined');
                test.notEqual(rv.id, undefined, 'id for new document is defined');
                callback(null, rv.id);
            });
        },
        function (id, callback) {
            appdb.getDoc(id, {}, get_options, function (err, rv) {
                test.equal(err, undefined, 'getDoc has no error');
                test.notEqual(rv, undefined, 'Document is defined');
                test.notEqual(rv._id, undefined, '_id for document is defined');
                test.equal(rv.data, doc.data, 'Document data is correct');
                callback(null, rv);
            });
        },
        function (rdoc, callback) {
            rdoc.data = replacement_data;
            appdb.saveDoc(rdoc, function (err, rv) {
                test.equal(err, undefined, 'saveDoc has no error');
                callback(null, rv.id);
            });
        },
        function (id, callback) {
            appdb.getDoc(id, {}, get_options, function (err, rv) {
                test.equal(err, undefined, 'getDoc has no error');
                test.notEqual(rv, undefined, 'Document is defined');
                test.equal(rv.data, doc.data, 'Cached document data is correct');
                callback(null, id);
            });
        },
        function (id, callback) {
            get_options.flushCache = true;
            appdb.getDoc(id, {}, get_options, function (err, rv) {
                test.equal(err, undefined, 'getDoc has no error');
                test.notEqual(rv, undefined, 'Document is defined');
                test.notEqual(rv._id, undefined, '_id for document is defined');
                test.equal(rv.data, replacement_data, 'Document data is correct');
                callback();
            });
        }
    ], function () {
        test.done();
    });
};

exports['newUUID - simple'] = function (test)
{
    test.expect(9);
    db.clear_request_cache();

    async.waterfall([
        function (callback) {
            db.newUUID(2, function (err, uuid) {
                test.equal(err, undefined, 'newUUID has no error');
                test.notEqual(uuid, undefined, 'UUID is defined');
                callback(null, uuid);
            });
        },
        function (prev_uuid, callback) {
            db.newUUID(2, function (err, uuid) {
                test.equal(err, undefined, 'newUUID has no error');
                test.notEqual(uuid, undefined, 'UUID is defined');
                test.notEqual(uuid, prev_uuid, 'UUID is non-repeating');
                callback(null, uuid, prev_uuid);
            });
        },
        function (prev_uuid, prev_prev_uuid, callback) {
            db.newUUID(2, function (err, uuid) {
                test.equal(err, undefined, 'newUUID re-request has no error');
                test.notEqual(uuid, undefined, 'result of re-request is defined');
                test.notEqual(uuid, prev_uuid, 'UUID is non-repeating');
                test.notEqual(uuid, prev_prev_uuid, 'UUID is non-repeating');
                callback();
            });
        }
    ], function () {
        test.done();
    });
};

exports['newUUID - cache miss'] = function (test)
{
    var uuids = [];
    var uuid_count = 100;
    var ajax_request_count = 0;
    
    test.expect(2 * uuid_count + 5);
    db.clear_request_cache();

    async.waterfall([
        function (callback) {
            $(document).bind('ajaxSend', function () {
                ajax_request_count += 1;
                console.log([ '** req', ajax_request_count ]);
            });
            callback();
        },
        function (callback) {
            var steps = [];
            var make_step = function (i) {
                return function (finished) {
                    db.newUUID(uuid_count, function (err, uuid) {
                        test.equal(err, undefined, 'newUUID has no error');
                        test.notEqual(uuid, undefined, 'UUID is defined');
                        uuids.push(uuid);
                        console.log([ i, uuid ]);
                        finished();
                    });
                }
            };
            for (var i = 0; i < uuid_count; ++i) {
                steps.push(make_step(i));
            }
            async.parallel(steps, function () {
                callback();
            });
        },
        function (callback) {
            test.equal(ajax_request_count, 1, 'Only one request');
            callback();
        },
        function (callback) {
            db.newUUID(uuid_count, function (err, uuid) {
                console.log(uuid);
                test.equal(err, undefined, 're-request has no error');
                test.notEqual(uuid, undefined, 're-request uuid is defined');
                uuids.push(uuid);
                callback();
            });
        },
        function (callback) {
            console.log(ajax_request_count);
            test.equal(
                ajax_request_count, 2,
                    'Cache requests additional uuids when needed'
            );
            test.equal(
                _.uniq(uuids).length, uuids.length,
                    'All document identifiers are unique'
            );
            callback();
        }

    ], function () {
        test.done();
    });
};

exports['newUUID - cache concurrency'] = function (test)
{
    test.expect(5);
    db.clear_request_cache();

    var ajax_request_count = 0;

    async.waterfall([
        function (callback) {
            $(document).bind('ajaxSend', function () {
                ajax_request_count += 1;
            });
            callback();
        },
        function (callback) {
            async.parallel([
                function (finished) {
                    db.newUUID(2, function (err, uuid) {
                        test.equal(err, undefined, 'newUUID has no error');
                        test.notEqual(uuid, undefined, 'UUID is defined');
                        finished();
                    });
                },
                function (finished) {
                    db.newUUID(2, function (err, uuid) {
                        test.equal(err, undefined, 'newUUID has no error');
                        test.notEqual(uuid, undefined, 'UUID is defined');
                        finished();
                    });
                }
            ], function () {
                callback();
            });
        },
        function (callback) {
            test.equal(ajax_request_count, 1, 'Only one request');
            callback();
        }
    ], function () {
        test.done();
    });
};
