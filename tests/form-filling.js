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


const getVisibleQuestions = async () => {
  const answers = await element.all(by.css('.current input:not([disabled],.ignore)'));
  const results = [];

  for(let i = 0; i < answers.length; i++){
    let name = await answers[i].getAttribute('data-name');
    let cssAttribute = 'data-name';
    if(!name) {
      name = await answers[i].getAttribute('name');
      cssAttribute = 'name';
    }
    const type = await answers[i].getAttribute('type');
    if (results.filter(e => e.name === name && e.type === type).length === 0) {
      results.push({ 
        name: name,
        type: type,
        css: `input[${cssAttribute}="${name}"]`
      });
    }
  }
  return results;
};

const fillForm = async (reportFields,reportName) => {
  let answers = await getVisibleQuestions();
  const pathKeys = getPaths(reportFields);
  answers.forEach(async (answer) => {
    if (answeredQuestions.includes(answer.name)){
      //already answered this question
      return;
    }
    const answerVal = pathKeys.find(key => `/${reportName}/${key.path}` === answer.name);
    if(!answerVal){
      return;
    }
    switch(answer.type) {
    case 'checkbox': {
      const checks = answerVal.value.split();
      checks.forEach((check) => {
        helper.clickElementNative(element(by.css(`${answer.css}[value=${check}]`)));
      });
      break;
    }
    case 'radio':
      await helper.clickElementNative(element(by.css(`${answer.css}[value="${answerVal.value}"]`)));
      break;
    case 'date': {
      const css = `${answer.css} + div input`;
      element(by.css(css)).sendKeys(answerVal.value);
      break;
    }
    default:
      element(by.css(answer.css)).sendKeys(answerVal.value);
    }
    answeredQuestions.push(answer.name);
    // Need to see if there are any new answers since selecting a previous option.
    answers = await getVisibleQuestions();
  });

  if(await helper.isDisplayed(element(by.css('button.btn.btn-primary.next-page')))) {
    await genericFormPo.nextPageNative();
    await fillForm(reportFields,reportName);
  } else {
    await genericFormPo.submitNative();
  }
};

module.exports = {
  fillForm
};
