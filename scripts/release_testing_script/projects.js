const rp = require('request-promise'),
  config = require('./config');

function reorderColumns(projectId) {
  columnUrl = `${config.gitHubApi}projects/${projectId}/columns`
  var options = {
    headers: config.headers,
    uri: columnUrl
  }
  rp(options)
    .then(function (body) {
      var columns = JSON.parse(body);
      inProgress = columns.find(x => x.name === 'In Progress');
      toDo = columns.find(x => x.name === 'To Do');
      done = columns.find(x => x.name === 'Done');
      moveColumnAfter(inProgress.id, toDo.id)
      moveColumnAfter(done.id, inProgress.id)
    })
    .catch(function (error) {
      console.log(error);
    })
}

function moveColumnAfter(columnIdToMove, moveAfterId) {
  var columnUrl = `${config.gitHubApi}projects/columns/${columnIdToMove}/moves`
  var options = {
    method: 'POST',
    headers: config.headers,
    uri: columnUrl,
    body: { position: `after:${moveAfterId}` },
    json: true
  }
  rp(options)
    .then(function (body) {
      console.log('Moved column');
    })
    .catch(function (error) {
      console.log(error);
    });
}

function addColumns(columnUrl, columnNames) {
  var columnDetails = []
  columnNames.forEach(function (name) {
    columnDetails.push(addColumn(columnUrl, name));
  });
  return columnDetails;

};

async function addColumn(columnUrl, columnName) {
  var options = {
    method: 'POST',
    headers: config.headers,
    uri: columnUrl,
    body: {
      name: columnName,
      body: "Release Testing"
    },
    json: true
  };

  try {
    result = await rp(options)
    var value = {
      name: columnName,
      id: result.id
    };
    return Promise.resolve(value);
  }
  catch (error) {
    console.log(error);
    Promise.reject(error);
  }
}

function addIssueToColumn(columnId, issueId) {
  card_url = `${config.gitHubApi}projects/columns/${columnId}/cards`

  var options = {
    method: 'POST',
    headers: config.headers,
    uri: card_url,
    body: {
      content_id: issueId,
      content_type: 'Issue'
    },
    json: true
  };

  rp(options)
    .then(function (body) {
      console.log('Added card to column');
    })
    .catch(function (error) {
      console.log('Add Issue Options: ' + options)
      console.log('An error occured adding issues to columns ' + error);
    });
}

function create_project(projectName, issueIds) {
  var createProjectUrl = config.gitHubApi + config.projectCreate;
  var options = {
    method: 'POST',
    headers: config.headers,
    uri: createProjectUrl,
    body: {
      name: projectName,
      body: "Release Testing"
    },
    json: true
  };

  rp(options)
    .then(function (body) {
      console.log('Project created at ' + body.html_url);
      var columnPromises = addColumns(body.columns_url, config.columnNames);
      Promise.all(columnPromises)
        .then(function (columns) {
          var toDoColumn = columns.find(column => column.name === config.columnNames[0]);
          issueIds.forEach(function (issueId) {
            addIssueToColumn(toDoColumn.id, issueId);
          });
        })
        .then(function(){
          reorderColumns(body.id);
        })
        .catch(function (error) {
          console.log(error);
        });
    })
    .catch(function (error) {
      console.log(options)
      console.log('Error occured while creating project: ' + error)
    });
};

module.exports = create_project