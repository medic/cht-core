var db = require('db'),
    users = require('users'),
    utils = require('duality/utils'),
    async = require('async'),
    _ = require('underscore')._;


exports['listUsers'] = function (test)
{
    async.waterfall([
        function(callback) {
            users.list(function(err, users) {
                test.equal(err, undefined, 'listUsers has no error');
                test.notEqual(users, undefined, 'users are defined');
                callback();
            });            
        }
    ], function () {
        test.done();
    });
    
};



var deleteUser = function(username, test, callback) {
    users.delete(username, function(err) {
        if (err) {
            test.done(err);
        } else {
            callback();
        }
    });    
};

exports['createUser'] = function (test)
{
    test.expect(6);

    async.waterfall([
        function (callback) {
            // signup without properties
            users.create('wizard_of_oz', 'password', function(err, user) {
                if (err) { return test.done(err); }
                
                test.equal(err, undefined, 'signup has no error');
                test.notEqual(user, undefined, 'signup returns a value');
                test.equal(user.ok, true, 'signup returns okay');
                callback();
            });
        },
        function (callback) {
            // signup with a normal role
            users.create('wicked_with_of_the_east', 'password', {roles: ['witch']}, function(err, user) {
                if (err) { return test.done(err); }
                
                users.get('wicked_with_of_the_east', function(err, user, options) {
                    if (err) { return test.done(err); }
                    
                    test.equal(user.roles[0], "witch");
                    callback();                    
                });
            });            
        },
        function (callback) {
            // signup with admin role
            users.create('tin_woodman', 'password', {roles: ['_admin']}, function(err, user) {
                if (err) { return test.done(err); }
                
                db.request({
                    type: 'GET',
                    url: '/_config/admins/tin_woodman',
                    contentType: 'application/json'                
                }, function(err, admin) {
                    if (err) { return test.done(err); }
                    
                    test.notEqual(admin, undefined, 'tin_woodman should be an admin');
                    callback();
                });
            });
        },
        function (callback) {
            // set arbitrary argument on user doc
            users.create('scarecrow', 'password', {location: 'land of oz'}, function(err, user) {
                if (err) { return test.done(err); }
                
                users.get('scarecrow', function(err, user, options) {
                    if (err) { return test.done(err); }
                    
                    test.equal(user.location, "land of oz");
                    callback();                    
                });
            });
        },
        function (callback) {
            deleteUser('scarecrow', test, function() {
                deleteUser('wizard_of_oz', test, function() {
                    deleteUser('tin_woodman', test, function() {
                        deleteUser('wicked_with_of_the_east', test, callback);
                    });
                });                
            });
        }
    ], function () {
        test.done();
    });
};


exports['updateUser'] = function (test)
{
    test.expect(6);

    async.waterfall([
        function (callback) {
            // if new role is admin user should be admin after (1)
            users.create('wizard_of_oz', 'password', {roles: ['wizard']}, function(err, user) {
                if (err) { return test.done(err); }

                users.update('wizard_of_oz', 'password', {roles: ['_admin']}, function(err, user) {
                    if (err) { return test.done(err); }

                    db.request({
                        type: 'GET',
                        url: '/_config/admins/wizard_of_oz',
                        contentType: 'application/json'                
                    }, function(err, admin) {
                        if (err) { return test.done(err); }
                    
                        test.notEqual(admin, undefined, 'wizard_of_oz should be an admin');
                        callback();
                    });
                });
            });            
        },
        function (callback) {
            // if user was admin but new role isn't, user should not be admin after (1)
            users.create('wicked_with_of_the_east', 'password', {roles: ['_admin']}, function(err, user) {
                if (err) { return test.done(err); }
        
                users.update('wicked_with_of_the_east', 'password', {roles: ['wizard']}, function(err, user) {
                    if (err) { return test.done(err); }
        
                    db.request({
                        type: 'GET',
                        url: '/_config/admins/wicked_with_of_the_east',
                        contentType: 'application/json'
                    }, function(err, admin) {
                        test.equal(admin, undefined, 'wicked_with_of_the_east should not be an admin');
                        callback();
                    });
                });
            });
        },
        function (callback) {
            // user should have new roles afterwards (1)
            users.create('tin_woodman', 'password', {roles: ['companion']}, function(err, user) {
                if (err) { return test.done(err); }
        
                users.update('tin_woodman', 'password', {roles: ['wizard']}, function(err, user) {
                    if (err) { return test.done(err); }
        
                    users.get('tin_woodman', function(err, user, options) {
                        if (err) { return test.done(err); }
        
                        test.equal(user.roles[0], "wizard");
                        callback();                    
                    });
                });
            });            
        },
        function (callback) {
            // user should have new password afterwards (1)
            users.create('scarecrow', 'password', {roles: ['companion']}, function(err, user) {
                if (err) { return test.done(err); }
        
                users.get('scarecrow', function(err, user) {
                    if (err) { return test.done(err); }

                    var old_password = user.password_sha;
                    
                    users.update('scarecrow', 'newpassword', {roles: ['companion']}, function(err, user) {
                        if (err) { return test.done(err); }

                        users.get('scarecrow', function(err, user) {
                            if (err) { return test.done(err); }

                            test.notEqual(user.password_sha, old_password);
                            callback();
                        });
                    });                    
                });
            });
        },
        function (callback) {
            // empty password should not change password (1)
            users.create('cowardly_lion', 'password', {roles: ['companion']}, function(err, user) {
                if (err) { return test.done(err); }
        
                users.get('cowardly_lion', function(err, user) {
                    if (err) { return test.done(err); }
                    
                    var old_password = user.password_sha;
                    
                    users.update('cowardly_lion', '', {roles: ['companion']}, function(err, user) {
                        if (err) { return test.done(err); }

                        users.get('cowardly_lion', function(err, user) {
                            if (err) { return test.done(err); }

                            test.equal(user.password_sha, old_password);
                            callback();
                        });
                    });
                });                
            });            
        },
        function (callback) {
            // update arbitrary argument on user
            users.create('good_witch_of_the_north', 'password', {location: 'north'}, function(err, user) {
                if (err) { return test.done(err); }
        
                users.update('good_witch_of_the_north', 'password', {location: 'east'}, function(err, user) {
                    if (err) { return test.done(err); }
        
                    users.get('good_witch_of_the_north', function(err, user, options) {
                        if (err) { return test.done(err); }
        
                        test.equal(user.location, "east");
                        callback();                    
                    });
                });
            });
        },
        function (callback) {
            deleteUser('good_witch_of_the_north', test, function() {                
                deleteUser('wicked_with_of_the_east', test, function() {
                    deleteUser('tin_woodman', test, function() {
                        deleteUser('scarecrow', test, function() {
                            deleteUser('cowardly_lion', test, function() {                    
                                deleteUser('wizard_of_oz', test, callback);
                            });
                        });
                    });
                });
            });
        }
    ], function () {
        test.done();
    });
};
