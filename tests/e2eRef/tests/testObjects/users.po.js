const utils = framework.utils;

let users = new framework.TEST_OBJECT({
    openAddUserModal: function () {
        browser.driver.navigate().refresh();
        browser.get(utils.getAdminBaseUrl() + 'users');
        this.el.addUserBtn.waitElementToBeClickableAndClick();
    },

    locators: {
    addUserBtn:        {id: 'add-user'},
}
});

module.exports = users;