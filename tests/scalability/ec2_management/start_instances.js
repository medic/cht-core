const AWS = require('aws-sdk');
const config = require('./aws_config');
AWS.config.update(config.region);
const ec2 = new AWS.EC2(config.apiVersion);

const startInstance = async () => {
  const instancePromise = await ec2.runInstances(config.instanceParams).promise();
  try {
    instancePromise.Instances[0].InstanceId;
  } catch(e) 
  {
    console.error(e.message);
  }
};


const describeInstances = async () => {
  try {
    const data = await ec2.describeInstances(config.scalabilityFilter).promise();
    const publicIps = data.Reservations[0].Instances.map(instance => instance.PublicIpAddress);
    console.log(JSON.stringify(publicIps));
  } catch (e) {
    console.error(e.message);
  }
};


// startInstance();

