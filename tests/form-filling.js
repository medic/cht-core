const helper = require('./helper');
const genericFormPo = require('./page-objects/protractor/enketo/generic-form.po');
const answeredQuestions = [];
const flatten = require('flat');

const checkbox = (answer, answerVal) => {
  const checks = answerVal.split();
  checks.forEach(async (check) => {
    await helper.clickElementNative(element(by.css(`${answer.css}[value=${check}]`)));
  });
};

const radio = async (answer, answerVal) => {
  await helper.clickElementNative(element(by.css(`${answer.css}[value="${answerVal}"]`)));
};

const date = async (answer, answerVal) => {
  const elm = element(by.css(`${answer.css} + div input`));
  await helper.waitUntilReadyNative(elm);
  await elm.sendKeys(answerVal, protractor.Key.TAB);
};

const defaultAction = async (answer, answerVal) => {
  const elm = element(by.css(answer.css));
  await helper.waitUntilReadyNative(elm);
  await elm.sendKeys(answerVal);
};

const answerActions = { checkbox, radio, date };

const repeats = (pathKeys) => {
  const newKeys = pathKeys;
  const removedIndexes = {};
  Object.keys(newKeys).forEach((key) => {
    const repeatNum = key.match(/(\.\d\.)/g);
    if (repeatNum) {
      const stripped = key.replace(repeatNum[0], '.');
      removedIndexes[stripped] = newKeys[key];
    }
  });
  return Object.assign(newKeys, removedIndexes);
};

const answerQuestions = async (questions, pathKeys, reportName) => {
  for (const question of questions) {
    const regex = new RegExp(`input\\[(data-name|name)="\\/${reportName}\\/`, 'g');
    const answerPath = question.css.replace(regex, '').replace('"]', '').replace(/\//g, '.');
    const answerVal = pathKeys[answerPath];
    if (answeredQuestions.includes(question.css) || !answerVal) {
      //already answered this question or there is no corresponding value in the report.
      continue;
    }

    const actionToExecute = answerActions[question.type] || defaultAction;
    await actionToExecute(question, answerVal);
    answeredQuestions.push(question.css);
  }
};

const fillForm = async (reportFields, reportName, allFormPages) => {
  const flatObj = flatten(reportFields);
  const pathKeys = repeats(flatObj);
  // const answers = await getVisibleAnswers();
  for (const formPage of allFormPages) {
    await answerQuestions(formPage, pathKeys, reportName);
    if (await helper.isDisplayed(genericFormPo.nextButton)) {
      await genericFormPo.nextPageNative();
    }
  }
  await genericFormPo.submitNative();
};

module.exports = {
  fillForm
};
