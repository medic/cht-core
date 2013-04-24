#!/usr/bin/env node

var fs = require('fs'),
    path = require('path');
    //kansorc = require('kanso/kansorc');


//kansorc.load(function (err, cfg) {

var commands = {
    'clear-cache': null,
    'create': null,
    'createdb': null,
    'deletedb': null,
    'listdb': null,
    'replicate': null,
    'help': [{list: [
        'clear-cache',
        'create',
        'createdb',
        'deletedb',
        'listdb',
        'replicate',
        'help',
        'install',
        'update',
        'ls',
        'pack',
        'publish',
        'push',
        'show',
        'transform',
        'unpublish',
        'upload',
        'uuids'
    ]}],
    'install': [{directories: true, filenames: /.*\.tar\.gz$/}],
    'update': null,
    'ls': [{directories: true}],
    'pack': [{directories: true}],
    'publish': [{directories: true}],
    // TODO: add lookup of environments in .kansorc
    'push': [{environments: true, directories: true}, {environments: true}],
    'show': [{directories: true}],
    'transform': [
        {list: ['clear-ids', 'add-ids', 'csv', 'map']},
        {filenames: /.*/, directories: true}, // could be .json or .csv / .tsv
        {filenames: /.*\.json$/, directories: true}
    ],
    'unpublish': null,
    'upload': [{filenames: /.*\.json$/, directories: true}, {environments: true}],
    'uuids': null
};

var args = process.argv.slice(3);

var arglen = 0;
for (var i = 0; i < args.length; i++) {
    if (args[i] && args[i][0] !== '-') {
        arglen++;
    }
}

var command = null;
for (var j = 0; j < args.length; j++) {
    if (args[j] && args[j][0] !== '-') {
        command = args[j];
        break;
    }
}

// the current text being entered
var curr = args[args.length - 1];


function trim(str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
}

function matchList(list, curr, /*optional*/nextlist) {
    var m = [];
    list.forEach(function (l) {
        if (l.indexOf(curr) === 0) {
            m.push(l + ' ');
        }
    });
    if (m.length === 1 && trim(m[0]) === trim(curr)) {
        return nextlist || [];
    }
    return m;
}


function completeList(argdef) {
    if (!argdef) {
        return [];
    }
    var l = [];
    if (argdef.list) {
        l = l.concat(argdef.list);
    }
    if (argdef.directories) {
        l = l.concat(
            fs.readdirSync('.').filter(function (f) {
                return fs.statSync(f).isDirectory();
            })
        );
    }
    if (argdef.filenames) {
        l = l.concat(
            fs.readdirSync('.').filter(function (f) {
                return argdef.filenames.test(f);
            })
        );
    }
    return l;
}


var matches = [];


// list all commands
if (arglen === 0) {
    matches = Object.keys(commands);
}
// complete first command
else if (arglen === 1) {
    matches = matchList(
        Object.keys(commands),
        curr,
        commands[curr] && completeList(commands[curr][0])
    );
}
// match command arguments
else if (arglen > 1) {
    if (commands[command] && commands[command][arglen - 2]) {
        var argdef = commands[command][arglen - 2];
        var next_argdef = commands[command][arglen - 1];
        if (argdef.list) {
            matches = matches.concat(
                matchList(
                    argdef.list, curr, completeList(next_argdef)
                )
            );
        }
        if (argdef.directories) {
            var wd = './';
            if (curr && /\/$/.test(curr)) {
                wd = curr;
            }
            else if (curr) {
                wd = path.dirname(curr) + '/';
            }
            var files = fs.readdirSync(wd);
            var dirs = files.filter(function (f) {
                return fs.statSync(wd === './' ? f: wd + f).isDirectory();
            }).map(function (d) {
                return wd === './' ? d: wd + d;
            });
            matches = matches.concat(
                matchList(dirs, curr, completeList(next_argdef))
            );
        }
        if (argdef.filenames) {
            var wd = './';
            if (curr && /\/$/.test(curr)) {
                wd = curr;
            }
            else if (curr) {
                wd = path.dirname(curr) + '/';
            }
            var files = fs.readdirSync(wd);
            var dirs = files.filter(function (f) {
                return argdef.filenames.test(wd === './' ? f: wd + f);
            }).map(function (d) {
                return wd === './' ? d: wd + d;
            });
            matches = matches.concat(
                matchList(dirs, curr, completeList(next_argdef))
            );
        }
    }
}

process.stdout.write(matches.join('\n'));

//});
