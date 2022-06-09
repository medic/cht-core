const {save, mmVersion, error} = require('./utils');
const queryString = require('querystring');
const post = require('./post');
const {readStream} = require('./read');
const {
  validTranslations,
  validDirectory,
  validatePlaceHolders
} = require('./validate');
const slack = require('./slack')(process.env.SLACK_WEBHOOK_URL);

const upload = async (opts) => {
  if(validTranslations(opts.file)) {
    opts.language = opts.file.split('-').pop().split('.')[0];
    const form = {file: readStream(`${process.cwd()}/${opts.file}`)};
    delete opts.file;
    Object.keys(opts).forEach((key) => form[key] = opts[key]);
    try {
      let res = await post({
        headers: { 'Content-Type': 'multipart/form-data; charset=UTF-8' },
        uri: `${process.env.POE_API_URL}/projects/upload`,
        formData: form});
      res = JSON.parse(res.body);
      console.log(opts.language);
      if(res.response.code !== '200') {
        error('Unable to upload translation.');
        console.log(res.response);
      } else {
        console.log(res.result);
        slack.send(`Translations ${mmVersion()}: ${JSON.stringify(res.result)}`);
      }
      return res.response;
    } catch(err) {
      console.log(err);
    }
  }
};

const download = async (opts) => {
  if(validDirectory(opts.file)) {
    const dir = `${process.cwd()}/${opts.file}`;
    delete opts.file;
    const langs = opts.language === 'all' ? await languages(opts) : [opts.language];
    const downloads = langs.map(async (lang) => {
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
      if(response.code !== '200') {
        console.log(response);
        process.exit(1);
      }
      const file = `messages-${lang}.properties`;
      console.log(`\t${lang} saved to ${dir}/${file}`);
      await save(result.url, `${dir}/${file}`);
      return response;
    });
    await Promise.all(downloads);
    if (! await validatePlaceHolders(langs, dir)) {
      throw new Error('Invalid placeholders or "messageformat" messages!');
    }
  }
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
  const {result} = JSON.parse(res.body);
  return result.languages.map(lang => lang.code);
};

module.exports = {
  upload: async (opts) => upload(opts),
  download: async (opts) => download(opts),
  languages: async (opts) => languages(opts)
};
