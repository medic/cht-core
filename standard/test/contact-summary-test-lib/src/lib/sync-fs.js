const fs = require('fs');
const mkdirp = require('mkdirp').sync;
const os = require('os');
const path = require('path');
const trace = require('../lib/log').trace;
const warn = require('../lib/log').warn;

function isDirectory(path) {
  return fs.statSync(path).isDirectory();
}

function read(path) {
  try {
    return fs.readFileSync(path, { encoding:'utf8' });
  } catch(e) {
    warn(`Error reading file: ${path}`);
    throw e;
  }
}

function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch(e) {
    warn(`Error parsing JSON in: ${path}`);
    throw e;
  }
}

function recurseFiles(dir, files) {
  if(!files) files = [];

  fs.readdirSync(dir)
    .forEach(name => {
      const f = path.join(dir, name);
      try {
        const stat = fs.statSync(f);

        if(stat.isDirectory()) recurseFiles(f, files);
        else files.push(f);
      } catch(e) {
        if(e.code === 'ENOENT') trace('Ignoring file (err ENOENT - may be a symlink):', f);
        else throw e;
      }
    });

  return files;
}

function withoutExtension(fileName) {
  const extensionStart = fileName.lastIndexOf('.');
  return extensionStart === -1 ? fileName : fileName.substring(0, extensionStart);
}

module.exports = {
  copy: (from, to) => fs.writeFileSync(to, fs.readFileSync(from)),
  exists: fs.existsSync,
  isDirectory: isDirectory,
  mkdir: path => { try { mkdirp(path); } catch(e) { warn(e); } },
  mkdtemp: () => fs.mkdtempSync(`${os.tmpdir()}/medic-conf`),
  path: path,
  posixPath: p => p.split(path.sep).join('/'),
  read: read,
  readJson: readJson,
  readBinary: path => fs.readFileSync(path),
  recurseFiles: recurseFiles,
  readdir: fs.readdirSync,
  withoutExtension: withoutExtension,
  write: (path, content) => fs.writeFileSync(path, content, 'utf8'),
  writeBinary: (path, content) => fs.writeFileSync(path, content),
  writeJson: (path, json) => module.exports.write(path, JSON.stringify(json, null, 2) + '\n'),
};
