var helper = require('../../helper');

  // var pageTitle = 'Medic Mobile';
   var addUserButton = element(by.id('add-user'));
   //var usersList = element.all(by.repeater('user in users'));

    //functions to interact with our page
module.exports={
 addUser : function (username, password) {
    // addUserButton.click();
        username.trim();
        password.trim();
        helper.waitUntilReady(addUserButton);

    },

 editUser : function (username, password) {
        username.trim();
        password.trim();

        helper.waitUntilReady(addUserButton);

    },
   deleteUser : function (username, password) {
        username.trim();
        password.trim();
        helper.waitUntilReady(addUserButton);

    }


};


