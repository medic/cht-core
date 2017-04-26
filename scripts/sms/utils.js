function log(...args) {
  args.unshift('LOG');
  console.log.apply(console, args);
};

function sanitiseUrl(url) {
  return url.substring(0, url.indexOf('://') + 3) +
      url.substring(url.indexOf('@') + 1);
}

function snip(s, w) {
  return s.length <= w ? s : s.substring(0, w-1) + '…';
}

function rightPad(s, w) {
  if(!s) s = '';
  else s = s.toString();
  while(s.length < w) s += ' ';
  return s;
}

function leftPad(s, w) {
  if(!s) s = '';
  else s = s.toString();
  while(s.length < w) s = ' ' + s;
  return s;
}

function printTableRow(...columns) {
  let i, row = '';
  for(i=0; i<columns.length; i+=2) {
    if(i) row += ' | ';
    const colWidth = columns[i+1];
    let val = columns[i];
    val = !colWidth ? val : colWidth>0 ?
        rightPad(val, colWidth):
        leftPad(val, -colWidth);
    row += colWidth ? snip(val, Math.abs(colWidth)) : val;
  }
  console.log(row);
}

module.exports = {
  log: log,
  sanitiseUrl: sanitiseUrl,
  snip: snip,
  rightPad: rightPad,
  leftPad: leftPad,
  printTableRow: printTableRow,
};
