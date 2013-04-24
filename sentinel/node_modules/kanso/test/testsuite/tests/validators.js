var validators = require('couchtypes/validators');


exports['min'] = function (test) {
    test.expect(1);
    try {
        validators.min(100)('doc', 50, 50);
    }
    catch (e) {
        test.equal(
            e.message, 'Please enter a value greater than or equal to 100'
        );
    }
    // this should not throw an error
    validators.min(100)('doc', 100, 100);
    test.done();
};

exports['max'] = function (test) {
    test.expect(1);
    try {
        validators.max(100)('doc', 150, 150);
    }
    catch (e) {
        test.equal(
            e.message, 'Please enter a value less than or equal to 100'
        );
    }
    // this should not throw an error
    validators.max(100)('doc', 100, 100);
    test.done();
};

exports['range'] = function (test) {
    test.expect(1);
    try {
        validators.range(10, 20)('doc', 50, 50);
    }
    catch (e) {
        test.equals(e.message, 'Please enter a value between 10 and 20');
    }
    // this should not throw an error
    validators.range(10, 20)('doc', 15, 15);
    test.done();
};

exports['regexp'] = function (test) {
    test.expect(2);
    try {
        validators.regexp(/^\d+$/)('doc', 'abc123', 'abc123');
    }
    catch (e) {
        test.equals(e.message, 'Invalid format');
    }
    // this should not throw
    validators.regexp(/^\d+$/)('doc', '123', '123');

    // custom error message
    var v = validators.regexp('^\\d+$', 'my message');
    try {
        v('doc', 'abc123', 'abc123');
    }
    catch (e2) {
        test.equals(e2.message, 'my message');
    }
    test.done();
};

exports['email'] = function (test) {
    test.expect(1);
    try {
        validators.email()('doc', 'asdf', 'asdf');
    }
    catch (e) {
        test.equals(e.message, 'Please enter a valid email address');
    }
    // this should not throw
    validators.email()('doc', 'asdf@asdf.com', 'asdf@asdf.com');
    validators.email()('doc', 'a←+b@f.museum', 'a←+b@f.museum');
    test.done();
};

exports['url'] = function (test) {
    test.expect(1);
    try {
        validators.url()('doc', 'asdf.com', 'asdf.com');
    }
    catch (e) {
        test.equals(e.message, 'Please enter a valid URL');
    }
    validators.url()('doc', 'http://asdf.com', 'http://asdf.com');
    test.done();
};

exports['minlength'] = function (test) {
    test.expect(1);
    try {
        validators.minlength(5)('doc', '1234', '1234');
    }
    catch (e) {
        test.equals(e.message, 'Please enter at least 5 characters');
    }
    // this should not throw
    validators.minlength(5)('doc', '12345', '12345');
    test.done();
};

exports['maxlength'] = function (test) {
    try {
        validators.maxlength(5)('doc', '123456', '123456');
    }
    catch (e) {
        test.equals(e.message, 'Please enter no more than 5 characters');
    }
    // this should not throw
    validators.maxlength(5)('doc', '12345', '12345');
    test.done();
};

exports['rangelength'] = function (test) {
    test.expect(2);
    try {
        validators.rangelength(2, 4)('doc', '12345', '12345');
    }
    catch (e) {
        test.equals(
            e.message,
            'Please enter a value between 2 and 4 characters long'
        );
    }
    try {
        validators.rangelength(2, 4)('doc', '1', '1');
    }
    catch (e2) {
        test.equals(
            e2.message,
            'Please enter a value between 2 and 4 characters long'
        );
    }
    // this should not throw
    validators.rangelength(2, 4)('doc', '12', '12');
    validators.rangelength(2, 4)('doc', '1234', '1234');
    test.done();
};
