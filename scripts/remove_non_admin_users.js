const https = require('https');
const url = require('url');
const _ = require('underscore');

let instance_url;

if (process.env.COUCH_URL) {
  instance_url = url.parse(process.env.COUCH_URL);
} else {
  console.log('Please set COUCH_URL as an enviromental variable. E.g. https://admin:secret@project.medicmobile.org');
}

const users_db = instance_url + '/_users';
const all_users_url = users_db + '/_all_docs';

https.get(all_users_url, (res) => {
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
        console.log('Skipping...');
      } else {
        console.log(user_id);
        console.log('Deleting...');
        const del_url = users_db + '/' + user_id + '?rev=' + rev_value;
        const options = url.parse(del_url);

        const del_options = _.extend(options, {method: 'DELETE'});

        const del_req = https.request(del_options, function (resp) {
          resp.setEncoding('utf-8');

          resp.on('data', function (resp) {
            console.log(resp);
          });
        });

        del_req.on('error', function (e) {
          if (e) {
            console.log(e.message);
          }
        });
        del_req.end();
      }
    });
  });

}).on('error', (e) => {
  console.error(e);
});
