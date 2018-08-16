const octokit = require('@octokit/rest')(),
  config = require('./config');


async function createProject(projectName) {
  data = {
    owner: config.owner,
    repo: config.repoName,
    name: projectName,
    headers: config.headers
  };
  try {
    return octokit.projects.createRepoProject(data);
  }
  catch (err) {
    console.log("Error occured when creating the project " + err);
  };
};

async function addColumnsToProject(columnNames, projectId) {
  var columnResponses = [];
  for (const index in columnNames) {
    data = {
      project_id: projectId,
      name: columnNames[index],
      headers: config.headers
    };
    try {
      var result = await octokit.projects.createProjectColumn(data);
      columnResponses.push(result.data);
    }
    catch (err) {
      console.log(err);
    };
  }
  return columnResponses;
}

async function reOrderColumns(columns) {
  inProData = {
    headers: config.headers,
    column_id: columns.inPro.id,
    position: `after:${columns.toDo.id}`
  };
  doneData = {
    headers: config.headers,
    column_id: columns.done.id,
    position: `after:${columns.inPro.id}`
  };
  await octokit.projects.moveProjectColumn(inProData);
  octokit.projects.moveProjectColumn(doneData);
}

function orderColumnData(columns) {
  return {
    toDo: columns.find(column => column.name == config.columnNames[0]),
    inPro: columns.find(column => column.name == config.columnNames[1]),
    done: columns.find(column => column.name == config.columnNames[2]),
  }
}

function addIssuesToColumn(columnId, issueIds) {
  issueIds.forEach((issueId) => {
    var data = {
      column_id: columnId,
      content_id: issueId,
      content_type: 'Issue',
      headers: config.headers
    };
    try {
      octokit.projects.createProjectCard(data);
    }
    catch (err) {
      console.log(err);
    }
  });
}

module.exports = {
  createProject: createProject,
  addColumnsToProject: addColumnsToProject,
  reOrderColumns: reOrderColumns,
  addIssuesToColumn: addIssuesToColumn,
  orderColumnData: orderColumnData
};