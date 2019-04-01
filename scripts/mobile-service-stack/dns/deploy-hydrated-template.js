// This script takes the medic.dev.template file and writes a copy hydrated with the machine's ip information

const path = require('path');
const fs = require('fs');
const os = require('os');
const _ = require('underscore');

const getIpAddress = () => {
  const networkInterface = os.networkInterfaces();
  const internalInterface = _.flatten(Object.values(networkInterface))
    .find(interface => interface.family === 'IPv4' && interface.internal === false);
  return internalInterface && internalInterface.address;
};

const getHydratedTemplate = ipAddress => {
  const templateString = fs.readFileSync(path.join(__dirname, 'db.medic.dev.template')).toString();
  const compiledTemplate = _.template(templateString);
  return compiledTemplate({ ipAddress });
};

const main = () => {
  const ipAddress = getIpAddress();

  if (ipAddress) {
    console.log(`DNS authority for medic.dev is available: ${ipAddress}`);
  } else {
    console.error('Could not find valid IP address');
  }

  const template = getHydratedTemplate(ipAddress);
  const pathToDeployFolder = path.join(__dirname, '../deploy');
  if (!fs.existsSync(pathToDeployFolder)) {
    fs.mkdirSync(pathToDeployFolder);
  }

  const resultingPath = path.join(pathToDeployFolder, 'db.medic.dev');
  console.log(`Writing to ${resultingPath}.`);
  fs.writeFileSync(resultingPath, template);
};

main();
