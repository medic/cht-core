function(doc, req) {
  var ddoc = this;
  var baseUrl = '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
  return {
    body: ddoc.inbox_template.replace(/<%= baseURL %>/g, baseUrl)
  };
}
