const glob = require('glob');
const path = require('path');
const child_process = require('child_process');

const globOfFoldersToIgnore = [
  '**/node_modules/**',
  'scripts/**',
  '**/node_modules_backup/**'
];

const filterBySeverity = ['high', 'critical'];

const audit = directory => new Promise((resolve, reject) => {
  const execCommand = '$(which npm) audit --package-lock-only --json';
  const execOptions = { cwd: path.join('.', directory) };
  child_process.exec(execCommand, execOptions, (error, stdout, stderr) => {
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

const pathToAllPackageJsonFiles = glob.sync('**/package.json', { ignore: globOfFoldersToIgnore });
const pathOfFoldersToAudit = pathToAllPackageJsonFiles.map(file => path.dirname(file));
const audits = pathOfFoldersToAudit.map(audit);

const reduceAuditResultsToAdvisories = (agg, result) => {
  if (!result.auditResult) {
    return agg;
  }

  const advisories = Object.keys(result.auditResult.advisories)
    .filter(key => filterBySeverity.includes(result.auditResult.advisories[key].severity))
    .map(advisoryId => ({
      advisoryId,
      directory: result.directory,
      advisory: result.auditResult.advisories[advisoryId],
    }));

  return [...agg, ...advisories];
};

const summarizeAdvisories = advisories => advisories.map(summary => {
  return `[${summary.advisory.severity}] ${summary.advisory.title} for ${summary.advisory.module_name} ` +
    `(#${summary.advisoryId}) in ${summary.directory}`;
});
const logSummaries = summaries => summaries.forEach(x => console.log(x));

(async () => {
  const auditResults = await Promise.all(audits);
  const advisories = auditResults.reduce(reduceAuditResultsToAdvisories, []);
  const summaries = await summarizeAdvisories(advisories);
  logSummaries(summaries);
})();
