var couchdb = require('../couchdb'),
    logger = require('../logger'),
    utils = require('../utils'),
    argParse = require('../args').parse,
    async = require('async'),
    csv = require('csv/lib/csv'),
    json = require('../data-stream'),
    events = require('events'),
    util = require('util'),
    url = require('url'),
    fs = require('fs'),
    evals = process.binding('evals'),
    Script = evals.Script || evals.NodeScript;


exports.summary = 'Performs tranformations on JSON files';
exports.usage = '' +
'kanso transform TRANSFORMATION [OPTIONS] SOURCE TARGET\n' +
'\n' +
'Parameters:\n' +
'  TRANFORMATION    The operation to perform on SOURCE\n' +
'  SOURCE           The source file to use as input\n' +
'  TARGET           The filename for saving the output to\n' +
'\n' +
'Tranformations:\n' +
'  clear-ids    Clear the _id property of each document in the SOURCE file\n' +
'  add-ids      Fetch UUIDs from a CouchDB instance and use as _ids for\n' +
'               each doc in the SOURCE file.\n' +
'  csv          Convert a .csv file to JSON. Each row is converted to a\n' +
'               JSON object, using the values from the first row as\n' +
'               property names.\n' +
'  map          Pass each doc in the SOURCE file through a map function\n' +
'               writing the transformed result to TARGET. If the map\n' +
'               function returns nothing, the document is omitted from the\n' +
'               output.\n' +
'\n' +
'Options:\n' +
'  -i, --indent    The number of spaces to use for indentation, by default\n' +
'                  output is not indented. Use --indent=tabs to use tabs.\n' +
'  -u, --url       The CouchDB instance to fetch UUIDs from. Defaults to\n' +
'                  http://localhost:5984\n' +
'  -F, --format    The native JSON types to use for each column when\n' +
'                  converting from CSV. This should be a string,\n' +
'                  comma-separated.\n' +
'                  Example: --format="string,number,boolean,string"\n' +
'  -d, --delimiter The delimiter to use in when converting from CSV.\n' +
'                  A comma is the default value.\n' +
'                  Passing tab will use a \\t character\n' +
'                  Example: --delimiter="tab"\n' +
'  -m, --module    The module to load a map function from.\n' +
'  -s, --src       The source code to use for a map function.';


function IDStream(db, cacheNum) {
    var that = this;
    this.cache = [];
    this.fetching = false;
    this.on('fetching', function (cacheNum) {
        if (!this.fetching) {
            db.uuids(cacheNum, function (err, uuids) {
                if (err) {
                    that.emit('error', err);
                }
                else {
                    that.fetching = false;
                    that.cache = uuids;
                    that.emit('new_ids', that.cache);
                }
            });
        }
        this.fetching = true;
    });
    this.once('new_ids', function () {
        that.emit('ready');
    });
    this.readID = function (callback) {
        if (!this.cache.length) {
            throw new Error('No IDs ready');
        }
        else {
            if (this.cache.length === 1) {
                this.once('new_ids', function () {
                    that.readID(callback);
                });
                if (!this.fetching) {
                    this.emit('fetching', cacheNum);
                }
            }
            else {
                callback(this.cache.shift());
            }
        }
    };
    that.setMaxListeners(cacheNum - 1);
    process.nextTick(function () {
        that.emit('fetching', cacheNum);
    });
};
util.inherits(IDStream, events.EventEmitter);

exports.createIDStream = function (db, cache) {
    return new IDStream(db, cache);
};


exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'indent': {match: ['--indent','-i'], value: true},
        'url':    {match: ['--url','-u'],    value: true},
        'format': {match: ['--format','-F'], value: true},
        'delimiter': {match: ['--delimiter','-d'], value: true},
        'module': {match: ['--module','-m'], value: true},
        'src':    {match: ['--src','-s'], value: true}
    });
    var couchdb_url = a.options.url || 'http://localhost:5984';
    var indent = a.options.indent;
    if (indent !== 'tabs' && indent !== undefined) {
        indent = parseInt(indent, 10);
        if (isNaN(indent)) {
            logger.error('--indent option must be a number or "tabs"');
            return;
        }
    }
    var ilead = '';
    if (indent === 'tabs') {
        ilead = '\t';
    }
    else if (indent) {
        for (var i = 0; i < indent; i++) {
            ilead += ' ';
        }
    }
    a.options.ilead = ilead;

    // /_uuids is at the root couchdb instance level, not the db level
    var parsed = url.parse(couchdb_url);
    delete parsed.pathname;
    delete parsed.query;
    delete parsed.search;
    var couchdb_root_url = url.format(parsed);
    var db = couchdb(couchdb_root_url);

    a.options.couchdb_root_url = couchdb_root_url;

    var trans = a.positional[0];

    var source = a.positional[1];
    var target = a.positional[2];
    if (!source) {
        logger.error('No SOURCE file');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    if (!target) {
        logger.error('No TARGET file');
        logger.info('Usage: ' + exports.usage);
        return;
    }

    if (trans === 'clear-ids') {
        exports.clearIDs(db, source, target, a.options);
    }
    else if (trans === 'add-ids') {
        exports.addIDs(db, source, target, a.options);
    }
    else if (trans === 'csv') {
        exports.csv(db, source, target, a.options);
    }
    else if (trans === 'map') {
        exports.map(db, source, target, a.options);
    }
    else {
        if (trans){
            logger.error('Unknown transformation: ' + trans);
        }
        else {
            logger.error('No transformation specified');
        }
        logger.info('Usage: ' + exports.usage);
        return;
    }
};


exports.clearIDs = function (db, source, target, options) {
    var i = 0;
    var doctype = null;
    var p = json.createParseStream();
    var rstream = fs.createReadStream(source);
    rstream.pause();

    var outfile = fs.createWriteStream(target);
    outfile.on('error', function (err) {
        logger.error(err);
    });
    outfile.on('open', function (fd) {
        outfile.on('drain', function () {
            rstream.resume();
        });
        p.on('type', function (type) {
            doctype = type;
            if (doctype === 'array') {
                outfile.write('[');
            }
        });
        p.on('doc', function (doc) {
            delete doc._id;
            var output = JSON.stringify(doc, null, options.ilead);
            if (doctype === 'array') {
                // prepent indent (because its in an array)
                output = options.ilead +
                         output.split('\n').join('\n' + options.ilead);
                // prepend end of previous doc
                output = (i > 0 ? ',\n': '\n') + output;
            }
            var flushed = outfile.write(output);
            if (!flushed) {
                rstream.pause();
            }
            i++;
            if (i % 100 === 0 && i != 0) {
                console.log('Transformed ' + i + ' docs');
            }
        });
        p.on('error', function (err) {
            logger.error(err);
        });
        p.on('end', function () {
            if (i % 100 !== 0) {
                console.log('Transformed ' + i + ' docs');
            }
            if (doctype === 'array') {
                outfile.write('\n]\n');
            }
            logger.end('Saved ' + i + ' docs to ' + target);
        });
        rstream.pipe(p);
        rstream.resume();
    });
};


exports.addIDs = function (db, source, target, options) {
    var i = 0;
    var doctype = null;
    var p = json.createParseStream();
    var rstream = fs.createReadStream(source);
    rstream.pause();

    var idstream = exports.createIDStream(db, 1000);
    idstream.on('error', function (err) {
        logger.error(err);
    });
    idstream.on('new_ids', function () {
        //rstream.resume();
    });
    idstream.on('fetching', function (cacheNum) {
        var dburl = url.format(db.instance);
        logger.info('Fetching ' + cacheNum + ' UUIDs from ' + dburl);
        //rstream.pause();
    });
    idstream.on('ready', function () {
        var outfile = fs.createWriteStream(target);
        outfile.on('error', function (err) {
            logger.error(err);
        });
        outfile.on('open', function (fd) {
            outfile.on('drain', function () {
                rstream.resume();
            });
            p.on('type', function (type) {
                doctype = type;
                if (doctype === 'array') {
                    outfile.write('[');
                }
            });
            p.on('doc', function (doc) {
                rstream.pause();
                idstream.readID(function (uuid) {
                    doc._id = uuid;
                    var output = JSON.stringify(doc, null, options.ilead);
                    if (doctype === 'array') {
                        // prepent indent (because its in an array)
                        output = options.ilead +
                                 output.split('\n').join('\n' + options.ilead);
                        // prepend end of previous doc
                        output = (i > 0 ? ',\n': '\n') + output;
                    }
                    var flushed = outfile.write(output);
                    if (!flushed) {
                        rstream.pause();
                    }
                    else {
                        rstream.resume();
                    }
                    i++;
                    if (i % 100 === 0 && i != 0) {
                        console.log('Transformed ' + i + ' docs');
                    }
                });
            });
            p.on('error', function (err) {
                logger.error(err);
            });
            p.on('end', function () {
                if (i % 100 !== 0) {
                    console.log('Transformed ' + i + ' docs');
                }
                if (doctype === 'array') {
                    outfile.write('\n]\n');
                }
                logger.end('Saved ' + i + ' docs to ' + target);
            });
            rstream.pipe(p);
            rstream.resume();
        });
    });
};


exports.csv = function (db, source, target, options) {
    var headings = null;
    var results = [];

    function trim(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/); // trim type
    }

    var formats = options.format;
    if (formats) {
        formats = formats.split(',').map(trim).map(function (f) {
            return f.toLowerCase();
        });
    }

    var delimiter = options.delimiter || ",";
    if(delimiter.toLowerCase() === 'tab') {
        delimiter = "\t";
    }

    var outfile = fs.createWriteStream(target);
    outfile.on('error', function (err) {
        logger.error(err);
    });
    outfile.on('open', function (fd) {
        outfile.write('[');
        var csvfile = csv().fromPath(source,{"delimiter": delimiter});
        outfile.on('drain', function () {
            csvfile.readStream.resume();
        });
        csvfile.on('data', function(data, index){
            if (index === 0) {
                headings = data;
            }
            else {
                var obj = {};
                for (var i = 0, len = data.length; i < len; i++) {
                    if (formats && formats[i]) {
                        switch (formats[i]) {
                            case 'number':
                                obj[headings[i]] = Number(data[i]);
                                break;
                            case 'boolean':
                                if (trim(data[i]).toLowerCase() === 'false' ||
                                    trim(data[i]) === '0') {
                                    obj[headings[i]] = false;
                                }
                                else {
                                    obj[headings[i]] = Boolean(data[i]);
                                }
                                break;
                            case 'string':
                                obj[headings[i]] = data[i];
                                break;
                            default:
                                throw new Error(
                                    'Unknown format type: ' + formats[i]
                                );
                        }
                    }
                    else if (headings[i] && data[i] !== '') {
                        obj[headings[i]] = data[i];
                    }
                }
                var output = JSON.stringify(obj, null, options.ilead);
                // prepent indent (because its in an array)
                output = options.ilead +
                         output.split('\n').join('\n' + options.ilead);
                var flushed = outfile.write(
                    (index > 1 ? ',\n': '\n') + output
                );
                if (!flushed) {
                    csvfile.readStream.pause();
                }
            }
            if (index % 100 === 0 && index != 0) {
                console.log('Transformed ' + index + ' rows');
            }
        });
        csvfile.on('end', function(count){
            if ((count-1) % 100 !== 0) {
                console.log('Transformed ' + (count - 1) + ' rows');
            }
            outfile.on('close', function () {
                logger.end('Saved ' + (count - 1) + ' entries to ' + target);
            });
            outfile.write('\n]\n');
            outfile.end();
        });
        csvfile.on('error', function(error){
            logger.error(error.message);
        });
    });
};


exports.map = function (db, source, target, options) {
    var mapfn;
    var omitted = 0;

    if (options.module) {
        mapfn = require(utils.abspath(options.module).replace(/\.js$/, ''));
    }
    else if (options.src) {
        mapfn = new Script('(' + options.src + ')').runInNewContext({
            log: function () {
                 return console.log.apply(console, arguments);
            },
            console: console
        });
    }
    else {
        logger.error(
            'Must specify either a source string (--src) or module' +
            '(--module) to use as a map function.'
        );
        return;
    }

    var i = 0;
    var doctype = null;
    var p = json.createParseStream();
    var rstream = fs.createReadStream(source);
    rstream.pause();

    var outfile = fs.createWriteStream(target);
    outfile.on('error', function (err) {
        logger.error(err);
    });
    outfile.on('open', function (fd) {
        outfile.on('drain', function () {
            rstream.resume();
        });
        p.on('type', function (type) {
            doctype = type;
            if (doctype === 'array') {
                outfile.write('[');
            }
        });
        p.on('doc', function (doc) {
            var result = mapfn(doc);
            if (result) {
                var output = JSON.stringify(result, null, options.ilead);
                if (doctype === 'array') {
                    // prepent indent (because its in an array)
                    output = options.ilead +
                             output.split('\n').join('\n' + options.ilead);
                    // prepend end of previous doc
                    output = (i > 0 ? ',\n': '\n') + output;
                }
                var flushed = outfile.write(output);
                if (!flushed) {
                    rstream.pause();
                }
            }
            else {
                omitted++;
            }
            i++;
            if (i % 100 === 0 && i != 0) {
                console.log('Transformed ' + i + ' docs');
            }
        });
        p.on('error', function (err) {
            logger.error(err);
        });
        p.on('end', function () {
            if (i % 100 !== 0) {
                console.log('Transformed ' + i + ' docs');
            }
            if (doctype === 'array') {
                outfile.write('\n]\n');
            }
            logger.end(
                'Saved ' + (i - omitted) + ' docs to ' + target +
                ' (' + omitted + ' omitted)'
            );
        });
        rstream.pipe(p);
        rstream.resume();
    });
};
