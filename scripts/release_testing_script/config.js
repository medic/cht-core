var fs = require('fs');

var columnData = {
  toDo: {
    name: 'To Do',
    order: 0
  },
  pass: {
    name: 'Pass',
    order: 2
  },
  inProg: {
    name: 'In Progress',
    order: 1
  },
  fail:{
    name: 'Fail',
    order: 3
  }
}

module.exports = {
  repoName: 'medic-webapp',
  owner: 'medic',
  labels: "Release Test",
  columnNamesData: columnData,
  token: JSON.parse(fs.readFileSync('token.json', 'utf8')).token,
  headers: {
    'User-Agent': 'medic-qa',
    'Accept': 'application/vnd.github.inertia-preview+json'
  }
}