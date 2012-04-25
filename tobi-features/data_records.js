var utils = require('./utils')
  , user = 'root'
  , password = 'password'
  , tobi = require('tobi')
  , browser = tobi.createBrowser(5984, "localhost", { external: true });

utils.createTestDB(user, password, function() {
    utils.createDataRecord(user, password, function() {
        browser.get('/kujua-export-test/_design/kujua-export/_rewrite/data_records', function(res, $) {
            setTimeout(function() {
                console.log($('body').html());
                // $('.login').click();
                // $('#login_form').fill({
                //     username: 'root',
                //     password: 'password'
                // });
                // $('.modal-footer .btn.btn-primary').click(function(res, $) {
                //     console.log(res);
                //     console.log($('#topnav').html());
                    utils.removeTestDB(user, password);
                // });                
            }, 5000);
        });
    });
});