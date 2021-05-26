const AWS = require('aws-sdk');
const fs = require('fs');
const minimist = require('minimist');
const path = require('path');
const config = require('./aws_config');
AWS.config.update(config.region);
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });


const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});


if (argv.h || !argv.filePath ) {
  console.log(`Split JSON file based on worker count

Usage:
      node bulk-password-change.js -h | --help
      node upload_s3.js --filePath = './config.json'

Options:
    -h --help     Show this screen.
    --filePath    The path the config.json file. 
    --gitHubActionID Concatenates the id to the bucket name

`);
  process.exit(0);
}

const bucket = argv.gitHubActionID ? 
  `scalability-distributed-${argv.gitHubActionID}` : 'scalability-distributed-default';

const uploadParams = { Bucket: bucket, Key: '', Body: '' };
const file = argv.filePath;

const fileStream = fs.createReadStream(file);
fileStream.on('error', function (err) {
  console.log('File Error', err);
});
uploadParams.Body = fileStream;
uploadParams.Key = path.basename(file);

s3.upload(uploadParams, function (err, data) {
  if (err) {
    console.error('Error', err);
  } if (data) {
    console.log('Upload Success', data.Location);
  }
});
