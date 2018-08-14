module.exports = {
  gitHubApi: 'https://api.github.com/',
  issuesEnd: 'repos/newtewt/release_testing_example/issues',
  projectCreate: 'repos/newtewt/release_testing_example/projects',
  repoName: 'release_testing_example',
  owner: 'newtewt',

  columnNames: ["To Do", "In Progress", "Done"],

  headers: {

    'User-Agent': 'newtewt',
    'Accept': 'application/vnd.github.inertia-preview+json',
    'Authorization': process.env.githubToken
  }
}