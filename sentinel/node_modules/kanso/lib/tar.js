var child_process = require('child_process'),
    spawn = child_process.spawn,
    repository = require('./repository'),
    settings = require('./settings'),
    logger = require('./logger'),
    utils = require('./utils'),
    path = require('path'),
    fs = require('fs'),
    pathExists = fs.exists || path.exists;


/**
 * Reports tar --version output
 */

exports.version = function (callback) {
    child_process.exec('tar --version', function (err, stdout, stderr) {
        if (err) {
            return callback(err);
        }
        if (stderr) {
            return callback(new Error('Error getting tar version\n' + stderr));
        }
        callback(null, stdout.toString());
    });
};

/**
 * Checks if using BSD tar
 */

exports.isBSD = function (callback) {
    exports.version(function (err, output) {
        if (err) {
            return callback(err);
        }
        callback(null, output.indexOf('bsdtar') !== -1);
    });
};

exports.excludeList = function (dir, cfg, callback) {
    var excludes = [
        '.kansorc',
        '.git',
        '.gitignore',
        '.gitmodules',
        '.*.swp' // vim swp files
    ];
    if (!cfg.bundledDependencies) {
        // exclude packages directory by default, unless there
        // are bundled dependencies defined
        excludes.push('packages');
        return callback(null, excludes);
    }
    fs.readdir(dir + '/packages', function (err, files) {
        if (err) {
            return callback(err);
        }
        // convert to full paths for comparison with package paths
        var bd = cfg.bundledDependencies.map(function (p) {
            return utils.abspath(p, dir);
        });
        excludes = excludes.concat(files.filter(function (f) {
            var fullpath = utils.abspath(f, path.join(dir, 'packages'));
            console.log(fullpath + ' in ' + JSON.stringify(bd));
            return bd.indexOf(fullpath) === -1;
        }));
        return callback(null, excludes);
    });
};

exports.create = function (outfile, dir, callback) {
    async.parallel({
        is_bsd: exports.isBSD,
        read_cfg: async.apply(settings.load, dir)
    },
    function (err, results) {
        if (err) {
            return callback(err);
        }

        var is_bsd = results.is_bsd;
        var cfg = results.read_cfg;

        var tmpfile = repository.TMP_DIR +
            path.basename(outfile) + '-' + new Date().getTime();

        var ignorefile = path.join(dir, '.kansoignore');
        pathExists(ignorefile, function (ignores) {
            var outpath = utils.abspath(tmpfile, process.cwd());
            exports.excludeList(dir, cfg, function (err, excludes) {

                var args = [
                    '-czvf', outpath,
                    '--transform', 'flags=rSH;s/^\./package/'
                ];

                // add exclude flags
                args = args.concat(excludes.reduce(function (arr, ex) {
                    return arr.concat(['--exclude', ex]);
                }, []));

                // directory to pack
                args.push('.');

                if (is_bsd) {
                    // change --transform command to -s
                    args[2] = '-s';
                    args[3] = '/^\./package/';
                }
                if (ignores) {
                    if (is_bsd) {
                        args = args.slice(0, args.length-1).concat(
                            ['-X', ignorefile, '.']
                        );
                    }
                    else {
                        args = args.concat(['-X', ignorefile]);
                    }
                }
                tar = spawn('tar', args, {cwd: dir});

                var err_messages = '';

                tar.stdout.on('data', function (data) {
                    data.toString().split('\n').forEach(function (p) {
                        p = p.replace(/^\.\//, '');
                        if (p) {
                            logger.info('packing', p);
                        }
                    });
                });
                tar.stderr.on('data', function (data) {
                    err_messages += data;
                });

                tar.on('exit', function (code) {
                    if (code !== 0) {
                        return callback(new Error(err_messages));
                    }
                    utils.mv(tmpfile, outfile, callback);
                });
            });
        });
    });
};

exports.extract = function (file, callback) {
    logger.info('extracting', path.basename(file));

    var tarfile = utils.abspath(file, process.cwd());
    tar = spawn('tar', ['-xzvf', tarfile], {cwd: path.dirname(tarfile)});

    var err_messages = '';

    tar.stdout.on('data', function (data) {
        data.toString().split('\n').forEach(function (p) {
            p = p.replace(/^\.\//, '');
            if (p) {
                logger.debug('extracting', p);
            }
        });
    });
    tar.stderr.on('data', function (data) {
        err_messages += data;
    });

    tar.on('exit', function (code) {
        if (code !== 0) {
            return callback(new Error(err_messages));
        }
        return callback();
    });
};
