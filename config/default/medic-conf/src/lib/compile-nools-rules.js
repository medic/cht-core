const path = require('path');

const fs = require('./sync-fs');
const pack = require('./package-lib');
const minifyNools = require('./minify-nools');
const validateDeclarativeSchema = require('./validate-declarative-schema');

const DECLARATIVE_NOOLS_FILES = [ 'tasks.js', 'targets.js' ];

const compileNoolsRules = async (projectDir, options = {}) => {
  const tryLoadLegacyRules = legacyNoolsFilePath => {
    let result;
    if (fs.exists(legacyNoolsFilePath)) {
      result = fs.read(legacyNoolsFilePath);
    }
  
    return result;
  };

  const legacyNoolsFilePath = path.join(projectDir, 'rules.nools.js');
  const legacyRules = tryLoadLegacyRules(legacyNoolsFilePath);
  
  if (legacyRules !== undefined) {
    if (findMissingDeclarativeFiles(projectDir).length !== DECLARATIVE_NOOLS_FILES.length) {
      throw new Error(`Both legacy and declarative files found. You should either have rules.nools.js xor ${DECLARATIVE_NOOLS_FILES} files.`);
    }

    return options.minifyScripts ? minifyNools(legacyRules) : legacyRules;
  } else {
    return compileDeclarativeFiles(projectDir, options);
  }
};

const findMissingDeclarativeFiles = projectDir => DECLARATIVE_NOOLS_FILES.filter(filename => {
  const filePath = path.join(projectDir, filename);
  return !fs.exists(filePath);
});

const compileDeclarativeFiles = async (projectDir, options) => {
  const missingFiles = findMissingDeclarativeFiles(projectDir);
  if (missingFiles.length > 0) {
    throw new Error(`Missing required declarative configuration file(s): ${missingFiles}`);
  }

  validateDeclarativeSchema(projectDir, options.haltOnSchemaError);

  const pathToDeclarativeLib = path.join(__dirname, '../nools/lib.js');
  const baseEslintPath = path.join(__dirname, '../nools/.eslintrc');
  
  const code = await pack(projectDir, pathToDeclarativeLib, baseEslintPath, options);
  return `define Target { _id: null, contact: null, deleted: null, type: null, pass: null, date: null, groupBy: null }
define Contact { contact: null, reports: null, tasks: null }
define Task { _id: null, deleted: null, doc: null, contact: null, icon: null, date: null, readyStart: null, readyEnd: null, title: null, fields: null, resolved: null, priority: null, priorityLabel: null, reports: null, actions: null }
rule GenerateEvents {
  when { c: Contact } then { ${code} }
}`;
};

module.exports = compileNoolsRules;