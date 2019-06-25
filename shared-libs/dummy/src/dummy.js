const Lazy = require('lazy.js');

module.exports = {
  doSomeLazy: arr => {
    console.log('running in the dummy!!!');
    return Lazy(arr).filter(item => item.id === 'whatever');
  }
};
