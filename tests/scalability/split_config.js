const minimist = require('minimist');
const fs = require('fs');


const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});


if (argv.h || !argv.filePath || !argv.workerCount) {
  console.log(`Split JSON file based on worker count
Usage:
      node split_config.js -h | --help
      node split_config.js --workerCount 3 --filePath = './config.json'
  
JSON FILE: 
{
  "url": "http://localhost:5988/medic",
  "users": [
    {
      "name": "ac1",
      "pass": "Secret_1"
    },
    {
      "name": "ac2",
      "pass": "Secret_1"
    }
  ]
}
Options:
    -h --help     Show this screen.
    --workerCount Number of jmeter workers
    --filePath    The path the config.json file. 
`);
  process.exit(0);
}

const workerCount = argv.workerCount;
let config;
try {
  config = JSON.parse(fs.readFileSync(argv.filePath));
} catch (err) {
  console.log('Error parsing JSON string:', err);
}


const splitUsers = (users, workerCount) => {
  const result = [];
  const newUsers = Object.assign(users);
  for (let i = workerCount; i > 0; i--) {
    result.push(newUsers.splice(0, Math.ceil(newUsers.length / i)));
  }
  return result;
};

const usersList = splitUsers(config.users, workerCount);

usersList.forEach((userList, index) => {
  const json = JSON.stringify({
    url:config.url,
    users: userList
  }, null, 2);
  fs.writeFileSync(`./conf-${index}.json`, json);
});
