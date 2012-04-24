exports.login = function(casper, user, password, callback) {
    casper.click(".login");
    casper.then(function() {
        casper.fill("form#login_form", {
            username: user,
            password: password
        }, true);
        casper.then(function() {
            console.log('jj');
            this.debugHTML();
        });
        callback();
    });
};