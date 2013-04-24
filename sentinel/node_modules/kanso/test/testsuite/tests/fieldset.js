var fields = require('couchtypes/fields'),
    fieldset = require('couchtypes/fieldset');


exports['createDefaults'] = function (test) {
    var userCtx = {name: 'testuser'};
    var f = {
        one: fields.string({default_value: 'asdf'}),
        two: {
            three: fields.number({default_value: 1}),
            four: fields.string()
        },
        five: fields.boolean(),
        user: fields.string({
            default_value: function (userCtx) {
                return userCtx.name;
            }
        })
    };
    test.same(
        fieldset.createDefaults(f, userCtx),
        {one: 'asdf', two: {three: 1}, user: 'testuser'}
    );
    test.done();
};

exports['createDefaults - attachments'] = function (test) {
    test.expect(2);
    var req = {userCtx: {name: 'testuser'}};
    var f = {
        one: fields.attachments({default_value: {
            'foo.ext': {
                content_type: 'test/foo',
                length: 123,
                data: 'foo'
            },
            'bar.ext': {
                content_type: 'test/bar',
                length: 123,
                data: 'bar'
            }
        }}),
        two: {
            three: fields.attachments({
                default_value: function (r) {
                    test.same(req, r);
                    return {
                        'two.three.ext': {
                            content_type: 'test/test',
                            length: 123,
                            data: 'test'
                        }
                    }
                }
            })
        },
    };
    test.same(
        fieldset.createDefaults(f, req),
        {
            _attachments: {
                'one/foo.ext': {
                    content_type: 'test/foo', length: 123, data: 'foo'
                },
                'one/bar.ext': {
                    content_type: 'test/bar', length: 123, data: 'bar'
                },
                'two/three/two.three.ext': {
                    content_type: 'test/test', length: 123, data: 'test'
                }
            },
            two: {}
        }
    );
    test.done();
};

exports['validate - attachment field'] = function (test) {
    var doc = {
        _attachments: {
            'one/file.ext': {
                content_type: 'test/test', length: 123, data: 'test'
            },
            'one/file2.ext': {
                content_type: 'test/test', length: 123, data: 'test2'
            }
        }
    };
    var f = {
        one: fields.attachments({
            validators: [function (_doc, value) {
                test.equal(doc, _doc);
                test.same(value, {
                    'file.ext': {
                        content_type: 'test/test', length: 123, data: 'test'
                    },
                    'file2.ext': {
                        content_type: 'test/test', length: 123, data: 'test2'
                    }
                });
            }]
        })
    };
    fieldset.validate(f, doc, doc, {}, [], false);
    test.done();
};

exports['authFieldSet - attachment field'] = function (test) {
    test.expect(5);
    var req = {
        userCtx: {name: 'testuser', roles: []}
    };
    var ndoc = {
        _attachments: {
            'one/file.ext': {
                content_type: 'test/test', length: 123, data: 'new'
            },
        }
    };
    var odoc = {
        _attachments: {
            'one/file.ext': {
                content_type: 'test/test', length: 123, data: 'old'
            },
        }
    };
    var f = {
        one: fields.attachments({
            permissions: function (newDoc, oldDoc, newVal, oldVal, userCtx) {
                test.equal(newDoc, ndoc);
                test.equal(oldDoc, odoc);
                test.same(newVal, {
                    'file.ext': {
                        content_type: 'test/test', length: 123, data: 'new'
                    }
                });
                test.same(oldVal, {
                    'file.ext': {
                        content_type: 'test/test', length: 123, data: 'old'
                    }
                });
                test.equal(userCtx, req.userCtx);
            }
        })
    };
    fieldset.authFieldSet(f, ndoc, odoc, ndoc, odoc, req.userCtx, [], false);
    test.done();
};
