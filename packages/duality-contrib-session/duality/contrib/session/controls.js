var session = require('session');


exports.clearErrors = function (form) {
    $('.general_errors', form).text('');
    $('.username .errors', form).text('');
    $('.username').removeClass('validation_error');
    $('.password .errors', form).text('');
    $('.password').removeClass('validation_error');
};

exports.showDropDown = function () {
    $('#session .login').addClass('active');
    $('#login_dropdown').show();
    $('#login_dropdown input[name="name"]').focus().select();
};

exports.hideDropDown = function () {
    $('#session .login').removeClass('active');
    $('#login_dropdown').hide();
    exports.clearErrors();
};

exports.toggleDropDown = function () {
    if ($('#session .login').hasClass('active')) {
        exports.hideDropDown();
    }
    else {
        exports.showDropDown();
    }
};

exports.bind = function () {
    $('#session .logout a').click(function (ev) {
        ev.preventDefault();
        session.logout();
        return false;
    });
    $('#session .login a').click(function (ev) {
        ev.preventDefault();
        exports.toggleDropDown();
        return false;
    });
    $('#login_form_cancel').click(function (ev) {
        exports.hideDropDown();
    });
    $('#login_form').submit(function (ev) {
        ev.preventDefault();
        var form = this;
        var spinner_elt = $('.spinner', form).show();
        var username = $('input[name="name"]', form).val();
        var password = $('input[name="password"]', form).val();
        exports.clearErrors(form);
        if (!username) {
            $('.username .errors', form).text('Please enter a username');
            $('.username').addClass('validation_error');
        }
        if (!password) {
            $('.password .errors', form).text('Please enter a password');
            $('.password').addClass('validation_error');
        }
        if (username && password) {
            session.login(username, password, function (err) {
                if (err) {
                    $('.general_errors', form).text(err.toString());
                    spinner_elt.hide();
                }
            });
        } else {
            spinner_elt.hide();
        }
        return false;
    });
};
