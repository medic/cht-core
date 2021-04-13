module.exports = function() {
  const requests = [];
  const responses = [];

  function reset() {
    if(responses.length !== 0) {
      throw new Error(`Unused responses (${responses.length})!`);
    }
  }

  function clearRequests(){
    while(this.requests.length > 0 ){
      this.requests.pop();
    }
  }

  function requestHandler(req, res) {
    requests.push(req);

    const response = responses.shift();

    if(!response) return error(req, res);

    res.status(response.status || 200);
    res.type(response.type || 'json');
    res.send(response.body || '');
  }

  function setResponses(...rr) {
    reset();
    rr.forEach(r => responses.push(r));
  }

  return { requests, clearRequests, requestHandler, reset, setResponses };
};

function error(req, res) {
  res.status(500);
  res.send(`Unexpected request: ${req.method} ${req.originalUrl} - no more API HTTP responses have been defined for this test.  If you forgot to add one, use \`apiStub.requests.push({ status, type, body })\``);
}
