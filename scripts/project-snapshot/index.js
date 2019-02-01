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
  return github.projects.getRepoProjects({ owner: 'medic', repo: 'medic' })
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

const getColumns = projectId => {
  return github.projects.getProjectColumns({ project_id: projectId })
    .then(response => Promise.all(response.data.map(column => {
      return getCardsForColumn(column.id).then(cards => [ column.name, cards.length ]);
    })));
};

const output = columns => {
  columns.forEach(column => {
    const name = column[0];
    const paddedCount = column[1].toString().padStart(4);
    console.log(`${paddedCount} ${name}`);
  });
};

Promise.resolve()
  .then(getProjectId)
  .then(getColumns)
  .then(output)
  .catch(console.error);
