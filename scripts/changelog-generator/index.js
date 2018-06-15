/*
 * Generates a changelog given a GH project name.
 *
 * USAGE:
 *  1) Make sure all the issues in the release are assigned to the project
 *  2) Each issue should have one and only one Type label - the script will tell you which ones don't
 *  3) Make sure you have generated a GH token and created a token.json file, eg: { "githubApiToken": "..." }
 *  4) Execute the command: node index.js <project_name> > <output_file>
 *      eg: node index.js 3.0.0 > tmp.md
 *  5) Insert the contents of the output file into the appropriate location in Changes.md
 */

const GitHub = require('@octokit/rest');

const TYPES = [
  { label: 'Type: Feature', title: 'Features', issues: [] },
  { label: 'Type: Improvement', title: 'Improvements', issues: [] },
  { label: 'Type: Performance', title: 'Performance fixes', issues: [] },
  { label: 'Type: Bug', title: 'Bug fixes', issues: [] },
  { label: 'Type: Technical issue', title: 'Technical issues', issues: [] }
];
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

const sort = issues => {
  const errors = [];
  issues.forEach(issue => {
    const matchingTypes = TYPES.filter(type => issue.data.labels.find(label => label.name === type.label));
    if (!matchingTypes.length) {
      errors.push(`Issue doesn't have any Type label: ${issue.data.html_url}`);
      return;
    }
    if (matchingTypes.length > 1) {
      errors.push(`Issue has too many Type labels: ${issue.data.html_url}`);
      return;
    }
    matchingTypes[0].issues.push(issue);
  });

  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    throw new Error('Some issues are in an invalid state');
  }

  return TYPES;
};

const output = groups => {
  groups.forEach(group => {
    if (group.issues.length) {
      console.log(`### ${group.title}`);
      console.log('');
      group.issues.forEach(issue => console.log(`- [#${issue.data.number}](${issue.data.html_url}): ${issue.data.title}`));
      console.log('');
    }
  });
};

Promise.resolve()
  .then(getProjectId)
  .then(getCards)
  .then(getIssues)
  .then(sort)
  .then(output)
  .catch(console.error);
