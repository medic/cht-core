const helper = require('./helper');
const genericFormPo = require('./page-objects/forms/generic-form.po');
const answeredQuestions = [];

const getPaths = (obj, prevKey, r = []) => {
  const results = r;
  let evalObj = obj;
  if (Array.isArray(obj)) {
    evalObj = obj[0];
  }
  Object.keys(evalObj).forEach((key) => {
    let resultKey = '';
    if(prevKey){
      resultKey = `${prevKey}/${key}`;
    } else {
      resultKey = key;
    }

    if(key === 'inputs'){
      return;
    }
    if(typeof evalObj[key] !== 'object'){
      results.push({path: resultKey, value: evalObj[key]});
    }else {
      getPaths(evalObj[key], resultKey, results);
    }
  });
  return results;
};


const getAttributeAndName = async (element) => {
  let name = await element.getAttribute('data-name');
  let cssAttribute = 'data-name';
  if(!name) {
    name = await element.getAttribute('name');
    cssAttribute = 'name';
  }
  return [cssAttribute, name];
};

const removeDupes = (results) => {
  const deDuped = [];
  results.forEach((result) => {
    if (!deDuped.some(deDupe => result.name === deDupe.name && result.type === deDupe.type)){
      deDuped.push(result);
    } 
  });
  return deDuped;
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
  const results = removeDupes(await Promise.all(visibleAnswers));
  return results;
};

const checkbox = (answer,answerVal) => {
  const checks = answerVal.value.split();
  checks.forEach(async (check) => {
    await helper.clickElementNative(element(by.css(`${answer.css}[value=${check}]`)));
  });
};

const radio = async (answer, answerVal) => {
  await helper.clickElementNative(element(by.css(`${answer.css}[value="${answerVal.value}"]`)));
};

const date = async (answer, answerVal) => {
  const css = `${answer.css} + div input`;
  await element(by.css(css)).sendKeys(answerVal.value);
};

const defaultAction = async (answer, answerVal) => {
  await element(by.css(answer.css)).sendKeys(answerVal.value);
};

const answerActions = {checkbox ,radio, date};

const answerQuestions = async (answers, pathKeys,reportName) => {
  answers.forEach((answer) => {
    const answerVal = pathKeys.find(key => `/${reportName}/${key.path}` === answer.name);
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
  const pathKeys = getPaths(reportFields);
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
