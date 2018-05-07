/*
 * Generates a snapshot of the state of project issues.
 *
 * USAGE:
 *  1) Make sure all the issues are assigned to the project and have the right type and status labels
 *  2) Make sure you have generated a GH token and created a token.json file, eg: { "githubApiToken": "..." }
 *  3) Execute the command: node index.js <project_name> > <output_file>
 *      eg: node index.js 3.0.0 > tmp.csv
 */

const GitHub = require('@octokit/rest');

const github = new GitHub({
  headers: { 'user-agent': 'changelog-generator' }
});
github.authenticate({
  type: 'token',
  token: require('../token.json').githubApiToken
});

const projectByName = (projects, name) => projects.find(project => project.name === name);

const getOrgProject = name => {
  return github.projects.getOrgProjects({ org: 'medic' })
    .then(response => projectByName(response.data, name));
};

const getRepoProject = name => {
  return github.projects.getRepoProjects({ owner: 'medic', repo: 'medic-webapp' })
    .then(response => projectByName(response.data, name));
};

const getProjectId = () => {
  const PROJECT_NAME = process.argv[2];
  if (!PROJECT_NAME) {
    throw new Error('You must specify a project name (eg: "2.15.0") as the first argument');
  }
  return getOrgProject(PROJECT_NAME)
    .then(project => {
      if (!project) {
        // check if it's a repo project - old style
        return getRepoProject(PROJECT_NAME);
      }
      return project;
    })
    .then(project => {
      if (!project) {
        throw new Error(`Could not find project with the name ${process.argv[2]}`);
      }
      return project.id;
    });
};

const combinePages = response => {
  if (!github.hasNextPage(response)) {
    return response.data;
  }
  return github.getNextPage(response)
    .then(combinePages)
    .then(data => data.concat(response.data));
};

const getCardsForColumn = id => {
  return github.projects.getProjectCards({ column_id: id })
    .then(combinePages);
};

const getCards = projectId => {
  return github.projects.getProjectColumns({ project_id: projectId })
    .then(response => Promise.all(response.data.map(column => getCardsForColumn(column.id))))
    .then(results => results.reduce((acc, curr) => acc.concat(curr), []));
};

const getIssues = cards => {
  return Promise.all(cards
    .filter(card => card.content_url) // cards without content_urls are just freetext cards
    .map(card => {
      const parts = card.content_url.split('/');
      return github.issues.get({
        owner: parts[4],
        repo: parts[5],
        number: parts[7]
      });
    })
  );
};

const TYPES = [
  'Type: Feature',
  'Type: Improvement',
  'Type: Performance',
  'Type: Bug', 
  'Type: Technical issue',
];

const STATUSES = [
  'Status: 1 - Triaged',
  'Status: 2 - Active work',
  'Status: 3 - Code review',
  'Status: 4 - Acceptance testing',
  'Status: 5 - Ready',
  'Status: 6 - Released',
];

const group = issues => {
  const result = {
    types: {},
    statuses: {}
  };

  const errors = [];

  TYPES.forEach(type => result.types[type] = 0);
  STATUSES.forEach(type => result.statuses[type] = 0);

  issues.forEach(issue => {
    const matchingTypes = TYPES.filter(type => issue.data.labels.find(label => label.name === type));
    if (!matchingTypes.length) {
      errors.push(`Issue doesn't have any Type label: ${issue.data.html_url}`);
      return;
    }
    if (matchingTypes.length > 1) {
      errors.push(`Issue has too many Type labels: ${issue.data.html_url}`);
      return;
    }
    result.types[matchingTypes[0]]++;

    const matchingStatuses = STATUSES.filter(status => issue.data.labels.find(label => label.name === status));
    if (!matchingStatuses.length) {
      errors.push(`Issue doesn't have any Status label: ${issue.data.html_url}`);
      return;
    }
    if (matchingStatuses.length > 1) {
      errors.push(`Issue has too many Status labels: ${issue.data.html_url}`);
      return;
    }
    result.statuses[matchingStatuses[0]]++;
  });

  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    throw new Error('Some issues are in an invalid state');
  }
  return result;
};

const output = groups => {
  console.log(JSON.stringify(groups, null, 2));
};

Promise.resolve()
  .then(getProjectId)
  .then(getCards)
  .then(getIssues)
  .then(group)
  .then(output)
  .catch(console.error);
