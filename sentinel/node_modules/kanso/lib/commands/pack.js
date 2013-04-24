var utils = require('../utils'),
    settings = require('../settings'),
    logger = require('../logger'),
    tar = require('../tar'),
    argParse = require('../args').parse;


exports.summary = 'Pack a package into a .tar.gz file';

exports.usage = '' +
'kanso pack [PACKAGE_PATH]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE_PATH    Path to package directory to pack (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --outfile    Target output file (defaults to <NAME>-<VERSION>.tar.gz)';


exports.run = function (_settings, args) {
    var a = argParse(args, {
        'outfile': {match: '--outfile', value: true}
    });
    var dir = a.positional[0] || '.';
    var outfile = a.options.outfile;

    function create() {
        tar.create(outfile, dir, function (err) {
            if (err) {
                return logger.error(err);
            }
            logger.end(outfile);
        });
    }

    if (!outfile) {
        settings.load(dir, function (err, cfg) {
            if (err) {
                return logger.error(err);
            }
            outfile = cfg.name + '-' + cfg.version + '.tar.gz';
            create();
        });
    }
    else {
        create();
    }
};
