const glob = require('glob');
const path = require('path');
const child_process = require('child_process');

const foldersToIgnore = [
  '**/node_modules/**',
  'scripts/**',
  '**/node_modules_backup/**'
];

const filteredSeverity = ['high', 'critical'];

const audit = directory => new Promise((resolve, reject) => {
  child_process.exec('$(which npm) audit --package-lock-only --json', { cwd: path.join('.', directory)}, (error, stdout, stderr) => {
    if (!error) {
      return resolve([]);
    }

    if (stderr) {
      return reject(`StdErr in ${directory}: ${stderr}`);
    }

    resolve({
      directory,
      auditResult: JSON.parse(stdout)
    });
  });
});

const packageJsonFilePaths = glob.sync('**/package.json', { ignore: foldersToIgnore });
const auditableFolders = packageJsonFilePaths.map(file => path.dirname(file));
const audits = auditableFolders.map(audit);

const reduceAuditResultToAdvisory = (agg, result) => {
  const advisories = Object.keys(result.auditResult.advisories)
    .filter(key => filteredSeverity.includes(result.auditResult.advisories[key].severity))
    .map(advisoryId => ({
      advisoryId,
      directory: result.directory,
      advisory: result.auditResult.advisories[advisoryId],
    }));

  return [...agg, ...advisories];
};

const summarizeAdvisories = advisories => advisories.map(summary => `[${summary.advisory.severity}] ${summary.advisory.title} for ${summary.advisory.module_name} (#${summary.advisoryId}) in ${summary.directory}`);
const logSummaries = summaries => summaries.forEach(x => console.log(x));

Promise.all(audits)
  .then(results => results.filter(result => 'auditResult' in result))
  .then(auditResults => auditResults.reduce(reduceAuditResultToAdvisory, []))
  .then(summarizeAdvisories)
  .then(logSummaries);
