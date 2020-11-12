const prevResults = __dirname + '/previous_results/';
const csv = require('csv-parser')
const fs = require('fs');
let rows = [];
fs.readdir(prevResults, (err, files) => {
  if (err) throw err;
  files.forEach(file => {
   readCSV(prevResults + file)
  });
});


function readCSV(pathToFile){
  fs.createReadStream(pathToFile)
  .pipe(csv())
  .on('data', function (row) {
    let split = pathToFile.split('/');
    row.label = split[split.length - 1].replace('.jtl', '');
    rows.push(row);
  })
  .on('end', function () {
    writeCSV(__dirname + '/merged-results.csv', rows);
  })
}

function writeCSV(pathToWrite, content){
  fs.writeFile(pathToWrite, extractAsCSV(content), err => {
    if (err) {
      console.log('Error writing to csv file', err);
    } 
  });

}

function extractAsCSV(content) {
  const header = [Object.keys(content[0]).join(',')];
  content.sort((a, b) => (a.label > b.label) ? 1 : -1)
  const rows = content.map(row =>
     Object.values(row)
  );
  return header.concat(rows).join("\n");
}