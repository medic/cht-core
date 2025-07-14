const fs = require('fs').promises;
const path = require('path');
const request = require('@medic/couch-request');

const FILE_NAME = path.join(__dirname, '..', 'benchmark_results.md');

const cleanFile = () => fs.writeFile(FILE_NAME, '', 'utf8');

const printResults = async (endpoint, results) => {
  let formatted = '';
  formatted += `## ${endpoint} benchmark \n`;

  const headers = new Set();
  results.forEach(({ scenario }) => {
    const keys = Object.keys(scenario);
    keys.forEach(key => headers.add(key));
  });

  headers.forEach(header => formatted += `| ${header}`);
  formatted += '| Duration (ms) |\n';
  formatted += Array.from({ length: headers.size + 2 }).join('|--');
  formatted += '|\n';

  results.forEach(({ scenario, duration }) => {
    const values = [];
    headers.forEach(key => values.push(scenario[key] || ''));
    formatted += `| ${values.join(' | ')} | ${duration} |\n`;
  });

  formatted += '\n\n';

  await fs.appendFile(FILE_NAME, formatted, 'utf8');
};

const getServerInfo = async () => {
  const serverURL = new URL(module.exports.db);
  serverURL.pathname = '';

  return await request.get({ url: serverURL.toString() });
};

const writeDbInfo = async () => {
  const dbInfo = await request.get({ url: module.exports.db });
  const serverInfo = await getServerInfo();

  let formatted = '# CouchDb Performance benchmark \n\n';

  formatted += `## Database Info\n\n`;
  formatted += `CouchDb version: ${serverInfo.version}\n\n`;
  formatted += `Database doc count: ${dbInfo.doc_count}\n\n`;

  await fs.appendFile(FILE_NAME, formatted, 'utf8');
};

module.exports = {
  printResults,
  cleanFile,
  writeDbInfo,
  db: process.env.COUCH_URL || 'http://localhost:5984/medic',
};

