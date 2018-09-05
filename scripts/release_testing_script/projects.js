const config = require('./config'),
  octokit = require('@octokit/rest')({ headers: config.headers })

async function createProject(projectName) {
  octokit.authenticate({
    type: 'token',
    token: config.token
  });
  var data = {
    owner: config.owner,
    repo: config.repoName,
    name: projectName
  };
  try {
    return octokit.projects.createRepoProject(data);
  }
  catch (err) {
    console.log("Error occured when creating the project " + err);
  };
};

async function addColumnsToProject(columnName, projectId) {
  var data = {
    project_id: projectId,
    name: columnName
  };
  try {
    return await octokit.projects.createProjectColumn(data);
  }
  catch (err) {
    console.log(err);
  };
}

function sortColumnData(columns) {
  var sorted = [];
  for (const key in columns) {
    sorted.push([key, columns[key].order]);
  };

  sorted.sort(function (a, b) {
    return a[1] - b[1];
  });
  return sorted;
}

function generateMoveBody(columns, sortedData) {
  var data = [];
  var i;
  for (i = 1; i < sortedData.length; i++) {
    data.push(
      {
        headers: config.headers,
        column_id: columns[sortedData[i][0]].columnId,
        position: `after:${columns[sortedData[i - 1][0]].columnId}`
      });
  }
  return data;
}

async function reOrderColumns(columns) {
  var sorted = sortColumnData(columns);
  var data = generateMoveBody(columns, sorted);

  for (const index in data) {
    await octokit.projects.moveProjectColumn(data[index]);
  };
}

function addIssuesToColumn(columnId, issueIds) {
  issueIds.forEach((issueId) => {
    var data = {
      column_id: columnId,
      content_id: issueId,
      content_type: 'Issue',
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
};