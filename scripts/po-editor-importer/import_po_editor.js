
const https = require('https');
const token_and_project = require('./token_and_project.json');

const langs = ['en', 'es', 'fr', 'sw', 'hi', 'ne', 'bm', 'id'];
const api_token = token_and_project.api_token;
const proj_id = token_and_project.proj_id;

langs.forEach(function(lang){
  const url = `https://poeditor.com/api/webhooks/github?api_token=${api_token}&id_project=${proj_id}&language=${lang}&operation=export_terms_and_translations`;
  https.get(url);
});
