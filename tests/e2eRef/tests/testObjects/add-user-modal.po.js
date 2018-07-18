const utils = framework.utils,
    helper = framework.helper;

let addUserModal = new framework.TEST_OBJECT({
    cancel: function () {
        this.el.cancelButton.waitUntilReady();
        this.el.cancelButton.click();
    },

    checkErrorMessageAndCancel: function (errorMessage) {
        expect(this.el.errorMessage.getText()).toContain(errorMessage);
        this.el.cancelButton.click();
    },

    checkPlaceContactAndCancel: function () {
        expect(this.el.errorFacility.getText()).toContain('required');
        expect(this.el.errorContact.getText()).toContain('required');
        this.el.cancelButton.click();
    },

    checkUserSaved: function (addedUser, fullName) {
        expect(helper.isTextDisplayed(addedUser));
        expect(helper.isTextDisplayed(fullName));
    },

    deleteUser: function (addedUser, done) {
        utils.request(`/_users/${addedUser}`)
            .then(doc => utils.request({
                path: `/_users/${addedUser}?rev=${doc._rev}`,
                method: 'DELETE'
            }))
            .catch(() => {
            })
            .then(() => utils.afterEach(done));
    },

    fillForm: function (username, fullname, password, alternativeArea, notMatchingPassword) {
        this.el.submitButton.waitUntilReady();
        this.el.usernameField.sendKeys(username);
        this.el.fullNameField.sendKeys(fullname);
        this.el.emailField.sendKeys('bede@mobile.org');
        this.el.phoneField.sendKeys('0064212134566');
        this.el.languageField.selectDropdownByValue('en', 2);
        if (alternativeArea) {
            this.el.roleField.selectDropdownByValue('string:district_admin');
        } else {
            this.el.roleField.selectDropdownByValue('string:national_admin');
        }
        this.el.passwordField.sendKeys(password);
        if (notMatchingPassword) {
            this.el.confirmPasswordField.sendKeys(notMatchingPassword);
        } else {
            this.el.confirmPasswordField.sendKeys(password);
        }
    },

    submit: function () {
        this.el.submitButton.waitUntilReady();
        this.el.submitButton.click();
    },

    waitForEditToBeAvailable: function () {
        this.el.editUser.waitElementToBeVisible();
    },

    waitForErrorMessageUserName: function () {
        this.el.errorMessageUserName._first.waitUntilReady();
    },

    locators: {
        usernameField:        {id: 'username'},
        fullNameField:        {id: 'fullname'},
        phoneField:           {id: 'phone'},
        emailField :          {id: 'email'},
        languageField :       {id: 'email'},
        roleField:            {id: 'role'},
        passwordField:        {id: 'password'},
        confirmPasswordField: {id: 'password-confirm'},
        submitButton:         {css: '.btn.submit.btn-primary:not(.ng-hide)'},
        cancelButton:         {className: 'btn cancel'},
        editUser:             {css: '#edit-user-profile'},
        cancelErrorBtn:       {css: 'button.cancel.close'},
        errorMessage:         {css: '.required.has-error'},
        errorFacility:        {css: '#facilitySelect ~ .help-block'},
        errorContact:         {css: '#contactSelect ~ .help-block'},
        errorMessageUserName: {css: 'span.help-block.ng-binding'},
    }
});

module.exports = addUserModal;