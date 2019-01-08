const req = require('request');
const queryString = require('querystring');
const {promisify} = require('util');
const {mkdir, save, version} = require('./utils');
const post = promisify(req.post);
const fs = require('fs');
const slack = require('../src/slack')(process.env.SLACK_WEBHOOK_URL);


const upload = async (opts) => {
  opts.language = opts.file.split('-').pop().split('.')[0];
  const form = {};
  form['file'] = fs.createReadStream(__dirname + '/..' + opts['file']);
  delete opts['file']
  Object.keys(opts).forEach((key) => { form[key] = opts[key]; });
  try {
    let res = await post({
      headers: { 'Content-Type': 'multipart/form-data; charset=UTF-8' },
      uri: `${process.env.POE_API_URL}/projects/upload`,
      formData: form});
    res = JSON.parse(res.body);
    console.log(opts.language);
    console.log(res.result);
    slack.send(`Translations ${version()}: ${JSON.stringify(res.result)}`);
    console.log('---------------------');
    return res.response;
  } catch(err) {
    console.log(err);
  }
};

const download = async (opts) => {
  const dir =`${__dirname}/../${opts.filepath}`;
  const relativePath = opts.filepath;
  mkdir(dir);
  delete opts.filepath;
  const langs = opts.language === 'all' ? (await languages(opts)) : [opts.language];

  const res = langs.map(async (lang) => {
    opts.language = lang;
    const form = queryString.stringify(opts);
    const res = await post({
      headers: {
        'Content-Length': form.length,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: `${process.env.POE_API_URL}/projects/export`,
      body: form});
    const {response, result} = JSON.parse(res.body);
    console.log(lang);
    console.log(response);
    slack.send(`Translations ${version()}: ${JSON.stringify(response)}`);
    console.log('---------------------');
    if(response.code != 200) {
      console.log(response);
      process.exit(1);
    }
    const file = `messages-${lang}.properties`;
    console.log(`Saving to: ${relativePath}/${file}`);
    save(result.url, `${dir}/${file}`);
    return response;
  });
  await Promise.all(res)
};

const languages = async (opts) => {
  const form = queryString.stringify(opts);
  const res = await post({
    headers: {
      'Content-Length': form.length,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    url: `${process.env.POE_API_URL}/languages/list`,
    body: form});
  console.log(res.body);
  const {response, result} = JSON.parse(res.body);
  return result.languages.map(lang => lang.code);
};

const executeCommand = {
  upload: () => upload,
  download: () => download
};

module.exports = {
  upload: async (opts) => upload(opts),
  download: async (opts) => download(opts),
  languages: async (opts) => languages(opts),
  execute: async (cmd, opts) => {
    await executeCommand[cmd]()(opts);
  }
};
