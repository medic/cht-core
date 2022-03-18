// const {
//   assertBoolean,
//   assertNumberValue,
//   assertStringValue,
//   assertTrue,
//   initDoc,
// } = require('./helpers');
const {
  ContactServices,
  FileServices,
  FormDataServices,
  TranslationServices,
  XmlServices,
  EnketoFormManager
} = require('../src/enketo-form-manager');

describe('predicates with function calls', ()=> {

  it('should handle deep example 1', () => {
    console.log('Hello Wortld');
    const manager = new EnketoFormManager({}, {}, {});
    console.log(manager);
  });
});
