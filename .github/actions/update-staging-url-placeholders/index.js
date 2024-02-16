const core = require('@actions/core');
const github = require('@actions/github');

const SEARCH_TERM = '<!-- COMPOSE URLS GO HERE - DO NOT CHANGE -->';

const generateReplacement = (branch) => {
  const url = `https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:${branch}/docker-compose`;
  return `

# Compose URLs
If Build CI hasn't passed, these may 404:

* [Core](${url}/cht-core.yml)
* [CouchDB Single](${url}/cht-couchdb.yml)
* [CouchDB Cluster](${url}/cht-couchdb-clustered.yml)
`;
};

const main = async () => {
  try {

    const token = core.getInput('token', {required: true});
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const pull_number = github.context.payload.pull_request.number;
    const octokit = new github.getOctokit(token);

    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    const replacement = generateReplacement(pr.head.ref);
    const body = pr.body.replace(SEARCH_TERM, replacement);
    const updateme = { owner, repo, pull_number, body };

    await octokit.rest.pulls.update(updateme);

  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
