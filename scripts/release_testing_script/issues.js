const rp = require('request-promise'),
  config = require('./config');

var options = {
  uri: config.gitHubApi + config.issuesEnd,
  qs: {
    state: 'all',
    labels: 'Release Testing'
  },
  headers: config.headers,
  json: true
}

async function issues(version) {
  try {
    var issues = await rp(options)
    ids = issues.map(issue => issue.id)
    return Promise.resolve(ids);
  }
  catch (error) {
    console.log(error);
    Promise.reject(error);
  }
}

module.exports = issues;