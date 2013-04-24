var forms = require('couchtypes/forms'),
    types = require('couchtypes/types'),
    db = require('db'),
    core = require('duality/core'),
    fields = require('couchtypes/fields');


exports['formValuesToTree'] = function (test) {
    var query = {
        'one': 'val1',
        'two.three': 'val2',
        'two.four': 'val3'
    };
    test.same(
        forms.formValuesToTree(query),
        {
            one: 'val1',
            two: {
                three: 'val2',
                four: 'val3'
            }
        }
    );
    test.done();
};

exports['parseRaw'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

    var t = new Type('t', {
        fields: {
            one: new Field({
                parse: function (raw) {
                    test.equal(raw, 'raw1');
                    return 'parsed1';
                }
            }),
            two: {
                three: new Field({
                    parse: function (raw) {
                        test.equal(raw, 'raw2');
                        return 'parsed2';
                    }
                })
            }
        }
    });

    var doc = forms.parseRaw(t.fields, {
        type: 't',
        one: 'raw1',
        two: {three: 'raw2'}
    });

    test.same(doc, {
        type: 't',
        one: 'parsed1',
        two: {three: 'parsed2'}
    });

    test.done();
};

exports['parseRaw - embedded'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

    var t1 = new Type('t1', {
        fields: {
            one: fields.string()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embed: new fields.Embedded({
                type: t1
            })
        }
    });

    var doc = forms.parseRaw(t2.fields, {
        type: 't1',
        embed: {
            type: 't2',
            one: 'one'
        }
    });

    test.same(doc, {
        type: 't1',
        embed: {
            type: 't2',
            one: 'one'
        }
    });

    test.done();
};

exports['parseRaw - embeddedList'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

    var t1 = new Type('t1', {
        fields: {
            one: fields.string()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embed: new fields.EmbeddedList({
                type: t1
            })
        }
    });

    var doc = forms.parseRaw(t2.fields, {
        type: 't1',
        embed: [{type: 't2', one: 'one'}, {type: 't2', one: 'one'}]
    });

    test.same(doc, {
        type: 't1',
        embed: [{type: 't2', one: 'one'}, {type: 't2', one: 'one'}]
    });

    test.done();
};

exports['parseRaw - embeddedList empty item'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

    var t1 = new Type('t1', {
        fields: {
            one: fields.string()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embed: new fields.EmbeddedList({
                type: t1
            })
        }
    });

    var doc = forms.parseRaw(t2.fields, {
        type: 't1',
        embed: [
            { type: 't2', one: 'one' },
            '',
            { type: 't2', one: 'three' }
        ]
    });

    test.same(JSON.stringify(doc), JSON.stringify({
        type: 't1',
        embed: [
            { type: 't2', one: 'one' },
            { },
            { type: 't2', one: 'three' }
        ]
    }));

    test.done();
};

exports['parseRaw - embedded json'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

    var t1 = new Type('t1', {
        fields: {
            one: fields.string()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embedlist: new fields.EmbeddedList({
                type: t1
            }),
            embed: new fields.Embedded({
                type: t1
            })
        }
    });

    var doc = forms.parseRaw(t2.fields, {
        type: 't1',
        embed: '{ "type": "t2", "one": "one" }',
        embedlist: [
            '{ "type": "t2", "one": "one" }',
            '{ "type": "t2", "one": "three" }'
        ]
    });

    test.same(doc, {
        type: 't1',
        embed: { type: 't2', one: 'one' },
        embedlist: [
            { type: 't2', one: 'one' },
            { type: 't2', one: 'three' }
        ]
    });

    test.done();
};

exports['Form.toHTML'] = function (test) {
    var f = new forms.Form({
        one: fields.string(),
        two: fields.string()
    });
    var calls = [];
    var renderer = function () {
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
        };
        this.end = function () {
            calls.push('end');
            return '';
        };
    };
    f.toHTML('req', renderer);
    test.same(calls, [
        'start',
        [f.fields.one, 'one', undefined, undefined, []],
        [f.fields.two, 'two', undefined, undefined, []],
        'end'
    ]);
    test.done();
};

exports['Form.toHTML - default values'] = function (test) {
    var f = new forms.Form({
        one: fields.string({default_value: 'asdf'}),
        two: {
            three: fields.string({default_value: 'qwerty'})
        }
    });
    var calls = [];
    var renderer = function () {
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
        };
        this.end = function () {
            calls.push('end');
            return '';
        };
    };
    f.toHTML('req', renderer);
    test.same(calls, [
        'start',
        [f.fields.one, 'one', 'asdf', 'asdf', []],
        [f.fields.two.three, 'two.three', 'qwerty', 'qwerty', []],
        'end'
    ]);
    test.done();
};

exports['Form.toHTML - existing values'] = function (test) {
    var f = new forms.Form({
        one: fields.string({default_value: 'asdf'}),
        two: {
            three: fields.string()
        }
    });
    f.values = {one: 'one', two: {three: 'three'}};
    f.raw = {one: 'oneraw', two: {three: 'threeraw'}};
    var calls = [];
    var renderer = function () {
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
        };
        this.end = function () {
            calls.push('end');
            return '';
        };
    };
    f.toHTML('req', renderer);
    test.same(calls, [
        'start',
        [f.fields.one, 'one', 'one', 'oneraw', []],
        [f.fields.two.three, 'two.three', 'three', 'threeraw', []],
        'end'
    ]);
    test.done();
};

exports['Form.toHTML - errors'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var f = new forms.Form({
        one: fields.string({default_value: 'asdf'}),
        two: {
            three: fields.string()
        }
    });
    f.values = {one: 'one', two: {three: 'three'}};
    f.raw = {one: 'oneraw', two: {three: 'threeraw'}};
    f.errors = [err1, err2, err3];
    var calls = [];
    var renderer = function () {
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
        };
        this.end = function () {
            calls.push('end');
            return '';
        };
    };
    f.toHTML('req', renderer);
    test.same(calls, [
        'start',
        [f.fields.one, 'one', 'one', 'oneraw', [err1]],
        [f.fields.two.three, 'two.three', 'three', 'threeraw', [err2, err3]],
        'end'
    ]);
    test.done();
};

exports['Form.toHTML - embedded'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var t = new types.Type('t', {
        fields: {
            one: fields.string(),
            two: fields.string()
        }
    });
    var f = new forms.Form({
        embed: fields.embed({
            type: t
        })
    });
    var calls = [];
    var renderer = function () {
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push(['embed', field.type, path.join('.'), value, raw, errors]);
            return '';
        };
        this.end = function () {
            calls.push('end');
            return '';
        };
    };
    f.toHTML('req', renderer);
    test.same(calls, [
        'start',
        ['embed', t, 'embed', undefined, undefined, []],
        'end'
    ]);
    test.done();
};

exports['Form.toHTML - embeddedList'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var t = new types.Type('t', {
        fields: {
            one: fields.string(),
            two: fields.string()
        }
    });
    var f = new forms.Form({
        embed: fields.embedList({
            type: t
        })
    });
    var calls = [];
    var renderer = function () {
        this.name = 'main';
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push(['embedList', field.type, path.join('.'), value, raw, errors]);
            return '';
        };
        this.end = function () {
            calls.push('end');
            return '';
        };
    };
    f.toHTML('req', renderer);
    test.same(calls, [
        'start',
        ['embedList', t, 'embed', undefined, undefined, []],
        'end'
    ]);
    test.done();
};

exports['Form.toHTML - embeddedList - with values'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var t = new types.Type('t', {
        fields: {
            one: fields.string(),
            two: fields.string()
        }
    });
    var f = new forms.Form({
        embed: fields.embedList({
            type: t
        })
    });
    var calls = [];
    var renderer = function () {
        this.name = 'main';
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push(['embedList', field.type, path.join('.'), value, raw, errors]);
            return '';
        };
        this.end = function () {
            calls.push('end');
            return '';
        };
    };
    f.values = {
        embed: [{type: 't', _id: '_id', one: '1', two: '2'}]
    };
    f.raw = {
        embed: [{type: 't', _id: '_idraw', one: '1raw', two: '2raw'}]
    };
    f.toHTML('req', renderer);
    test.same(calls, [
        'start',
        ['embedList', t, 'embed', f.values.embed, f.raw.embed, []],
        'end'
    ]);
    test.done();
};

exports['Form.validate - numbers'] = function (test) {
    test.expect(3);
    var f = new forms.Form({
        one: fields.number(),
        two: fields.number()
    });
    f.validate({form: {one: '1', two: '2'}});
    test.same(f.values, {one: 1, two: 2});
    test.same(f.raw, {one: '1', two: '2'});
    test.same(f.errors, []);
    test.done();
};

exports['Form.validate - empty numbers'] = function (test) {
    test.expect(1);
    var f = new forms.Form({
        one: fields.number(),
        two: fields.number()
    });
    f.validate({});
    test.strictEqual(f.isValid(), false);
    test.done();
};

exports['Form.validate - strings'] = function (test) {
    test.expect(3);
    var f = new forms.Form({
        one: fields.string(),
        two: fields.string()
    });
    f.validate({form: {one: 'one', two: 'two'}});
    test.same(f.values, {one: 'one', two: 'two'});
    test.same(f.raw, {one: 'one', two: 'two'});
    test.same(f.errors, []);
    test.done();
};

exports['Form.validate - empty strings'] = function (test) {
    test.expect(5);
    var f = new forms.Form({
        foo: fields.string({required: true}),
        bar: fields.string({required: false})
    });

    f.validate({form: {}});
    test.strictEqual(f.isValid(), false);

    f.validate({form: { foo: null }});
    test.strictEqual(f.isValid(), false);

    f.validate({form: { foo: '' }});
    test.strictEqual(f.isValid(), false);

    f.validate({form: { foo: 'baz' }});
    test.strictEqual(f.isValid(), true);

    f.validate({form: { foo: 'baz', bar: null }});
    test.strictEqual(f.isValid(), true);

    test.done();
};

exports['Form.validate - groups'] = function (test) {
    test.expect(2);
    var f = new forms.Form({
        group: {
            group: {
                test: fields.string({required: true})
            }
        }
    });

    f.validate({form: {}});
    test.strictEqual(f.isValid(), false);

    f.validate({form: { group: { group: { test: 'test' }}}});
    test.strictEqual(f.isValid(), true);

    test.done();
};

exports['Form.validate - throw error on string field'] = function (test) {
    test.expect(1);
    var req = {};
    var f = new forms.Form({
        bar: 'test',
        baz: fields.string()
    });
    try {
        f.validate(req);
    } catch (e) {
        test.equals(/not supported/i.test(e.message), true);
    }
    test.done();
};

exports['Form.validate - options.exclude'] = function (test) {
    var fieldset = {
        foo: fields.string(),
        bar: fields.number(),
        baz: fields.number({required: false})
    };

    var f;

    f = new forms.Form(fieldset, null, { exclude: ['bar', 'baz'] });
    f.validate({form: {foo: 'foo'}});
    // Although 'bar' is excluded, its required for the fieldset to validate
    // overall. Unless the form was initialized with a document containing
    // a value for 'bar', validation should fail.
    test.strictEqual(f.isValid(), false);

    f = new forms.Form(fieldset, null, { exclude: ['baz'] });
    f.validate({form: {foo: 'foo', bar: 123}});
    test.strictEqual(f.isValid(), true);

    // only render fields not excluded
    var calls = [];
    function TestRenderer() {
        this.start = function () {};
        this.beginGroup = function () {};
        this.endGroup = function () {};
        this.field = function (field, path, value, raw, errors) {
            calls.push(path.join('.'));
        };
        this.end = function () {};
    }
    f.toHTML({}, TestRenderer);
    test.same(calls, ['foo', 'bar']);

    // with initial values
    f = new forms.Form(fieldset, {bar: 123}, { exclude: ['bar', 'baz'] });
    f.validate({form: {foo: 'foo'}});
    test.strictEqual(f.isValid(), true);
    test.same(f.values, {foo: 'foo', bar: 123});

    f = new forms.Form(fieldset, {bar: 123}, { exclude: ['baz'] });
    f.validate({form: {foo: 'foo', bar: 456}});
    test.strictEqual(f.isValid(), true);
    test.same(f.values, {foo: 'foo', bar: 456});

    // with field's default values
    fieldset = {
        one: fields.string({
            default_value: function (userCtx) {
                return 'default value';
            }
        }),
        two: fields.string()
    };
    f = new forms.Form(fieldset, null, { exclude: ['one'] });
    f.validate({form: {two: 'asdf'}});
    test.strictEqual(f.isValid(), true);
    test.same(f.values, {one: 'default value', two: 'asdf'});

    test.done();
};

exports['Form.validate - don\'t merge embedded'] = function (test) {
    var Type = types.Type;
    var t = new Type('t1', {
        fields: {
            name: fields.string({required: false})
        }
    });

    var fieldset = {
        t1_list: fields.embedList({type: t, required: false}),
        t1_single: fields.embed({type: t, required: false})
    };
    var f, olddoc;

    olddoc = {t1_single: {_id: 'id1', name: 'test'}, t1_list: []};
    f = new forms.Form(fieldset, olddoc);
    f.validate({form: {t1_single: '{"_id": "id1", "name":"foo"}'}});

    // check that the t1_single wasn't merged
    test.same(
        JSON.stringify(f.values.t1_single),
        JSON.stringify({_id: 'id1', name: 'foo'})
    );


    olddoc = {t1_list: [
        {_id: 'id1', name: 'test'},
        {_id: 'id2', name: 'test2'}
    ]};
    f = new forms.Form(fieldset, olddoc);
    f.validate({form: {
        't1_list.0': '{"_id": "id1", "name":"foo"}'
    }});

    // check that the t1_single wasn't merged
    test.same(
        JSON.stringify(f.values.t1_list),
        JSON.stringify([{_id: 'id1', name: 'foo'}])
    );


    test.done();
};

exports['Form.validate - clear field for excluded fields'] = function (test) {
    var fieldset = {
        one: fields.string()
    };
    var f = new forms.Form(fieldset, null, {
        exclude: ['one']
    });
    f.validate({form: {}, userCtx: {}});
    test.equal(f.errors.length, 1);
    var e = f.errors[0];
    test.strictEqual(e.field, undefined);
    test.ok(/required/i.test(e.message || e.toString()));
    test.done();
};

exports['Form.validate - clear for fields not in subset'] = function (test) {
    var fieldset = {
        one: fields.string(),
        two: fields.string({required: false})
    };
    var f = new forms.Form(fieldset, null, {
        fields: ['two']
    });
    f.validate({form: {}, userCtx: {}});
    test.equal(f.errors.length, 1);
    var e = f.errors[0];
    test.strictEqual(e.field, undefined);
    test.ok(/required/i.test(e.message || e.toString()));
    test.done();
};

exports['Form.validate - options.fields'] = function (test) {
    var fieldset = {
        foo: fields.string(),
        bar: fields.number(),
        baz: fields.number({required: false})
    };

    var f;

    f = new forms.Form(fieldset, null, { fields: ['bar', 'baz'] });
    f.validate({form: {bar: '123'}});
    test.strictEqual(f.isValid(), false);

    f = new forms.Form(fieldset, null, { fields: ['foo', 'bar'] });
    f.validate({form: {foo: 'foo', bar: '123'}});
    test.strictEqual(f.isValid(), true);

    // only render fields included in fields list
    var calls = [];
    function TestRenderer() {
        this.start = function () {};
        this.beginGroup = function () {};
        this.endGroup = function () {};
        this.field = function (field, path, value, raw, errors) {
            calls.push(path.join('.'));
        };
        this.end = function () {};
    }
    f.toHTML({}, TestRenderer);
    test.same(calls, ['foo', 'bar']);

    // with initial values
    f = new forms.Form(fieldset, {bar: 123}, { fields: ['foo'] });
    f.validate({form: {foo: 'foo'}});
    test.strictEqual(f.isValid(), true);
    test.same(f.values, {foo: 'foo', bar: 123});

    f = new forms.Form(fieldset, {bar: 123}, { fields: ['foo', 'bar'] });
    f.validate({form: {foo: 'foo', bar: '456'}});
    test.strictEqual(f.isValid(), true);
    test.same(f.values, {foo: 'foo', bar: 456});

    // with field's default values
    fieldset = {
        one: fields.string({
            default_value: function (userCtx) {
                return 'default value';
            }
        }),
        two: fields.string()
    };
    f = new forms.Form(fieldset, null, { fields: ['two'] });
    f.validate({form: {two: 'asdf'}});
    test.strictEqual(f.isValid(), true);
    test.same(f.values, {one: 'default value', two: 'asdf'});

    test.done();
};

exports['Form.isValid'] = function (test) {
    var f = new forms.Form();
    f.errors = [];
    test.strictEqual(f.isValid(), true);
    f.errors = ['error'];
    test.strictEqual(f.isValid(), false);
    test.done();
};

exports['override'] = function (test) {
    test.same(
        forms.override(
            null, // excludes
            null, // subset
            { a: fields.string(), // fields
              b: fields.string(), c: fields.string() },
            {a: 'one', b: 'two'}, // doc a
            {c: 'three'}, // doc b
            [] // path
        ),
        {a: 'one', b: 'two', c: 'three'}
    );
    test.same(
        forms.override(
            null,
            null,
            { a: fields.string(),
              b: fields.string(), c: fields.string() },
            {a: 'one', b: 'two'},
            {c: 'three', b: 'foo'},
            []
        ),
        {a: 'one', b: 'foo', c: 'three'}
    );
    test.same(
        forms.override(
            null,
            null,
            { a: fields.string(),
              group: { b: fields.string(), c: fields.string() } },
            {a: 'one', group: {b: 'two'}},
            {group: {c: 'three', b: 'foo'}},
            []
        ),
        {a: 'one', group: {b: 'foo', c: 'three'}}
    );
    // merge sub-paths
    test.same(
        forms.override(
            null,
            null,
            { a: fields.string(),
              group: { b: fields.string(), c: fields.string() } },
            {a: 'one', group: {b: 'two'}},
            {group: {c: 'three'}},
            []
        ),
        {a: 'one', group: {b: 'two', c: 'three'}}
    );
    // don't merge embedded types
    test.same(
        forms.override(
            null,
            null,
            { a: fields.string(),
              group: fields.embed({type: {}}) },
            {a: 'one', group: {b: 'two'}},
            {group: {c: 'three'}},
            []
        ),
        {a: 'one', group: {c: 'three'}}
    );
    // don't override if field is excluded
    test.same(
        forms.override(
            ['group.b'],
            null,
            { a: fields.string(),
              group: { b: fields.string(), c: fields.string() } },
            {a: 'one', group: {b: 'two'}},
            {group: {c: 'three', b: 'foo'}},
            []
        ),
        {a: 'one', group: {b: 'two', c: 'three'}}
    );
    // override only if field is in subset (if specified)
    test.same(
        forms.override(
            null,
            ['group.b'],
            { a: fields.string(),
              group: { b: fields.string(), c: fields.string() } },
            {a: 'one', group: {b: 'two'}},
            {group: {c: 'three', b: 'foo'}},
            []
        ),
        {a: 'one', group: {b: 'foo'}}
    );
    // override ad exclude working together
    test.same(
        forms.override(
            ['a'],
            ['group.b'],
            { a: fields.string(),
              group: { b: fields.string(), c: fields.string() } },
            {a: 'one', group: {b: 'two'}},
            {a: 'asdf', group: {c: 'three', b: 'foo'}},
            []
        ),
        {a: 'one', group: {b: 'foo'}}
    );
    test.done();
};


exports['override - attachments'] = function (test) {
    test.same(
        forms.override(
            null, // excludes
            null, // subset
            {a: fields.attachments()}, // fields
            {_attachments: {
                'a/foo.ext': {data: 'one'},
                'b/bar.ext': {data: 'two'}
            }}, // doc a
            {}, // doc b
            [] // path
        ),
        {_attachments: {
            'b/bar.ext': {data: 'two'}
        }}
    );
    test.same(
        forms.override(
            null, // excludes
            null, // subset
            {a: fields.attachments()}, // fields
            {_attachments: {
                'a/foo.ext': {data: 'one'}
            }}, // doc a
            {_attachments: {
                'b/bar.ext': {data: 'two'}
            }}, // doc b
            [] // path
        ),
        {_attachments: {
            'b/bar.ext': {data: 'two'}
        }}
    );
    // override if directory paths match
    test.same(
        forms.override(
            null, // excludes
            null, // subset
            {a: fields.attachments()}, // fields
            {_attachments: {
                'a/foo.ext': {data: 'one'}
            }}, // doc a
            {_attachments: {
                'a/bar.ext': {data: 'two'}
            }}, // doc b
            [] // path
        ),
        {_attachments: {
            'a/bar.ext': {data: 'two'}
        }}
    );
    // don't override if field is excluded
    test.same(
        forms.override(
            ['a'], // excludes
            null, // subset
            {a: fields.attachments()}, // fields
            {_attachments: {
                'a/foo.ext': {data: 'one'}
            }}, // doc a
            {_attachments: {
                'a/bar.ext': {data: 'two'}
            }}, // doc b
            [] // path
        ),
        {_attachments: {
            'a/foo.ext': {data: 'one'}
        }}
    );
    // override only if field is in subset (if specified)
    test.same(
        forms.override(
            null, // excludes
            ['a'], // subset
            {
                a: fields.attachments(),
                b: fields.attachments()
            }, // fields
            {_attachments: {
                'a/foo.ext': {data: 'one'},
                'b/foo.ext': {data: 'three'}
            }}, // doc a
            {_attachments: {
                'a/bar.ext': {data: 'two'},
                'b/bar.ext': {data: 'four'}
            }}, // doc b
            [] // path
        ),
        {_attachments: {
            'a/bar.ext': {data: 'two'},
            'b/foo.ext': {data: 'three'}
        }}
    );
    test.done();
};
