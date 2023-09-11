const minimist = require('minimist');
const issues = require('./issues');
const config = require('./config');
const projects = require('./projects');

const args = minimist(process.argv.slice(2), {
  string: ['version'],     // --version
  alias: { v: 'version' }
});

if (typeof (args.version) !== 'string') {
  console.log('Version is required but was not provided. Please Specify --version');
  process.exit(1);
}

const createProjectAddColumnsAndIssues = async () => {
  const projectResponse = await projects.createProject(args.v);
  const columnNames = Object.keys(config.columnNamesData);
  for (let i = 0; i < columnNames.length; i++) {
    const columnConfig = config.columnNamesData[columnNames[i]];
    const columnData = await projects.addColumnsToProject(columnConfig.name, projectResponse.data.id);
    columnConfig.columnId = columnData.data.id;
  }

  try {
    projects.reOrderColumns(config.columnNamesData);
    const response = await issues();
    const issueIds = response.data.map(x => x.id);
    await projects.addIssuesToColumn(config.columnNamesData.toDo.columnId, issueIds);
    console.log('Project created at: ' + projectResponse.data.html_url);
  } catch (err){
    console.error(err);
  }
};

createProjectAddColumnsAndIssues();
