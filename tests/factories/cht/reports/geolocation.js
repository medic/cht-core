const Factory = require('rosie').Factory;

const geo = new Factory()
  .attr('latitude', 0.999151)
  .attr('longitude', 35.150476)
  .attr('altitude', 2)
  .attr('accuracy', 1518)
  .attr('altitudeAccuracy', null)
  .attr('heading', null)
  .attr('speed', null);

const geoLog = new Factory()
  .attr('timestamp', Date.now())
  .attr('recording', () => geo.build());

module.exports = {
  geo,
  geoLog,
};
