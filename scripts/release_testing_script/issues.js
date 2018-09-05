const config = require('./config'),
  octokit = require('@octokit/rest')({ headers: config.headers });

async function issues() {
  data = {
    owner: config.owner,
    repo: config.repoName,
    labels: config.labels,
    state: 'all'
  };

  try {
    return await octokit.issues.getForRepo(data);
  } catch(err){
    console.log("An error occured getting issues" + err);
  };
}

module.exports = issues;