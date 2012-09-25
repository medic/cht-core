exports.reminders = function(head, req) {
  var html = '',
      label,
      key,
      row;

  start({
    code: 200,
    headers: {
      'Content-Type': 'text/html'
    }
  });
  function startWeek() {
    if (label !== undefined) {
      html += "</tbody>";
    }
    html += "<tbody><th colspan=\"3\">Reminders for week " + key[0] + "/" + key[1] + "</th>";
  }
  html += "<table class=\"table\">";
  while (row = getRow()) {
    key = row.key;
    if (label !== '' + key[0] + key[1]) {
      startWeek();
      label = '' + key[0] + key[1];
    }
    html += "<tr><td class=\"span2\"><span class=\"label\">" + key[3]
         +"</span></td><td>" + key[2] + "</td><td>" + row.value + "</td></tr>";
  }
  html += "</table>";

  return { content: html };

};
