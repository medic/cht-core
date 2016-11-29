/**
 * Generates markdown changes from the given issues json file.
 *
 * Usage:
 *    node changelog-generator.js issues.json 2016-06-01T00:00:00Z > newfile.md
 *      - 1st param is the issues file
 *      - 2nd param is an optional date to only include issues closed after this date
 * Get the JSON from GH, eg:
 *    https://api.github.com/repos/medic/medic-webapp/issues?state=closed&since=2016-06-01T00:00:00Z&per_page=100&page=1
 * NB: max page size is 100 so you may need to request multiple pages and combine
 *    to get a complete issues list
 */

const fs = require('fs');

const IGNORE_ISSUES_MARKED_WITH = [ '0 - Backlog', '1 - Scheduled', '6 - Released' ];

let file = process.argv[2];
if (!file) {
  console.error('Pass the file name as input');
  process.exit(1);
}

let closedAfter;
if (process.argv[3]) {
  closedAfter = new Date(process.argv[3]);
} else {
  closedAfter = new Date(0);
}

let content = fs.readFileSync(file, { encoding: 'UTF8' });
let issues = JSON.parse(content);
let labels = {
  'UI/UX': [],
  'Bug': [],
  'Feature Request': [],
  'Performance': []
};
issues.forEach(function(issue) {
  // exclude issues closed before date
  if (!issue.closed_at || new Date(issue.closed_at) < closedAfter) {
    return;
  }

  // exclude already released issues, or issues not done
  let released = false;
  issue.labels.forEach(function(label) {
    if (IGNORE_ISSUES_MARKED_WITH.includes(label.name)) {
      released = true;
    }
  });
  if (released) {
    return;
  }

  issue.labels.forEach(function(label) {
    if (labels[label.name]) {
      labels[label.name].push(`- ${issue.title}. Issue: #${issue.number}`);
      // list each item at most once
      return;
    }
  });
});

var outputSection = function(title, label) {
  console.log('\n### ' + title + '\n');
  labels[label].forEach(function(issue) {
    console.log(issue);
  });
};

outputSection('Features', 'Feature Request');
outputSection('Bug fixes', 'Bug');
outputSection('UI/UX improvements', 'UI/UX');
outputSection('Performance improvements', 'Performance');
