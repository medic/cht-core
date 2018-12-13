const http = require('http'),
      ddocIdRegex = /"_id":"medic:medic:test-[0-9]*","_rev":"[^"]*"/;
      {
        UPLOAD_URL,
        TRAVIS_BUILD_NUMBER,
        TRAVIS_TAG,
        TRAVIS_BRANCH
      } = process.env,
      releaseName = TRAVIS_TAG || TRAVIS_BRANCH;

if (!releaseName) {
  console.log('Not a tag or a branch so not publishing');
  process.exit(0);
}

const getUrl = `${UPLOAD_URL}/_couch/builds_testing/medic:medic:test-${TRAVIS_BUILD_NUMBER}?attachments=true`;
const postUrl = `${UPLOAD_URL}/_couch/builds/medic:medic:${releaseName}`;

const handleError = message => {
  console.error(`problem with request: ${message}`);
  process.exit(1);
};

const resetId = ddoc => ddoc.replace(ddocIdRegex, `"_id":"medic:medic:${releaseName}"`);

const upload = (ddoc, contentType) => {
  const options = { headers: { 'content-type': contentType } };
  const req = http.post(postUrl, options, res => {
    if (res.statusCode !== 200) {
      return handleError(`post response status code ${res.statusCode}`);
    }
    console.log(`${releaseName} published!`);
    process.exit(0);
  });
  req.on('error', e => handleError(e.message));
  req.write(newDdoc);
  req.end();
};

const req = http.get(getUrl, res => {
  if (res.statusCode !== 200) {
    return handleError(`get response status code ${res.statusCode}`);
  }
  const contentType = res.headers['content-type'];
  let ddoc = '';
  res.on('data', chunk => {
    ddoc += chunk;
  });
  res.on('end', () => {
    const newDdoc = resetId(ddoc);
    upload(newDdoc, contentType);
  });
});
req.on('error', e => handleError(e.message));
