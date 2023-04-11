/**
 * This script will delete every user but two: the "admin" user and the "_design/_auth" user.
 * You have been warned!
 *
 * Last updated 7 Oct 2020 against 3.10
 */

const https = require('https');
const http = require('http');
const url = require('url');
const _ = require('underscore');

let instance_url;
let httpHandler;
let instance_url_obj;

if (process.env.COUCH_URL) {
  instance_url_obj = url.parse(process.env.COUCH_URL);
  instance_url = instance_url_obj.protocol + '//' + instance_url_obj.auth + '@' + instance_url_obj.host;
  if(instance_url_obj.protocol === 'https'){
    httpHandler = https;
  } else {
    httpHandler = http;
  }
} else {
  console.log('Please set COUCH_URL as an enviromental variable. E.g. https://admin:secret@project.medicmobile.org');
}

const users_db = instance_url + '/_users';
const all_users_url = users_db + '/_all_docs';

httpHandler.get(all_users_url, (res) => {
  let medic_users_res = '';

  res.on('data', (d) => {
    medic_users_res += d;
  });

  res.on('end', function(){
    const medic_users = JSON.parse(medic_users_res).rows;

    medic_users.forEach(function(medic_user){

      const rev_value = medic_user.value.rev;
      const user_id = medic_user.id;

      if(user_id === 'org.couchdb.user:admin' || user_id === '_design/_auth'){
        console.log('Skipping', user_id);
      } else {
        const del_url = users_db + '/' + user_id + '?rev=' + rev_value;
        const options = url.parse(del_url);

        const del_options = _.extend(options, {method: 'DELETE'});

        const del_req = httpHandler.request(del_options, function (resp) {
          resp.setEncoding('utf-8');

          resp.on('data', function (resp) {
            console.log('Response from Deleting', user_id, resp);
          });
        });

        del_req.on('error', function (e) {
          if (e) {
            console.log('Error from Deleting', user_id, e.message);
          }
        });
        del_req.end();
      }
    });
  });

}).on('error', (e) => {
  console.error(e);
});
