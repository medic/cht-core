var path = require('path'),
    exec = require('child_process').exec,
    fs = require('fs.extra'),
    _ = require('underscore'),
    npm_cmd = "npm pack ";


module.exports = {
    run : function(root, path_loc, kanso_json, doc, callback) {
        var folder_names = get_folder_names(kanso_json),
            dependencies_included = !!kanso_json.dependencies_included;

        root = _.isString(root) ? root : '';

        async.forEachSeries(
            folder_names,
            function(folder_name, callbackEach) {
                var working_folder_name = folder_name + '_working',
                    src_folder = path.join(root, folder_name),
                    package_folder = path.join(root, working_folder_name),
                    generated_package_json,
                    expected_tgz_name;

                async.waterfall([
                    function(callback) {
                        copy_node_dir(src_folder, package_folder, callback);
                    },
                    function(callback) {
                        read_package_json(package_folder, kanso_json, dependencies_included, callback);
                    },
                    function(package_json, callback) {
                        generated_package_json = package_json;
                        write_package_json(package_json, package_folder, callback);
                    },
                    function(callback) {
                        generate_tgz(package_folder, callback);
                    },
                    function(callback) {
                        expected_tgz_name = generate_tgz_name(generated_package_json);
                        attach_tgz(expected_tgz_name, doc, callback);
                    },
                    function(doc, callback) {
                        add_node_info(doc, expected_tgz_name, callback);
                    }
                ], function(err, doc) {
                    clean_up(package_folder, expected_tgz_name, function() {
                        callbackEach(err);
                    });
                });
            },
            function(err) {
                console.log(doc);
                callback(err, doc);
            }
        )
    }
};

function get_folder_names(kanso_json) {
    var node_module_folders = 
            kanso_json.node_module_folder || kanso_json.node_module_folders;
    if (!node_module_folders) {
        return ['node_module'];
    }
    return node_module_folders.split(',');
}

function generate_full_command(package_folder) {
    return npm_cmd + ' ' + package_folder;
}

function copy_node_dir(from, to, callback) {
    fs.copyRecursive(from, to, callback);
}

function clean_up(dir, tgz_file, callback) {
    async.parallel([
        function(cb) {
            fs.rmrf(dir, cb);
        },
        function(cb) {
            if (tgz_file) {
                fs.unlink(tgz_file, cb);
            }
        }
    ], callback);
}

function sane_package_json(kanso_json) {
    var package_json = _.extend({}, kanso_json);
    _.each(['_id',
            'minify',
            'dependencies',
            'load',
            'modules',
            'attachments',
            'dust',
            'duality',
            'coffee-script',
            'less',
            'bundledDependencies'],
    function(field) {
        if (package_json[field]) delete package_json[field];
    });
    return package_json;
}

function read_package_json(package_folder, kanso_json, dependencies_included, callback) {
    var package_json = path.join(package_folder, 'package.json');
    var sane_defaults = sane_package_json(kanso_json);

    fs.readFile(package_json, function(err, content) {
        if (err && err.code !== 'ENOENT') return  callback(err);
        var json = {};
        if (content) {
            json = JSON.parse(content);
        }
        var p_json = _.defaults(json, sane_defaults);

        if (dependencies_included) {
            p_json.bundledDependencies = _.keys(p_json.dependencies);

            delete p_json.dependencies;
            delete p_json.devDependencies;
        }

        callback(null, p_json);
    });
}

function write_package_json(package_json, package_folder, callback) {
    var package_json_file = path.join(package_folder, 'package.json');
    fs.writeFile(package_json_file, JSON.stringify(package_json), function(err){
        if (err) return callback(err);

        // the following allows a package.tgz to have the same hash if nothing has changed
        var time = new Date(0);
        fs.utimes(package_json_file, time, time, callback);

    });
}


function generate_tgz_name(package_json) {
    return package_json.name + '-' + package_json.version + '.tgz';
}

function generate_tgz(package_folder, callback) {
    var cmd = generate_full_command(package_folder);
    console.log('running: ' + cmd);

    exec(cmd, function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        callback(err);
    });
}


function attach_tgz(tgz_name, doc, callback) {
    fs.readFile(tgz_name, function (err, content) {
        if (err) return callback(err);

        if (!doc._attachments) {
            doc._attachments = {};
        }
        doc._attachments[tgz_name] = {
            'content_type': 'application/octet-stream',
            'data': content.toString('base64')
        };
        callback(null, doc);
    });
}


function add_node_info(doc, expected_tgz_name, callback) {
    var modules = doc.node_modules ? doc.node_modules + ',' : '';
    modules += expected_tgz_name;

    doc.node_modules = modules;
    if (!doc.kanso) doc.kanso = {};
    if (!doc.kanso.config) doc.kanso.config = {};
    doc.kanso.config.node_modules = modules;
    callback(null, doc);
}
