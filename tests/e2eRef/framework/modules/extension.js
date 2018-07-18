const fs = require('fs'),
    EC = protractor.ExpectedConditions;

let extend = {
    selectDropdownByValue: (element, value, milliseconds) => {
        element.all(by.css(`option[value="${value}"]`))
            .then(options => {
                if (options[0]) {
                    options[0].click();
                }
            });
        if (milliseconds) {
            browser.sleep(milliseconds);
        }
    },

    waitElementToBeClickable: elm => {
        browser.wait(EC.elementToBeClickable(elm), 15000);
    },

    waitElementToBeClickableAndClick: elm => {
        extend.waitElementToBeVisible(elm);
        extend.waitElementToBeClickable(elm);
        elm.click();
    },

    waitElementToBeVisible: elm => {
        browser.wait(EC.visibilityOf(elm), 15000);
    },

    waitUntilReady: elm => {
        return browser.wait(() => elm.isPresent(), 10000) &&
            browser.wait(() => elm.isDisplayed(), 12000);
    },
};

module.exports = extend;