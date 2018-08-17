const minimist = require('minimist'),
  issues = require('./issues'),
  config = require('./config'),
  projects = require('./projects');

var args = minimist(process.argv.slice(2), {
  string: ['version'],     // --version
  alias: { v: 'version' }
});

if (typeof (args.version) !== 'string') {
  console.log('Version is required but was not provided. Please Specify --version');
  process.exit(1);
}

async function createProjectAddColumnsAndIssues() {
  var projectResponse = await projects.createProject(args.v);
  for (const key in config.columnNamesData) {
    var columnData = await projects.addColumnsToProject(config.columnNamesData[key].name, projectResponse.data.id);
    config.columnNamesData[key].columnId = columnData.data.id;
  }

  try{
    projects.reOrderColumns(config.columnNamesData);
    var response = await issues();
    var issueIds = response.data.map(x => x.id);
    await projects.addIssuesToColumn(config.columnNamesData.toDo.columnId, issueIds);
    console.log("Project created at: " + projectResponse.data.html_url);
  } catch(err){
    console.error(err);
  }
}


createProjectAddColumnsAndIssues();
