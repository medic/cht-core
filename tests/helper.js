const fs = require('fs'),
  EC = protractor.ExpectedConditions;

function writeScreenShot(data, filename) {
  const stream = fs.createWriteStream('./tests/results/' + filename);
  stream.write(Buffer.from(data, 'base64'));
  stream.end();
}
function handleUpdateModal() {
  if (element(by.css('#update-available')).isPresent()) {
    $('body').sendKeys(protractor.Key.ENTER);
  }
}

module.exports = {
  clickElement: element => {
    handleUpdateModal();
    return browser
      .wait(
        EC.elementToBeClickable(element),
        12000,
        'Element taking too long to appear in the DOM'
      )
      .then(() => {
        element.click();
      })
      .catch(() => {
        browser.sleep(1000);
        handleUpdateModal();
        return browser
          .wait(EC.elementToBeClickable(element), 12000)
          .then(() => {
            element.click();
          });
      });
  },

  /**
   * Usage: findVisible element and click on it
   * elements : array of all elements where required elemnt has to present
   * expectedText : text that element should include
   */
  findElementByTextAndClick: (elements, expectedText) => {
    browser
      .wait(
        EC.presenceOf(elements),
        12000,
        'Element taking too long to appear in the DOM. Giving up!'
      )
      .then(() => {
        elements.each(element => {
          element.getText().then(text => {
            if (
              text
                .toLowerCase()
                .trim()
                .includes(expectedText)
            ) {
              element.click();
            }
          });
        });
      });
  },

  getTextFromElement: element => {
    return browser
      .wait(
        EC.presenceOf(element),
        12000,
        'Element taking too long to appear in the DOM.Let us retry'
      )
      .then(() => {
        return element.getText().then(val => {
          return val;
        });
      })
      .catch(() => {
        browser.sleep(1000);
        return browser
          .wait(
            EC.visibilityOf(element),
            12000,
            'Element taking too long to appear in the DOM. Giving up!'
          )
          .then(() => {
            return element.getText().then(val => {
              return val;
            });
          });
      });
  },

  getTextFromElements: elements => {
    let textFromElements = [];
    return browser
      .wait(
        EC.presenceOf(elements),
        12000,
        'Element taking too long to appear in the DOM. Giving up!'
      )
      .then(() => {
        elements.each(element => {
          element.getText().then(text => {
            textFromElements.push(text.trim());
          });
        });
        return textFromElements;
      });
  },

  isTextDisplayed: text => {
    const selectedElement = element(
      by.xpath('//*[text()[normalize-space() =  " ' + text + '"]]')
    );
    return selectedElement.isPresent();
  },

  logConsoleErrors: spec => {
    browser
      .manage()
      .logs()
      .get('browser')
      .then(function(browserLogs) {
        browserLogs.forEach(function(log) {
          if (log.level.value > 900) {
            fs.appendFile(
              `tests/results/${spec}-logs.txt`,
              `\r\n Console errors: ${log.message}\r\n`,
              function(err) {
                if (err) {
                  throw err;
                }
              }
            );
          }
        });
      });
  },

  /**
   * Usage: selectDropdownByNumber ( element, index)
   * element : select element
   * index : index in the dropdown, 1 base.
   */
  selectDropdownByNumber: (element, index, milliseconds) => {
    element.findElements(by.tagName('option')).then(options => {
      options[index].click();
    });
    if (milliseconds) {
      browser.sleep(milliseconds);
    }
  },

  /**
   * Usage: selectDropdownByText (selector, item)
   * selector : select element
   * item : option(s) in the dropdown.
   */
  selectDropdownByText: (element, item, milliseconds) => {
    element.all(by.tagName('option')).then(options => {
      options.some(option => {
        option.getText().then(text => {
          if (text.indexOf(item) !== -1) {
            option.click();
          }
        });
      });
    });
    if (milliseconds) {
      browser.sleep(milliseconds);
    }
  },

  selectDropdownByValue: (element, value, milliseconds) => {
    element.all(by.css(`option[value="${value}"]`)).then(options => {
      if (options[0]) {
        options[0].click();
      }
    });
    if (milliseconds) {
      browser.sleep(milliseconds);
    }
  },

  setBrowserParams: () => {
    browser.driver
      .manage()
      .window()
      .setSize(browser.params.screenWidth, browser.params.screenHeight);
  },

  takeScreenshot: filename => {
    browser.takeScreenshot().then(png => {
      writeScreenShot(png, filename);
    });
  },

  waitElementToBeVisible: (elm, timeout) => {
    timeout = timeout || 15000;
    browser.wait(EC.visibilityOf(elm), timeout);
  },

  waitElementToBeClickable: (elm, timeout) => {
    timeout = timeout || 15000;
    browser.wait(EC.elementToBeClickable(elm), timeout);
  },

  waitElementToDisappear: locator => {
    browser.wait(() => {
      return element(locator)
        .isDisplayed()
        .then(presenceOfElement => !presenceOfElement);
    }, 10000);
  },

  waitElementToPresent: (elm, timeout) => {
    timeout = timeout || 10000;
    browser.wait(() => elm.isPresent(), timeout);
  },

  waitForAngularComplete: () => {
    return browser.wait(() => {
      browser.sleep(200);
      return browser
        .executeScript(
          'return typeof angular === "undefined" ? 0 : angular.element(document.body).injector().get("$http").pendingRequests.length'
        )
        .then(res => res === 0);
    }, 15000);
  },

  waitForCheckboxToBeChecked: elem => {
    browser.wait(() => {
      return elem.getAttribute('checked').then(isElementChecked => {
        return isElementChecked;
      });
    }, 10000);
  },

  waitUntilReady: elm => {
    return (
      browser.wait(() => elm.isPresent(), 10000) &&
      browser.wait(() => elm.isDisplayed(), 12000)
    );
  },
  handleUpdateModal,
};
