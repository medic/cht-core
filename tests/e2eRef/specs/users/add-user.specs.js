const addedUser = 'fulltester' + new Date().getTime(),
    fullName = 'Bede Ngaruko',
    usersPage = require('../../tests/testObjects/users.po.js'),
    userModal = require('../../tests/testObjects/add-user-modal.po.js');

describe('Add user  : ', function () {
    beforeEach(() => {
        usersPage.openAddUserModal();
    });

    afterAll(done => {
        userModal.deleteUser(addedUser, done);
    });

    it('should add user with valid password', () => {
        userModal.fillForm(addedUser, fullName, 'StrongP@ssword1');
        userModal.submit();
        userModal.waitForEditToBeAvailable();
        userModal.checkUserSaved(addedUser, fullName);
    });

    it('should reject passwords shorter than 8 characters', () => {
        userModal.fillForm('user0', 'Not Saved', 'short');
        userModal.submit();
        userModal.checkErrorMessageAndCancel('The password must be at least 8 characters long.');
    });

    it('should reject weak passwords', () => {
        userModal.fillForm('user0', 'Not Saved', 'weakPassword');
        userModal.submit();
        userModal.checkErrorMessageAndCancel('The password is too easy to guess.');
    });

    it('should reject non-matching passwords', () => {
        userModal.fillForm('user0', 'Not Saved', '%4wbbygxkgdwvdwT65', false, 'abc');
        userModal.submit();
        userModal.checkErrorMessageAndCancel('Passwords must match');
    });

    it('should require password', () => {
        userModal.fillForm('user0', 'Not Saved', '');
        userModal.submit();
        userModal.checkErrorMessageAndCancel('Password is a required field');
    });

    it('should require username', () => {
        userModal.fillForm('', 'Not Saved', '%4wbbygxkgdwvdwT65');
        userModal.submit();
        userModal.waitForErrorMessageUserName(true);
        userModal.checkErrorMessageAndCancel('User name is a required field');
    });

    it('should require place and contact for restricted user', () => {
        userModal.fillForm('restricted', 'Not Saved', '%4wbbygxkgdwvdwT65', true);
        userModal.submit();
        userModal.checkPlaceContactAndCancel();
    });
});
