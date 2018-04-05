
var https = require('https');
var token_and_project = require('./token_and_project.json');

var langs = ['en', 'es', 'fr', 'sw', 'hi', 'ne', 'bm', 'id'];
var api_token = token_and_project.api_token;
var proj_id = token_and_project.proj_id;

langs.forEach(function(lang){
    var url = `https://poeditor.com/api/webhooks/github?api_token=${api_token}&id_project=${proj_id}&language=${lang}&operation=export_terms_and_translations`;
    https.get(url);
});
