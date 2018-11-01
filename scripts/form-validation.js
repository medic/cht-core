const fs = require('fs');

function validateForms(path) {
  var formFolders = fs.readdirSync(path);
  var passedValidation = true;
  formFolders.forEach(function(folderName) {
    var folderPAth = path + folderName + '/';
    var files = fs.readdirSync(folderPAth);
    var filterFnames = files.filter(
      fName => fName.includes('.xml') || fName.includes('.xlsx')
    );
    for (var i = 0; i < filterFnames.length; i += 2) {
      var xml = folderPAth + filterFnames[i + 1];
      var xlsx = folderPAth + filterFnames[i];
      if (
        validateNamesDoNotMatch(xlsx, xml) ||
        validateModifiedTimesDoNotMatch(xml, xlsx)
      ) {
        passedValidation = false;
        return;
      }
    }
  });
  return passedValidation;
}

function validateNamesDoNotMatch(xlsxName, xmlName) {
  var strippedName = xlsxName.substring(0, xlsxName.lastIndexOf('.'));
  if (strippedName + '.xml' !== xmlName) {
    console.error(
      'xlsx and the xml files do not match. Should have 1 xml to 1 xlsx'
    );
    console.error(`xls name ${xlsxName}`);
    console.error(`xml name ${xmlName}`);
    return true;
  }
  return false;
}

function validateModifiedTimesDoNotMatch(xmlPath, xlsxPath) {
  var xmlMtime = fs.statSync(xmlPath).mtime;
  var xlsxMtime = fs.statSync(xlsxPath).mtime;
  if (xmlMtime.setMilliseconds(0) !== xlsxMtime.setMilliseconds(0)) {
    console.error('One of the files was updated and needs to be in sync');
    console.error(`XML Path ${xmlPath}`);
    console.error(`Xls Path ${xlsxPath}`);
    console.error(`Xml Modified time ${xmlMtime.getTime()}`);
    console.error(`Xls Modified time ${xlsxMtime.getTime()}`);
    return true;
  }
  return false;
}

module.exports = validateForms;
