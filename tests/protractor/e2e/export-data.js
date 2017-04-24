var fs = require('fs'),
  moment = require('moment'),
  utils = require('../utils');

describe('Export data', function() {

  'use strict';

  var downloadDir = '/Users/estellecomment/Downloads';
  var fileNamePrefix = 'messages-' + moment().format('YYYYMMDD');
  var fileNameSuffix = '.xml';

  var submitSms = function(body) {
    var content = JSON.stringify(body);
    return utils.request({
      method: 'POST',
      path: '/api/sms',
      body: content,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': content.length
      }
    });
  };

  var getFileNamesInDir = function(dir, prefix, suffix) {
    var fileNamesFound = [];
    var fileNames = fs.readdirSync(dir);
    if (!fileNames || fileNames.length === 0) {
      return false;
    }
    fileNames.forEach(function(fileName) {
      if (fileName.startsWith(prefix) && fileName.endsWith(suffix)) {
        fileNamesFound.push(fileName);
      }
    });
    return fileNamesFound;
  };

  var cleanUpFiles = function(dir, prefix, suffix) {
    var foundFiles = getFileNamesInDir(dir, prefix, suffix);
    foundFiles.forEach(function(fileName) {
      if (fs.existsSync(dir + '/' + fileName)) {
        fs.unlinkSync(dir + '/' + fileName);
      }
    });
  };

  beforeEach(function(done) {
    cleanUpFiles(downloadDir, fileNamePrefix, fileNameSuffix);

    browser.ignoreSynchronization = true;
    var body = {
      messages: [ {
        from: '+64271234567',
        content: 'hello',
        id: 'a'
      },
      {
        from: '+64277654321',
        content: 'bye',
        id: 'b'
      }  ]
    };
    submitSms(body).then(done).catch(done);
  });

  afterEach(function(done) {
    // todo : remove messages from db
    cleanUpFiles(downloadDir, fileNamePrefix, fileNameSuffix);
    done();
  });

  var numRows = function(xml) {
    var rowRegex = /<Row>/gi;
    var rowMatches = xml.match(rowRegex);
    if (!rowMatches) {
      return 0;
    }
    return rowMatches.length;
  };

  var getDownloadFileName = function(dir, prefix, suffix) {
    return browser.driver.wait(function() {
      var foundFiles = getFileNamesInDir(dir, prefix, suffix);
      if (foundFiles.length === 0) {
        return false;
      }
      if (foundFiles.length > 1) {
        throw 'too many download files : ' + JSON.stringify(foundFiles);
      }
      return fs.existsSync(downloadDir + '/' + foundFiles[0]) && foundFiles[0];
    }, 30000);
  };

  it('exports messages', function() {
    browser.pause(); // is the profile actually set?
    element(by.id('configuration-tab')).click();
    element(by.id('configuration-import-export-button')).click();
    element(by.id('configuration-export-messages-button')).click();
    element(by.css('.configuration .tab-content .btn')).click();

    getDownloadFileName(downloadDir, fileNamePrefix, fileNameSuffix)
    .then(function(foundFile) {
      console.log('Found downloaded file', foundFile);
      var fileContents = fs.readFileSync(downloadDir + '/' + foundFile, { encoding: 'utf8' });
      // 3 rows : 1 header, 2 messages.
      expect(numRows(fileContents)).toEqual(3);
      browser.pause();
    });
  });
});

