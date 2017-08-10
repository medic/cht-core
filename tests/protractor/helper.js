const fs = require('fs'),
      EC = protractor.ExpectedConditions;

function writeScreenShot(data, filename) {
  const stream = fs.createWriteStream(filename);
  stream.write(new Buffer(data, 'base64'));
  stream.end();
}

module.exports = {
  waitElementToBeVisisble: elm => {
    browser.wait(EC.visibilityOf(elm), 15000);
  },

  waitElementToBeClickable: elm => {
    browser.wait(EC.elementToBeClickable(elm), 15000);
  },

  waitElementToDisappear: locator => {
    browser.wait(() => {
      return element(locator).isPresent()
        .then(presenceOfElement => {
          return !presenceOfElement;
        });
    }, 10000);
  },

  waitElementToBeAttached: locator => {
    let result = false;
    let attempts = 0;
    while (attempts < 2) {
      try {
        browser.actions().mouseMove(locator).perform();
        result = true;
        break;
      } catch (err) {
        browser.sleep(200);
        console.log(err);
      }
      attempts++;
    }
    return result;
  },

  waitUntilReady: elm => {
    return browser.wait(() => { return elm.isPresent(); }, 10000) &&
      browser.wait(() => { return elm.isDisplayed(); }, 12000);
  },

  waitForCheckboxToBeChecked: elem => {
    browser.wait(() => {
      return (elem.getAttribute('checked')).then(isElementChecked => {
        return (isElementChecked);
      });
    }, 10000);
  },

  /**
  * Usage: selectDropdownByNumber ( element, index)
  * element : select element
  * index : index in the dropdown, 1 base.
  */
  selectDropdownByNumber: (element, index, milliseconds) => {
    element.findElements(by.tagName('option'))
      .then(options => {
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
    let desiredOption;
    element.all(by.tagName('option'))
      .then(function findMatchingOption(options) {
        options.some(option => {
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

  setBrowserParams: () => {
    browser.driver.manage().window().setSize(browser.params.screenWidth, browser.params.screenHeight);
  },

  isTextDisplayed: text => {
    const selectedElement = element(by.xpath('//*[text()[normalize-space() =  \' ' + text + '\']]'));
    return selectedElement.isPresent();
  },

  takeScreenshot: filename => {
    browser.takeScreenshot().then(png => {
      writeScreenShot(png, filename);
    });
  }

};
