
var EC = protractor.ExpectedConditions;

var waitElementToBeVisisble = function (elm) {

  browser.wait(EC.visibilityOf(elm), 15000);
};

var waitElementToBeClickable = function (elm) {

  browser.wait(EC.elementToBeClickable(elm), 15000);
};

var waitUntilReady = function (elm) {
  return browser.wait(function () {
    return elm.isPresent();
  }, 10000).then(function() {
    return browser.wait(function () {
      return elm.isDisplayed();
    }, 10000);
  });
};

var waitElementToDisappear = function (locator) {
  browser.wait(function () {
    return browser.isElementPresent(locator) //if element is already present, this line will evaluate to true
    .then(function (presenceOfElement) {
      return !presenceOfElement;
    }); // this modifies the previous line so that it evaluates to false until the element is no longer present.
  }, 10000);
};

var waitForCheckboxToBeChecked = function (elem) {
  browser.wait(function () {
    return (elem.getAttribute('checked')).then(function (isElementChecked) {
      return (isElementChecked);
    });
  }, 10000);
};

/**
* Usage: selectDropdownByNumber ( element, index)
* element : select element
* index : index in the dropdown, 1 base.
*/
var selectDropdownByNumber = function (element, index, milliseconds) {
  element.findElements(by.tagName('option'))
  .then(function (options) {
    options[index].click();
  });
  if (typeof milliseconds !== 'undefined') {
    browser.sleep(milliseconds);
  }
};

/**
* Usage: selectDropdownByText (selector, item)
* selector : select element
* item : option(s) in the dropdown.
*/
var selectDropdownByText = function selectOption(element, item, milliseconds) {
  var desiredOption;
  element.findElements(by.tagName('option'))
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
};

var setBrowserParams = function () {
  browser.driver.manage().window().setSize(browser.params.screenWidth, browser.params.screenHeight);
  browser.ignoreSynchronization = true;
};


var isTextDisplayed = function (text) {

 var selectedElement = element(by.xpath('//*[text()[normalize-space() = ' + ' \' ' + text + '\']]'));
return selectedElement.isPresent();

};


//module.exports=Helper;

exports.waitElementToBeVisisble = waitElementToBeVisisble;
exports.waitElementToBeClickable = waitElementToBeClickable;
exports.waitElementToDisappear = waitElementToDisappear;
exports.waitUntilReady = waitUntilReady;
exports.waitForCheckboxToBeChecked = waitForCheckboxToBeChecked;
exports.selectDropdownByNumber = selectDropdownByNumber;
exports.selectDropdownByText = selectDropdownByText;
exports.setBrowserParams = setBrowserParams;
//exports.click = click;
exports.isTextDisplayed = isTextDisplayed;

