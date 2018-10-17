const fs = require('fs');
const mkdirp = require('mkdirp');

function propertiesAsObject(path) {
  var vals = {};
  var red = fs.readFileSync(path, 'utf8');
  red
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('=', 2).map(it => it.trim()))
    .map(([k, v]) => (vals[k] = v));
  return vals;
}

function mergeProperties(def, additional) {
  if (!def) def = {};

  for (const k in additional) {
    if (additional.hasOwnProperty(k)) def[k] = additional[k];
  }

  return def;
}

function mergeTranslationFiles(filesToMerge, defPath, configPath, destPath) {
  filesToMerge.forEach(function(fName) {
    const standProps = propertiesAsObject(configPath + fName);
    const defProps = propertiesAsObject(defPath + fName);
    var merged = mergeProperties(defProps, standProps);

    for (var prop in merged) {
      fs.appendFile(
        destPath + fName,
        prop + ' = ' + merged[prop] + '\n',
        err => {
          if (err) {
            console.log(err);
          }
        }
      );
    }
  });
}

function copyTranslationFiles(path, files, destPath) {
  files.forEach(function(fName) {
    console.log(destPath + fName);
    console.log(path + fName);
    fs.copyFile(path + fName, destPath + fName, err => {
      if (err) {
        console.log(err);
      }
    });
  });
}

function createTransDir(path) {
  if (!fs.existsSync(path)) {
      console.log('making dir')
      console.log(path)
    console.log(mkdirp.sync(path));
  }
}

function mergeAndCopyTransFiles(defPath, configPath, destPath) {
  createTransDir(destPath);
  const stanFiles = fs.readdirSync(configPath);
  const defFiles = fs.readdirSync(defPath);
  var filesToMerge = defFiles.filter(value => -1 !== stanFiles.indexOf(value));
  var filesToCopy = defFiles.filter(
    value => -1 === filesToMerge.indexOf(value)
  );
  mergeTranslationFiles(filesToMerge, defPath, configPath, destPath);
  copyTranslationFiles(defPath, filesToCopy, destPath);
}

module.exports = mergeAndCopyTransFiles;
