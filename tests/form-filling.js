const helper = require('./helper');
const genericFormPo = require('./page-objects/forms/generic-form.po');
const answeredQuestions = [];
const flatten = require('flat');

const getAttributeAndName = async (element) => {
  let name = await element.getAttribute('data-name');
  let cssAttribute = 'data-name';
  if(!name) {
    name = await element.getAttribute('name');
    cssAttribute = 'name';
  }
  return [cssAttribute, name];
};

const getVisibleAnswers = async () => {
  const answers = await element.all(by.css('.current input:not([disabled],.ignore)'));
  const visibleAnswers = await answers.map(async (answer) => {
    const [cssAttribute, name] = await getAttributeAndName(answer);
    const type = await answer.getAttribute('type');
    return { 
      name: name,
      type: type,
      css: `input[${cssAttribute}="${name}"]`
    };
  });
  return await Promise.all(visibleAnswers);
};

const checkbox = (answer,answerVal) => {
  const checks = answerVal.split();
  checks.forEach(async (check) => {
    await helper.clickElementNative(element(by.css(`${answer.css}[value=${check}]`)));
  });
};

const radio = async (answer, answerVal) => {
  await helper.clickElementNative(element(by.css(`${answer.css}[value="${answerVal}"]`)));
};

const date = async (answer, answerVal) => {
  const css = `${answer.css} + div input`;
  await element(by.css(css)).sendKeys(answerVal);
};

const defaultAction = async (answer, answerVal) => {
  await element(by.css(answer.css)).sendKeys(answerVal);
};

const answerActions = {checkbox ,radio, date};

const repeats = (pathKeys) => {
  const newKeys = pathKeys;
  const removedIndexes = {};
  Object.keys(newKeys).forEach((key)=>{
    const repeatNum = key.match(/(\.\d\.)/g);
    if(repeatNum){
      const stripped = key.replace(repeatNum[0],'.');
      removedIndexes[stripped] = newKeys[key];
    }
  });
  return Object.assign(newKeys, removedIndexes);
};

const answerQuestions = async (answers, pathKeys,reportName) => {
  answers.forEach((answer) => {
    const answerKey = answer.name.replace(`/${reportName}/`,'').replace(/\//g,'.');
    const answerVal = pathKeys[answerKey];
    if (answeredQuestions.includes(answer.name) || !answerVal){
      //already answered this question or there is no corresponding value in the report.
      return;
    }

    const actionToExecute = answerActions[answer.type] || defaultAction;
    actionToExecute(answer, answerVal);
    answeredQuestions.push(answer.name);
  });
  // Need to see if there are any new answers since selecting a previous answer.
  const possibleNewQuestions = await getVisibleAnswers();
  if(possibleNewQuestions.some(x => !answeredQuestions.includes(x.name))) {
    answerQuestions(possibleNewQuestions, pathKeys,reportName);
  }
  return;
};

const fillForm = async (reportFields,reportName) => {
  const flatObj = flatten(reportFields);
  const pathKeys = repeats(flatObj);
  const answers = await getVisibleAnswers();
  answerQuestions(answers, pathKeys, reportName);

  if(await helper.isDisplayed(genericFormPo.nextButton)) {
    await genericFormPo.nextPageNative();
    await fillForm(reportFields,reportName);
  } else {
    await genericFormPo.submitNative();
  }
};

module.exports = {
  fillForm
};
