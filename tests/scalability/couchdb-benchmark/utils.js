const fs = require('fs').promises;
const path = require('path');

const FILE_NAME = path.join(__dirname, '..', 'benchmark_results.md');

const cleanFile = () => fs.writeFile(FILE_NAME, '', 'utf8');

const printResults = async (endpoint, results) => {
  let formatted = '';
  formatted += `## ${endpoint} \n`;

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

  await fs.appendFile(FILE_NAME, formatted, 'utf8');
};

module.exports = {
  printResults,
  cleanFile,
  db: process.env.COUCH_URL || 'http://localhost:5984/medic',
};

