var exec = require('child_process').exec,
    path = require('path'),
    fs = require('fs'),
    utils = require('../lib/utils');


function appTest(p) {
    return function (test) {
        var pkgpath = path.join(__dirname, p);
        var cmd = __dirname + '/../bin/kanso show ' + pkgpath;

        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                return test.done(err);
            }

            var result = JSON.parse(stdout);
            var expected = JSON.parse(
                fs.readFileSync(pkgpath + '/output.json')
            );
            utils.getKansoVersion(function (err, ver) {
                if (err) {
                    return test.done(err);
                }
                expected.kanso.kanso_version = ver;
                delete result.kanso.build_time;
                delete expected.kanso.build_time;

                test.same(result, expected);
                test.done();
            });
        });
    };
}

exports.postprocessors = appTest('testapps/postprocessors');
exports.preprocessors = appTest('testapps/preprocessors');
exports.intersecting_ranges = appTest('testapps/intersecting_ranges');


function appErrorTest(p, re) {
    return function (test) {
        var pkgpath = path.join(__dirname, p);
        var cmd = __dirname + '/../bin/kanso show ' + pkgpath;

        exec(cmd, function (err, stdout, stderr) {
            if (!err) {
                return test.done(new Error(
                    'Expected building ' + p + ' to result in an error'
                ));
            }
            if (!re.test(stdout.toString())) {
                test.done(new Error(
                    'Error message does not match ' + re.toString() + ':\n' +
                    stdout
                ));
            }
            test.done();
        });
    };
}

exports.conflicting_versions = appErrorTest(
    'testapps/conflicting_versions',
    /Conflicting version requirements for testpkg-3/
);
