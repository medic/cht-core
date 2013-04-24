#!/usr/bin/env node

var os = require('os'),
    fs = require('fs');


var HOME = process.env.HOME;

var bash_profile = HOME + '/.bash_profile';
try {
    fs.statSync(bash_profile);
}
catch (e) {
    // OSX 10.6 apparently uses ".profile", try that instead
    bash_profile = HOME + '/.profile';
}
var bashrc = HOME + '/.bashrc';


var sourcebash = [
  '\nif [ -f ~/.bashrc ]; then',
  '  source ~/.bashrc',
  'fi'
].join('\n');


var sourceauto = [
  '\n#KANSO',
  '# Custom tab completion',
  'shopt -s progcomp',
  'command -v kanso_completions &> /dev/null',
  'if [ $? -eq 0 ]; then',
  '  _kansoCompListener() {',
  '    local curw',
  '    COMPREPLY=()',
  '    curw=${COMP_WORDS[COMP_CWORD]}',
  '    COMPREPLY=($(kanso_completions ${COMP_WORDS[@]}))',
  '    return 0',
  '  }',
  '  complete -F _kansoCompListener -o filenames kanso',
  'fi'
  '#/KANSO'
].join('\n');


if (os.type() === 'Darwin') {
    fs.readFile(bash_profile, function (err, data) {
        data = data.toString();
        var identifier = data.indexOf('source ' + bashrc);
        if (identifier === -1) {
            fs.writeFile(bash_profile, data + sourcebash, function (err) {
                if (err) {
                    throw err;
                }
                return console.log(
                    'Successfully sourced ".bashrc" into ".bash_profile".'
                );
            });
        };
    });
}

fs.readFile(bashrc, function (err, data) {
    data = data.toString();
    var identifier = data.indexOf('#KANSO:');
    if (identifier === -1) {
        fs.writeFile(bashrc, data + sourceauto, function (err) {
            if (err) {
                throw err;
            }
            return console.log(
                'Successfully installed source to ".bashrc".\n'
            );
        });
    }
});
