var https = require("https");
var url = require("url");
var _ = require("underscore");

if (process.env.COUCH_URL) {
  instance_url = url.parse(process.env.COUCH_URL);
} else {
  console.log('Please set COUCH_URL as an enviromental variable. E.g. https://admin:secret@project.medicmobile.org');
}

var users_db = instance_url + '/_users';
var all_users_url = users_db + '/_all_docs';

https.get(all_users_url, (res) => {
  var medic_users_res = '';

  res.on('data', (d) => {
    medic_users_res += d;
    });

  res.on('end', function(){
    var medic_users = JSON.parse(medic_users_res).rows;

    medic_users.forEach(function(medic_user){

      const rev_value = medic_user.value.rev
      const user_id = medic_user.id

      if(user_id == 'org.couchdb.user:admin' || user_id == '_design/_auth'){
        console.log('Skipping...');
      } else {
        console.log(user_id);
        console.log('Deleting...');
        var del_url = users_db + '/' + user_id + '?rev=' + rev_value;
        var options = url.parse(del_url);

        _.extend(options, {method: 'DELETE'});

        var del_req = https.request(del_options, function (resp) {
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
  })
  });

}).on('error', (e) => {
  console.error(e);
});
