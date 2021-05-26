const config = {
  region: { region: 'eu-west-2' },
  apiVersion: { apiVersion: '2016-11-15' },
  instanceParams: {
    ImageId: 'ami-09a56048b08f94cdf',
    InstanceType: 'c5.4xlarge',
    KeyName: 'qa-scalability',
    MinCount: 1,
    MaxCount: 1,
    BlockDeviceMappings: [
      {
        DeviceName: '/dev/xvdf',
        VirtualName: 'ephemeral',
        Ebs: {
          DeleteOnTermination: true,
          VolumeSize: 2
        }
      }
    ]
  },
  scalabilityFilter: {
    Filters: [
      {
        Name: 'key-name',
        Values: [
          'qa-scalability'
        ]
      }
    ]
  }
};


module.exports = config;
