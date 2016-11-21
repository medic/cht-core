/**
 * Converts tabular zscore data as provided by the WHO into the
 * JSON format required by the zscore enketo widget.
 *
 * http://www.who.int/childgrowth/standards/en/
 */

var fs = require('fs');

var pivot = function(data, keyFn) {
  var result = [];
  var lines = data.split('\n');
  lines.forEach(function(line) {
    var points = line.split(' ');
    points.shift(); // the first point is a SD number
    points.forEach(function(point, i) {
      if (!result[i]) {
        result[i] = {
          key: keyFn(i),
          points: []
        }
      }
      result[i].points.unshift(parseFloat(point));
    });
  });
  return result;
};

var getHFWChart = function(callback) {
  fs.readFile('wfl_kg_boys_z_exp.txt', 'utf8', function(err, male) {
    if (err) {
      return callback(err);
    }
    fs.readFile('wfl_kg_girls_z_exp.txt', 'utf8', function(err, female) {
      if (err) {
        return callback(err);
      }
      var keyFn = function(i) {
        // height starts at 45cm and increments by 0.1cm
        return (i / 10) + 45;
      }
      var chart = {
        id: 'weight-for-height',
        data: {
          male: pivot(male, keyFn),
          female: pivot(female, keyFn)
        }
      };
      callback(null, chart);
    });
  });
};

var getWFAChart = function(callback) {
  fs.readFile('wfa_kg_boys_z_exp.txt', 'utf8', function(err, male) {
    if (err) {
      return callback(err);
    }
    fs.readFile('wfa_kg_girls_z_exp.txt', 'utf8', function(err, female) {
      if (err) {
        return callback(err);
      }
      var keyFn = function(i) {
        // age starts at 0 days and increments by 1 day
        return i;
      }
      var chart = {
        id: 'weight-for-age',
        data: {
          male: pivot(male, keyFn),
          female: pivot(female, keyFn)
        }
      };
      callback(null, chart);
    });
  });
};

var getHFAChart = function(callback) {
  fs.readFile('lhfa_boys_z_exp.txt', 'utf8', function(err, male) {
    if (err) {
      return callback(err);
    }
    fs.readFile('lhfa_girls_z_exp.txt', 'utf8', function(err, female) {
      if (err) {
        return callback(err);
      }
      var keyFn = function(i) {
        // age starts at 0 days and increments by 1 day
        return i;
      }
      var chart = {
        id: 'height-for-age',
        data: {
          male: pivot(male, keyFn),
          female: pivot(female, keyFn)
        }
      };
      callback(null, chart);
    });
  });
};

getWFAChart(function(err, wfaChart) {
  if (err) {
    throw err;
  }
  getHFAChart(function(err, hfaChart) {
    if (err) {
      throw err;
    }
    getHFWChart(function(err, wfhChart) {
      if (err) {
        throw err;
      }
      var doc = {
        _id: 'zscore-charts',
        charts: [ wfaChart, hfaChart, wfhChart ]
      };
      fs.writeFile('doc.json', JSON.stringify(doc, null, 2), function(err) {
        if (err) {
          throw err;
        }
        console.log('SUCCESS');
      });
    });
  });
});