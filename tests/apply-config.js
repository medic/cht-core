const constants = require('./constants');
const auth = require('./auth')();
const compileAppSettings = require('medic-conf/src/fn/compile-app-settings');
const uploadAppSettings = require('medic-conf/src/fn/upload-app-settings');
const convertAppForms = require('medic-conf/src/fn/convert-app-forms');
const convertContactForms = require('medic-conf/src/fn/convert-contact-forms');
const convertCollectForms = require('medic-conf/src/fn/convert-collect-forms');
const uploadAppForms = require('medic-conf/src/fn/upload-app-forms');
const uploadContactForms = require('medic-conf/src/fn/upload-contact-forms');
const uploadCollectForms = require('medic-conf/src/fn/upload-collect-forms');

// TODO: Remove this list before merge. 
// const defaultActions = [
//   'compile-app-settings',
//   'upload-app-settings',
//   'convert-app-forms',
//   'convert-collect-forms',
//   'convert-contact-forms',
//   'delete-all-forms',
//   'upload-app-forms',
//   'upload-collect-forms',
//   'upload-contact-forms',
//   'upload-resources',
//   'upload-custom-translations',
// ];

const applyConfig = (path) => {
  const COUCH_URL = `http://${auth.user}:${auth.pass}@${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}`;
  try{
    compileAppSettings(path).then(() => {
      uploadAppSettings(path,COUCH_URL);
    });
    convertAppForms(path).then(()=>{
      uploadAppForms(path,COUCH_URL);
    });
    convertContactForms(path).then(()=>{
      uploadContactForms(path,COUCH_URL);
    });
    convertCollectForms(path).then(()=>{
      uploadCollectForms(path,COUCH_URL);
    });
  }
  catch(e){
    console.log(e);
  }
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 5000);
  });
};



module.exports = applyConfig;