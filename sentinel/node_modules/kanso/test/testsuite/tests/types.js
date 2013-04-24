var types = require('couchtypes/types'),
    fields = require('couchtypes/fields'),
    db = require('db'),
    _ = require('underscore')._;


exports['Type - defaults'] = function (test) {
    var Type = types.Type;
    var t = new Type('t');
    test.same(_.keys(t.fields), ['_id', '_rev', '_deleted', 'type']);
    test.same(t.permissions, {});
    test.done();
};

exports['validate'] = function (test) {
    var Field = fields.Field;
    var Type = types.Type;

    var args = [];
    var logArgs = function (doc, val, raw) {
        args.push([doc, val, raw]);
    };
    var neverValid = function () {
        throw new Error('never valid');
    };

    var t = new Type('t', {
        fields: {
            one: new Field({
                validators: [logArgs]
            }),
            two: new Field({
                validators: [logArgs, neverValid]
            }),
            three: {
                four: {
                    five: new Field({
                        validators: [logArgs, neverValid]
                    })
                }
            }
        }
    });

    var doc = {
        _id: 'someid',
        type: 't',
        one: 1,
        two: 2,
        three: {four: {five: 'asdf'}}
    };

    var raw = {
        type: 't',
        one: '1',
        two: '2',
        three: {four: {five: 'asdf'}}
    };

    var errs = t.validate(doc, raw);
    test.equal(errs.length, 2);
    test.same(errs[0].field, ['two']);
    test.equal(errs[0].has_field, true);
    test.same(errs[1].field, ['three', 'four', 'five']);
    test.equal(errs[1].has_field, true);
    test.done();
};

exports['validate - missing required fields'] = function (test) {
    var Field = fields.Field;
    var Type = types.Type;

    var args = [];
    var logArgs = function (doc, val, raw) {
        args.push([doc, val, raw]);
    };
    var neverValid = function () {
        throw new Error('never valid');
    };

    var t = new Type('t', {
        fields: {
            one: new Field({
                validators: [logArgs]
            })
        }
    });

    var doc = {_id: 'someid', type: 't'};
    var raw = {};

    var errs = t.validate(doc, raw);
    test.equal(errs.length, 1);
    test.same(errs[0].field, ['one']);
    test.equal(errs[0].message, 'Required field');
    test.equal(errs[0].has_field, true);
    test.done();
};

exports['validate - missing required fields - nested'] = function (test) {
    var Field = fields.Field;
    var Type = types.Type;

    var args = [];
    var logArgs = function (doc, val, raw) {
        args.push([doc, val, raw]);
    };
    var neverValid = function () {
        throw new Error('never valid');
    };

    var t = new Type('t', {
        fields: {
            one: {
                two: new Field({
                    validators: [logArgs]
                })
            }
        }
    });

    var doc = {_id: 'someid', type: 't'};
    var raw = {};

    var errs = t.validate(doc, raw);
    test.equal(errs.length, 1);
    test.same(errs[0].field, ['one', 'two']);
    test.equal(errs[0].message, 'Required field');
    test.equal(errs[0].has_field, true);
    test.done();
};

exports['validate - field in the wrong place'] = function (test) {
    var Field = fields.Field;
    var Type = types.Type;

    var args = [];
    var logArgs = function (doc, val, raw) {
        args.push([doc, val, raw]);
    };
    var neverValid = function () {
        throw new Error('never valid');
    };

    var t = new Type('t', {
        allow_extra_fields: true,
        fields: {
            one: {
                two: new Field({
                    validators: [logArgs]
                })
            }
        }
    });

    var doc = {_id: 'someid', type: 't', one: 'blah', asdf: {two: 123}};
    var raw = {one: 'blah', asdf: {two: '123'}};

    var errs = t.validate(doc, raw);
    test.equal(errs.length, 1);
    test.same(errs[0].field, ['one']);
    test.notEqual(errs[0].message, undefined, 'Returns error');
    test.equal(errs[0].has_field, false);
    // asdf.two is not covered by the fieldset, so unexpected properties
    // don't matter.
    test.done();
};

exports['validate - extra values'] = function (test) {
    var Field = fields.Field;
    var Type = types.Type;

    var args = [];
    var logArgs = function (doc, val, raw) {
        args.push([doc, val, raw]);
    };
    var neverValid = function () {
        throw new Error('never valid');
    };

    var t = new Type('t', {
        fields: {
            one: new Field({
                validators: [logArgs]
            })
        }
    });

    var doc = {_id: 'someid', type: 't', one: 'blah', asdf: {two: 123}};
    var raw = {type: 't', one: 'blah', asdf: {two: '123'}};

    var errs = t.validate(doc, raw);
    test.equal(errs.length, 1);
    test.same(errs[0].field, ['asdf']);
    test.notEqual(errs[0].message, undefined, 'Returns error');
    test.equal(errs[0].has_field, false);
    // asdf.two is not covered by the fieldset, so unexpected properties
    // don't matter.
    test.done();
};

exports['validate Embedded'] = function (test) {
    var Embedded = fields.Embedded;
    var Field = fields.Field;
    var Type = types.Type;

    var t1 = new Type('t1', {
        fields: {
            one: new Field(),
            two: new Field()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embeddedT1: new Embedded({
                type: t1
            })
        }
    });

    var doc = {type: 't2', embeddedT1: {
        _id: 'id1',
        type: 't1',
        one: 'one',
        two: 'two'
    }};
    var raw = {type: 't1', embeddedT1: {
        _id: 'id1',
        type: 't2',
        one: 'one',
        two: 'two'
    }};
    var errs = t2.validate(doc, raw);

    test.same(errs, []);
    test.done();
};

exports['validate Embedded - missing fields'] = function (test) {
    var Embedded = fields.Embedded;
    var Field = fields.Field;
    var Type = types.Type;

    var t1 = new Type('t1', {
        fields: {
            one: new Field(),
            two: new Field()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embeddedT1: new Embedded({
                type: t1
            })
        }
    });

    var doc = {type: 't2', embeddedT1: {type: 't1', _id: 'id1', one: 'one'}};
    var raw = {type: 't2', embeddedT1: {type: 't1', _id: 'id1', one: 'one'}};
    var errs = t2.validate(doc, raw);

    test.equal(errs.length, 1);
    test.equal(errs[0].message, 'Required field');
    test.same(errs[0].field, ['embeddedT1', 'two']);
    test.done();
};

exports['validate Embedded - optional'] = function (test) {
    var Embedded = fields.Embedded;
    var Field = fields.Field;
    var Type = types.Type;

    var t1 = new Type('t1', {
        fields: {
            one: new Field()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embeddedT1: new Embedded({
                type: t1,
                required: false
            })
        }
    });

    var doc = { type: 't2' };
    var raw = { type: 't2' };
    var errs = t2.validate(doc, raw);

    test.equal(errs.length, 0);
    test.done();
};

exports['validate EmbeddedList'] = function (test) {
    var EmbeddedList = fields.EmbeddedList;
    var Field = fields.Field;
    var Type = types.Type;

    var t1 = new Type('t1', {
        fields: {
            one: new Field(),
            two: new Field()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embeds: new EmbeddedList({
                type: t1
            })
        }
    });

    var doc = {type: 't2', embeds: [
        {type: 't1', _id: 'id1', one: 'one', two: 'two'},
        {type: 't1', _id: 'id2', one: 'one'}
    ]};
    var errs = t2.validate(doc, doc);

    test.equal(errs.length, 1);
    test.equal(errs[0].message, 'Required field');
    test.same(errs[0].field, ['embeds', '1', 'two']);
    test.done();
};

exports['authorize'] = function (test) {
    var Field = fields.Field;
    var Type = types.Type;

    var type_perms_err = new Error('type-level permissions error');
    var perms_err = new Error('test permissions error');

    var oldDoc = {type: 't', _id: 'someid', _rev: '1', one: 'oVal'};
    var newDoc = {type: 't', _id: 'someid', _rev: '2', one: 'nVal'};

    var t = new Type('t', {
        permissions: function () {
            throw type_perms_err;
        },
        fields: {
            one: new Field({
                permissions: function (nDoc, oDoc, nVal, oVal, user) {
                    test.same(nDoc, newDoc);
                    test.same(oDoc, oldDoc);
                    test.equal(nVal, 'nVal');
                    test.equal(oVal, 'oVal');
                    test.equal(user, 'user');
                    throw perms_err;
                }
            })
        }
    });
    var errs = t.authorize(newDoc, oldDoc, 'user');

    test.equal(errs.length, 2);
    test.equal(errs[0].message, 'type-level permissions error');
    test.ok(!errs[0].has_field);
    test.same(errs[1].field, ['one']);
    test.equal(errs[1].has_field, true);
    test.done();
};

exports['authorize - type-level add, update, remove'] = function (test) {
    var Field = fields.Field;
    var Type = types.Type;

    var perms_err = new Error('test permissions error');

    var calls = [];
    var t = new Type('t', {
        permissions: {
            add: function () {
                calls.push('add');
                throw perms_err;
            },
            update: function () {
                calls.push('update');
                throw perms_err;
            },
            remove: function () {
                calls.push('remove');
                throw perms_err;
            }
        },
        fields: {}
    });

    var oldDoc = null;
    var newDoc = {type: 't', _id: 'id', _rev: '2'};
    var errs = t.authorize(newDoc, oldDoc, 'user');

    test.equal(errs.length, 1);
    test.same(calls, ['add']);

    oldDoc = {type: 't', _id: 'id', _rev: '1'};
    newDoc = {type: 't', _id: 'id', _rev: '2'};
    errs = t.authorize(newDoc, oldDoc, 'user');

    test.equal(errs.length, 1);
    test.same(calls, ['add', 'update']);

    oldDoc = {type: 't', _id: 'id', _rev: '1'};
    newDoc = {_deleted: true};
    errs = t.authorize(newDoc, oldDoc, 'user');

    test.equal(errs.length, 1);
    test.same(calls, ['add', 'update', 'remove']);

    test.done();
};

exports['authorize Embedded - optional'] = function (test) {
    var Embedded = fields.Embedded;
    var Field = fields.Field;
    var Type = types.Type;

    var t1 = new Type('t1', {
        fields: {
            one: new Field()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embeddedT1: new Embedded({
                type: t1,
                required: false
            })
        }
    });

    var doc = { type: 't2' };
    var raw = { type: 't2' };
    var errs = t2.authorize(doc, raw);

    test.equal(errs.length, 0);
    test.done();
};

exports['validate_doc_update'] = function (test) {
    test.expect(4);
    var newDoc = {type: 'type1', test: 'test'};
    var oldDoc = {type: 'type1', test: 'test'};
    var userCtx = {name: 'testuser'};
    var t = {
        'type1': {
            validate: function (nDoc) {
                test.same(nDoc, newDoc);
                return [];
            },
            authorize: function (nDoc, oDoc, uCtx) {
                test.same(nDoc, newDoc);
                test.same(oDoc, oldDoc);
                test.same(uCtx, userCtx);
                return [];
            }
        }
    };
    types.validate_doc_update(t, newDoc, oldDoc, userCtx);
    test.done();
};

exports['validate_doc_update - validate error'] = function (test) {
    var newDoc = {type: 'type1', test: 'test'};
    var oldDoc = {type: 'type1', test: 'test'};
    var userCtx = {name: 'testuser'};
    var t = {
        'type1': {
            validate: function (newDoc) {
                return ['test error'];
            },
            authorize: function (newDoc, oldDoc, userCtx) {
                return [];
            }
        }
    };
    test.throws(function () {
        types.validate_doc_update(t, newDoc, oldDoc, userCtx);
    });
    test.done();
};

exports['validate_doc_update - validate error'] = function (test) {
    var newDoc = {type: 'type1', test: 'test'};
    var oldDoc = {type: 'type1', test: 'test'};
    var userCtx = {name: 'testuser'};
    var t = {
        'type1': {
            validate: function (newDoc) {
                return [];
            },
            authorize: function (newDoc, oldDoc, userCtx) {
                return ['test error'];
            }
        }
    };
    test.throws(function () {
        types.validate_doc_update(t, newDoc, oldDoc, userCtx);
    });
    test.done();
};

exports['validate_doc_update - remove doc'] = function (test) {
    test.expect(1);
    var newDoc = {_deleted: true};
    var oldDoc = {type: 'type1', test: 'test'};
    var userCtx = {name: 'testuser'};
    var t = {
        'type1': {
            validate: function (newDoc) {
                test.ok(false, 'validate should not be called');
                return [];
            },
            authorize: function (newDoc, oldDoc, userCtx) {
                test.ok(true, 'authorize should be called');
                return [];
            }
        }
    };
    types.validate_doc_update(t, newDoc, oldDoc, userCtx);
    test.done();
};

exports['validate_doc_update - add doc'] = function (test) {
    test.expect(2);
    var newDoc = {type: 'type1', test: 'test'};
    var oldDoc = null;
    var userCtx = {name: 'testuser'};
    var t = {
        'type1': {
            validate: function (newDoc) {
                test.ok(true, 'validate should be called');
                return [];
            },
            authorize: function (newDoc, oldDoc, userCtx) {
                test.ok(true, 'authorize should be called');
                return [];
            }
        }
    };
    types.validate_doc_update(t, newDoc, oldDoc, userCtx);
    test.done();
};

exports['validate_doc_update on type'] = function (test) {
    test.expect(6);
    var newDoc = {type: 'type1', test: 'test'};
    var oldDoc = {type: 'type1', test: 'test'};
    var userCtx = {name: 'testuser'};
    var err = new Error('test error');
    var t = {
        'type1': {
            validate: function (newDoc) {
                test.ok(true, 'validate should be called');
                return [];
            },
            authorize: function (newDoc, oldDoc, userCtx) {
                test.ok(true, 'authorize should be called');
                return [];
            },
            validate_doc_update: function (nDoc, oDoc, uCtx) {
                test.same(nDoc, newDoc);
                test.same(oDoc, oldDoc);
                test.same(uCtx, userCtx);
                throw err;
            }
        }
    };
    try {
        types.validate_doc_update(t, newDoc, oldDoc, userCtx);
    }
    catch (e) {
        test.equal(err, e);
    }
    test.done();
};

exports['Type.create'] = function (test) {
    var t = new types.Type('t', {
        fields: {
            text: fields.string({
                default_value: 'asdf'
            }),
            text2: fields.string(),
            num: fields.number({
                default_value: 123
            })
        }
    });
    // store old uuid funciton to restore later
    var _newUUID = db.newUUID;
    db.newUUID = function (count, cb) {
        cb(null, 'uuid');
    };
    var userCtx = {};
    t.create(userCtx, function (err, doc) {
        test.same(doc, {
            _id: 'uuid',
            type: 't',
            text: 'asdf',
            num: 123
        });
        // restore newUUID function
        db.newUUID = _newUUID;
        test.done();
    });
};
