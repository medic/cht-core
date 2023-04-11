const config = require('./config');
const octokit = require('@octokit/rest')({ headers: config.headers });

const createProject = async (projectName) => {
  octokit.authenticate({
    type: 'token',
    token: config.token
  });
  const data = {
    owner: config.owner,
    repo: config.repoName,
    name: projectName
  };
  try {
    return octokit.projects.createRepoProject(data);
  } catch (err) {
    console.log('Error occured when creating the project ' + err);
  }
};

const addColumnsToProject = async (columnName, projectId) => {
  const data = {
    project_id: projectId,
    name: columnName
  };
  try {
    return await octokit.projects.createProjectColumn(data);
  } catch (err) {
    console.log(err);
  }
};

const sortColumnData = (columns) => {
  const sorted = columns.map((column, index) => {
    return [index, column.order];
  });
  sorted.sort((a, b) => a[1] - b[1]);
  return sorted;
};

const generateMoveBody = (columns, sortedData) => {
  const data = [];
  let i;
  for (i = 1; i < sortedData.length; i++) {
    data.push({
      headers: config.headers,
      column_id: columns[sortedData[i][0]].columnId,
      position: `after:${columns[sortedData[i - 1][0]].columnId}`
    });
  }
  return data;
};

const reOrderColumns = async (columns) => {
  const sorted = sortColumnData(columns);
  const data = generateMoveBody(columns, sorted);
  for (let i = 0; i < data.length; i++) {
    await octokit.projects.moveProjectColumn(data[i]);
  }
};

const addIssuesToColumn = (columnId, issueIds) => {
  issueIds.forEach((issueId) => {
    const data = {
      column_id: columnId,
      content_id: issueId,
      content_type: 'Issue',
    };
    try {
      octokit.projects.createProjectCard(data);
    } catch (err) {
      console.log(err);
    }
  });
};

module.exports = {
  createProject: createProject,
  addColumnsToProject: addColumnsToProject,
  reOrderColumns: reOrderColumns,
  addIssuesToColumn: addIssuesToColumn,
};
