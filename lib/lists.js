exports.reminders = function(head, req) {
  var html = '',
      label,
      key,
      row;

  function startWeek() {
    if (label !== undefined) {
      html += "</tbody>";
    }
    html += "<tbody><th colspan=\"2\">Reminders for week " + key[0] + "/" + key[1] + "</th>";
  }
  html += "<table class=\"table\">";
  while (row = getRow()) {
    key = row.key;
    if (label !== '' + key[0] + key[1]) {
      startWeek();
      label = '' + key[0] + key[1];
    }
    html += "<tr><td class=\"span2\"><span class=\"label\">" + key[2] +"</span></td><td>" + row.value + "</td></tr>";
  }
  html += "</table>";
  return {
    code: 200,
    content: html,
    headers: {
      'Content-Type': 'text/html'
    }
  };
};
