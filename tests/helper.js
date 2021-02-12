const fs = require('fs');
const utils = require('./utils');
const EC = protractor.ExpectedConditions;

function writeScreenShot(data, filename) {
  const stream = fs.createWriteStream('./tests/results/' + filename);
  stream.write(Buffer.from(data, 'base64'));
  stream.end();
}
function handleUpdateModal() {
  utils.deprecated('handleUpdateModal','handleUpdateModalNative');
  if (element(by.css('#update-available')).isPresent()) {
    $('body').sendKeys(protractor.Key.ENTER);
  }
}

const handleUpdateModalNative = async () => {
  if (await element(by.css('#update-available')).isPresent()) {
    await $('body').sendKeys(protractor.Key.ENTER);
  }
};

module.exports = {
  clickElement: element => {
    handleUpdateModal();
    return browser
      .wait(
        EC.elementToBeClickable(element),
        12000,
        `Element taking too long to appear in the DOM ${element.locator()}`
      )
      .then(() => {
        element.click();
      })
      .catch(() => {
        browser.sleep(1000);
        handleUpdateModal();
        return browser
          .wait(EC.elementToBeClickable(element), 12000, `element is ${element.locator()}`)
          .then(() => {
            element.click();
          });
      });
  },

  clickElementNative: async element => {
    await handleUpdateModalNative();
    try {
      const msg = `First attempt to click failed. Element is ${element.locator()}`;
      await browser.wait(EC.elementToBeClickable(element),12000, msg);
      await element.click();
    } catch (err) {
      await browser.sleep(1000);
      await handleUpdateModalNative();
      const secondChangeMsg = `Second attempt to click failed. Element is ${element.locator()}`;
      await browser.wait(EC.elementToBeClickable(element), 12000, secondChangeMsg);
      await element.click();
    }
  },

  /**
   * Usage: findVisible element and click on it
   * elements : array of all elements where required elemnt has to present
   * expectedText : text that element should include
   */
  findElementByTextAndClick: (elements, expectedText) => {
    return browser
      .wait(
        EC.presenceOf(elements),
        12000,
        'Element taking too long to appear in the DOM. Giving up!'
      )
      .then(() => {
        return elements.each(element => {
          return element.getText()
            .then(text => {
              if (
                text
                  .toLowerCase()
                  .trim()
                  .includes(expectedText)
              ) {
                return element.click();
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
        `Element taking too long to appear in the DOM.Let us retry ${element.locator()}`
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
            `Element taking too long to appear in the DOM. Giving up! ${element.locator()}`
          )
          .then(() => {
            return element.getText().then(val => {
              return val;
            });
          });
      });
  },

  getTextFromElements: elements => {
    const textFromElements = [];
    return browser
      .wait(
        EC.presenceOf(elements),
        12000,
        'Element taking too long to appear in the DOM. Giving up!'
      )
      .then(() => {
        elements.each(element => {
          element.getText()
            .then(text => {
              textFromElements.push(text.trim());
            })
            .catch(err => {
              throw err;
            });
        });
        return textFromElements;
      });
  },

  elementByText: text => element(by.xpath(`//*[contains(normalize-space(text()), "${text}")]`)),

  isTextDisplayed: text => module.exports.elementByText(text).isDisplayed(),

  waitForTextDisplayed: text => {
    const selectedElement = module.exports.elementByText(text);
    return module.exports.waitUntilReadyNative(selectedElement);
  },

  logConsoleErrors: spec => {
    return browser
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

  scrollElementIntoView: element => browser.executeScript('arguments[0].scrollIntoView();', element.getWebElement()),

  /**
   * Usage: selectDropdownByNumber ( element, index)
   * element : select element
   * index : index in the dropdown, 1 base.
   */
  selectDropdownByNumber: (element, index, milliseconds) => {
    element.findElements(by.tagName('option')).then(options => {
      options[index].click();
    }).catch(err => {
      throw err;
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
        option.getText()
          .then(text => {
            if (text.indexOf(item) !== -1) {
              option.click();
            }
          })
          .catch(err => {
            throw err;
          });
      });
    }).catch(err => {
      throw err;
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
    }).catch(err => {
      throw err;
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
    }).catch(err => {
      throw err;
    });
  },

  waitElementToBeVisible: (elm, timeout) => {
    timeout = timeout || 15000;
    return browser.wait(EC.visibilityOf(elm), timeout, `waitElementToBeVisible timed out looking for ${elm.locator()}`);
  },

  waitElementToBeClickable: (elm, timeout) => {
    timeout = timeout || 15000;
    const msg = `waitElementToBeClickable timed out looking for ${elm.locator()}`;
    return browser.wait(EC.elementToBeClickable(elm), timeout, msg);
  },

  waitElementToDisappear: (locator, timeout) => {
    timeout = timeout || 15000;
    return browser.wait(() => {
      return element(locator)
        .isDisplayed()
        .then(presenceOfElement => !presenceOfElement);
    }, timeout, 'waitElementToDisappear timed out looking for '  + locator);
  },

  waitElementToPresent: (elm, timeout) => {
    timeout = timeout || 10000;
    browser.wait(() => elm.isPresent(), timeout);
  },

  waitElementToPresentNative: async (elm, timeout) => {
    timeout = timeout || 10000;
    await browser.wait(() => elm.isPresent(), timeout);
  },

  waitForAngularComplete: () => {
    return browser.wait(() => {
      console.warn('browser.AngularComplete() should be doing this. Start replacing and see if this is required');
      browser.sleep(200);
      return browser.executeScript(
        'return typeof angular === "undefined" ? 0 : ' +
        'angular.element(document.body).injector().get("$http").pendingRequests.length'
      ).then(res => res === 0);
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
      browser.wait(() => elm.isPresent(), 10000, 'Element not present in 10 seconds' + elm.locator()) &&
      browser.wait(() => elm.isDisplayed(), 12000, 'Element not displayed in 12 seconds' + elm.locator())
    );
  },
  waitUntilReadyNative: elm => {
    return browser.wait(EC.visibilityOf(elm), 10000, 'visibilityOf failed in 10 seconds ' + elm.locator());
  },

  isDisplayed: elm => {
    return elm.isDisplayed();
  },

  handleUpdateModal,
  handleUpdateModalNative,
};
