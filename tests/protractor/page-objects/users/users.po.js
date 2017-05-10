const helper = require('../../helper');

const getAddUserButton = () => {
	return element(by.id('add-user'));
};

module.exports = {
	addUser: function (username, password) {
		username.trim();
		password.trim();
		helper.waitUntilReady(getAddUserButton());
	},

	editUser: function (username, password) {
		username.trim();
		password.trim();
		helper.waitUntilReady(getAddUserButton());
	},

	deleteUser: function (username, password) {
		username.trim();
		password.trim();
		helper.waitUntilReady(getAddUserButton());
	},

	openAddUserModal: function () {
		helper.waitElementToBeClickable(getAddUserButton());
		getAddUserButton().click();
	},
	getUsersList: function () {
		helper.waitUntilReady(getAddUserButton());
		return element.all(by.repeater('user in users'));
	}
};


