/*global window: false, $: false*/

var core = require('duality/core');


exports['rewriteGroups'] = function (test) {
    test.same(core.rewriteGroups('/some/path', '/some/path'), {});
    test.same(
        core.rewriteGroups('/path/:name', '/path/somename'),
        {name: 'somename'}
    );
    test.same(
        core.rewriteGroups('/:one/:two/:three', '/a/b/c'),
        {one: 'a', two: 'b', three: 'c'}
    );
    test.same(
        core.rewriteGroups('/path/:name', '/path/foo?test=123'),
        {name: 'foo'}
    );
    test.done();
};

exports['replaceGroups'] = function (test) {
    test.equal(
        core.replaceGroups('/some/string', {some: 'groups'}),
        '/some/string'
    );
    test.equal(
        core.replaceGroups('/some/:group', {group: 'val'}),
        '/some/val'
    );
    test.equal(
        core.replaceGroups('/:one/:two/:three', {
            one: 'a',
            two: 'b',
            three: 'c'
        }),
        '/a/b/c'
    );
    test.equal(
        core.replaceGroups('/some/:group/*', {
            group: 'val'
        }, 'splat/value'),
        '/some/val/splat/value'
    );
    test.equal(
        core.replaceGroups('static/*', {}, 'splat/value'),
        'static/splat/value'
    );
    test.done();
};

exports['rewriteSplat'] = function (test) {
    test.strictEqual(
        core.rewriteSplat('/some/path', '/some/path'),
        undefined
    );
    test.strictEqual(
        core.rewriteSplat('/some/path/*', '/some/path/'),
        ''
    );
    test.equal(
        core.rewriteSplat('/some/path/*', '/some/path/splat/value'),
        'splat/value'
    );
    test.done();
};

exports['script tag context'] = function (test) {
    test.expect(2);
    // a new script tag should access the same context as the originally loaded
    // code, persisting module state between script tags.
    var events = require('duality/events');
    events.on('_test_script_tag_context_event', function () {
        test.ok(true, '_test_script_tag_context_event fired');
    });
    window._script_tag_context = function () {
        test.ok(true, '_script_tag_context called');
    };
    $(document).append('<script>' +
        'window._script_tag_context();' +
        'require("duality/events").emit("_test_script_tag_context_event");' +
    '</script>');
    test.done();
};

exports['circular requires'] = function (test) {
    test.equal(require('lib/module_a').b_name(), 'Module B');
    test.equal(require('lib/module_b').a_name(), 'Module A');
    test.done();
};
