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
  var columns = await projects.addColumnsToProject(config.columnNames, projectResponse.data.id);
  var orderedColumnns = projects.orderColumnData(columns)
  projects.reOrderColumns(orderedColumnns);
  issues()
    .then((response) => {
      var issueIds = response.data.map(x => x.id);
      projects.addIssuesToColumn(orderedColumnns.toDo.id,issueIds );
    })
    .catch((err)=> {
      console.log(err);
    });
  console.log("Project created at: " + projectResponse.data.html_url);
}


createProjectAddColumnsAndIssues();
