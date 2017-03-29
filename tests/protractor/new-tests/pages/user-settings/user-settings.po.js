var helper = require('../../helper');

var updatePasswordButton = element(by.css('[ng-click="updatePassword()"]'));
var editUserProfileButton = element(by.css('[ng-click="editSettings()"]'));
//updatePassword modal
var updatePasswordModal = {
    passwordField: element(by.id('password')),
    confirmPasswordField: element(by.id('password-confirm'))

};


//editUserProfile modal
var editUserProfileModal = {

    usernameField: element(by.id('name')),
    fullNameField: element(by.id('fullname')),
    emailField: element(by.id('email')),
    phoneField: element(by.id('phone')),
    languageField: element(by.id('language')),




    submit: function () {
        var submitButton = element(by.className('btn submit btn-primary'));
        helper.waitUntilReady(submitButton);
        submitButton.click();

    },

    cancel: function () {
        var cancelButton = element(by.className('btn cancel'));

        helper.waitUntilReady(cancelButton);

        cancelButton.click();

    }

};




//functions to interact with our page
module.exports = {
    updatePassword: function (password) {
        //todo: fill updatePasswordModal and submit
        password.trim();
        updatePasswordModal.passwordField.sendKeys(password);
        updatePasswordModal.confirmPasswordField.sendKeys(password);
        updatePasswordButton.click();

    },

    editUserProfile: function (name, fullname, email, phone, language) {
        editUserProfileButton.className();
        editUserProfileModal.usernameField.sendKeys(name);
        editUserProfileModal.fullNameField.sendKeys(fullname);
        editUserProfileModal.emailField.sendKeys(email);
        editUserProfileModal.phoneField.sendKeys(phone);
        editUserProfileModal.languageField.sendKeys(language);
        editUserProfileModal.submit();

        //todo: fill editUserProfileModal and submit

    }
};

