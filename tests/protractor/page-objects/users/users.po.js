var helper = require('../../helper');
var addUserButton = element(by.id('add-user'));
var addUserModal = $('mm-modal#edit-user-profile');
//var usersList = element.all(by.repeater('user in users'));

module.exports = {
	addUser: function (username, password) {
		// addUserButton.click();
		username.trim();
		password.trim();
		helper.waitUntilReady(addUserButton);
	},

	editUser: function (username, password) {
		username.trim();
		password.trim();
		helper.waitUntilReady(addUserButton);
	},

	deleteUser: function (username, password) {
		username.trim();
		password.trim();
		helper.waitUntilReady(addUserButton);

	},
	openAddUserModal:function(){
		helper.waitElementToBeClickable(addUserButton);
		addUserButton.click();
		helper.waitElementToBeVisisble(addUserModal);
	}


};


