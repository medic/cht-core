var fs = require('fs');
var EC = protractor.ExpectedConditions;

 function writeScreenShot(data, filename) {
        var stream = fs.createWriteStream(filename);
        stream.write(new Buffer(data, 'base64'));
        stream.end();
    }

module.exports = {
  waitElementToBeVisisble: function (elm) {
    browser.wait(EC.visibilityOf(elm), 15000);
  },

  waitElementToBeClickable: function (elm) {
    browser.wait(EC.elementToBeClickable(elm), 15000);
  },

  waitElementToDisappear: function (locator) {
    browser.wait(function () {
      return browser.isElementPresent(locator)
        .then(function (presenceOfElement) {
          return !presenceOfElement;
        });
    }, 10000);
  },

  waitUntilReady: function (elm) {
    return browser.wait(function () {
      return elm.isPresent();
    }, 10000).then(function () {
      return browser.wait(function () {
        return elm.isDisplayed();
      }, 12000);
    });
  },

  waitForCheckboxToBeChecked: function (elem) {
    browser.wait(function () {
      return (elem.getAttribute('checked')).then(function (isElementChecked) {
        return (isElementChecked);
      });
    }, 10000);
  },

  /**
  * Usage: selectDropdownByNumber ( element, index)
  * element : select element
  * index : index in the dropdown, 1 base.
  */
  selectDropdownByNumber: function (element, index, milliseconds) {
    element.findElements(by.tagName('option'))
      .then(function (options) {
        options[index].click();
      });
    if (typeof milliseconds !== 'undefined') {
      browser.sleep(milliseconds);
    }
  },

  /**
  * Usage: selectDropdownByText (selector, item)
  * selector : select element
  * item : option(s) in the dropdown.
  */
  selectDropdownByText: function selectOption(element, item, milliseconds) {
    var desiredOption;
    element.all(by.tagName('option'))
      .then(function findMatchingOption(options) {
        options.some(function (option) {
          option.getText().then(function doesOptionMatch(text) {
            if (text.indexOf(item) !== -1) {
              desiredOption = option;
              return true;
            }
          });
        });
      })
      .then(function clickOption() {
        if (desiredOption) {
          desiredOption.click();
        }
      });
    if (typeof milliseconds !== 'undefined') {
      browser.sleep(milliseconds);
    }
  },

  setBrowserParams: function () {
    browser.driver.manage().window().setSize(browser.params.screenWidth, browser.params.screenHeight);
    browser.ignoreSynchronization = true;
  },

  isTextDisplayed: function (text) {
    var selectedElement = element(by.xpath('//*[text()[normalize-space() =  \' ' + text + '\']]'));
    return selectedElement.isPresent();
  },

  takeScreenshot:function(filename){
    browser.takeScreenshot().then(function (png) {
        writeScreenShot(png, filename);
    });
  }

};
