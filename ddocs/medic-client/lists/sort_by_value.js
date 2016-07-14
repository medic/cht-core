function(head, req) {
  var json = { rows:[], total_rows:0, offset:0 },
      entries = [],
      start = parseInt(req.query.s, 10),
      limit = parseInt(req.query.lim, 10),
      desc = typeof req.query.desc === 'undefined' ? false : req.query.desc === 'true',
      row;

  while(row = getRow()) entries.push(row);

  entries.sort(function(a, b) {
    return a.value == b.value ? 0 : a.value > b.value ? 1 : -1;
  });

  if(desc) entries.reverse();

  if(limit) {
    start = start || 0;
    json.rows = entries.slice(start, start + limit);
  } else if(start) {
    json.rows = entries.slice(start);
  } else {
    json.rows = entries;
  }

  json.total_rows = json.rows.length;
  send(JSON.stringify(json, null, 2));
}
