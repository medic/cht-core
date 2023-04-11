const core = require('@actions/core');
const github = require('@actions/github');

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

    const branch = pr.head.ref;
    let body = pr.body;

    const search_replace = {
      __CHT_CORE_COMPOSE_URL__: '[Core](https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:'
        + branch + '/docker-compose/cht-core.yml)',
      __COUCH_SINGLE_COMPOSE_URL__: '[CouchDB Single](https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:'
        + branch + '/docker-compose/cht-couchdb.yml)',
      __COUCH_CLUSTER_COMPOSE_URL__: '[CouchDB Cluster](https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:'
        + branch + '/docker-compose/cht-couchdb-clustered.yml)',
    }

    let search;
    for (search in search_replace) {
      if (body.includes(search)) {
        const replacer = new RegExp(search, 'g');
        body = body.replace(replacer, search_replace[search]);
        console.log("Found  : ", search, "will replace with", search_replace[search]);
      }
    }

    const updateme = { owner, repo, pull_number, body };

    await octokit.rest.pulls.update(updateme);

  } catch (error) {
    core.setFailed(error.message);
  }
}

main();


