var fs = require('fs');

var columnData = {
  toDo: {
    name: 'To Do',
    order: 0
  },
  done: {
    name: 'Done',
    order: 2
  },
  inProg: {
    name: 'In Progress',
    order: 1
  }
}

module.exports = {
  gitHubApi: 'https://api.github.com/',
  gitHub: 'https://github.com/',
  projects: 'newtewt/release_testing_example/projects',
  issuesEnd: 'repos/newtewt/release_testing_example/issues',
  projectCreate: 'repos/newtewt/release_testing_example/projects',
  repoName: 'release_testing_example',
  owner: 'newtewt',
  labels: "Release Testing",
  columnNames: ["To Do", "In Progress", "Done"],
  columnNamesData: columnData,
  headers: {
    'User-Agent': 'newtewt',
    'Accept': 'application/vnd.github.inertia-preview+json',
    'Authorization': JSON.parse(fs.readFileSync('token.json', 'utf8')).token
  }
}