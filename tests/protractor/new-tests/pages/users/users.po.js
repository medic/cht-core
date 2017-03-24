var helper = require('../../helper');

var UsersPage = function () {

    //title 
    this.pageTitle = 'Medic Mobile';
    this.addUserButton = element(by.id('add-user'));
    this.usersList = element.all(by.repeater('user in users'));

    //functions to interact with our page

    this.addUser = function (username, password) {
        username.trim();
        password.trim();
        helper.waitUntilReady(this.addUserButton);

    };

    this.editUser = function (username, password) {
        username.trim();
        password.trim();

        helper.waitUntilReady(this.addUserButton);

    };
    this.deleteUser = function (username, password) {
        username.trim();
        password.trim();
        helper.waitUntilReady(this.addUserButton);

    };


};

module.exports = UsersPage;
