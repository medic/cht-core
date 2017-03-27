var helper = require('../../helper');

var UsersPage = function () {

    //title 
   var pageTitle = 'Medic Mobile';
   var addUserButton = element(by.id('add-user'));
   var usersList = element.all(by.repeater('user in users'));

    //functions to interact with our page

   var addUser = function (username, password) {
        username.trim();
        password.trim();
        helper.waitUntilReady(this.addUserButton);

    };

   var editUser = function (username, password) {
        username.trim();
        password.trim();

        helper.waitUntilReady(this.addUserButton);

    };
   var deleteUser = function (username, password) {
        username.trim();
        password.trim();
        helper.waitUntilReady(this.addUserButton);

    };


};

module.exports = UsersPage;
