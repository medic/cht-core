module.exports = {
  'maps': [
    {
      'tiles': [ 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' ],
      'name': 'streets',
      'attribution': 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }
  ],
  'repeatOrdinals': false,
  'validateContinuously': false,
  'validatePage': true,
  'swipePage': false,
  'textMaxChars': 2000,
  'experimentalOptimizations': {
    'computeAsync': true,
  },
  excludeNonRelevant: true
};
