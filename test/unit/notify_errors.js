var _ = require('underscore'),
    sinon = require('sinon'),
    transition = require('../../transitions/notify_errors'),
    config = require('../../config');
    utils = require('../../lib/utils');

var restore = function(objs) {
    _.each(objs, function(obj) {
        if (obj.restore) obj.restore();
    });
};

exports.tearDown = function(callback) {
    restore([
        utils.getLocale,
        config.get
    ]);
    callback();
};

exports['onMatch signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 4);
    test.done();
};

exports['filter signature'] = function(test) {
    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
};

exports['filter tests: empty doc does not match'] = function(test) {
    test.ok(!transition.filter({}));
    test.done();
};

exports['filter tests: missing form does not match'] = function(test) {
    test.ok(!transition.filter({
        type: 'data_record',
        errors: [ { code: 'sys.form_not_found' } ]
    }));
    test.done();
};

exports['filter tests: missing error does not match'] = function(test) {
    test.ok(!transition.filter({
        type: 'data_record',
        form: 'x',
        errors: [ { code: 'WRONG' } ]
    }));
    test.done();
};

exports['filter tests: match'] = function(test) {
    test.ok(transition.filter({
        type: 'data_record',
        form: 'x',
        errors: [
            { code: 'WRONG' },
            { code: 'sys.form_not_found' }
        ]
    }));
    test.done();
};

exports['error adds response'] = function(test) {

    var doc = {
        type: 'data_record',
        form: 'XXX',
        from: '+2468',
        errors: [ { code: 'sys.form_not_found' } ]
    };

    sinon.stub(config, 'get').returns([
        { 
            key: 'WRONG'
        },
        { 
            key: 'sys.form_not_found',
            translations: [
                { locale: 'es', content: 'WRONG' },
                { locale: 'en', content: 'Form {{form}} not found.' } 
            ]
        }
    ]);

    sinon.stub(utils, 'getLocale').returns('en');

    transition.onMatch({ doc: doc }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.tasks.length, 1);
        test.equals(doc.tasks[0].messages[0].message, 'Form XXX not found.');
        test.equals(doc.tasks[0].messages[0].to, '+2468');
        test.done();
    });
};
