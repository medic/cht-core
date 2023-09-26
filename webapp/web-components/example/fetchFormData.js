const fs = require('fs');
const path = require('path');

const COUCH_URL = process.env.COUCH_URL;
const COUCH_URL_PATTERN = /^(https?:\/\/)(.+):(.+)@(.+)\/medic$/g;
const [
  ,
  PROTOCOL,
  ADMIN_USER,
  ADMIN_PASS,
  HOST
] = COUCH_URL_PATTERN.exec(COUCH_URL);
const MEDIC_DB_URL = `${PROTOCOL}${HOST}/medic`;
const AUTH_HEADER = `Basic ${Buffer.from(ADMIN_USER + ':' + ADMIN_PASS, 'binary').toString('base64')}`;
const FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': AUTH_HEADER
};

const fetchOnDb = async (method, url, data) => {
  const response = await fetch(`${MEDIC_DB_URL}/${url}`, {
    method,
    headers: FETCH_HEADERS,
    body: data ? JSON.stringify(data) : null,
  });
  // return response.json();
  return response.text();
};

(async () => {
  const [formName] = process.argv.slice(2);
  console.log(`Fetching form data for ${formName}...`);
  const formXml = await fetchOnDb('GET', `${formName}/xml`);
  const formHtml = await fetchOnDb('GET', `${formName}/form.html`);
  const formModel = await fetchOnDb('GET', `${formName}/model.xml`);

  const formDataString =`
formData = {
  formHtml: \`${formHtml}\`,
  formModel: \`${formModel}\`,
  formXml: \`${formXml}\`,   
}`;

  const formNameParts = formName.split(':');
  const contactForm = formNameParts[1] === 'contact';
  const fileName = contactForm ? formNameParts.slice(2).join('_') : formNameParts[1];
  const filePath = path.join(__dirname, `${fileName}.js`);
  fs.writeFileSync(filePath, formDataString);
  console.log(`Wrote form data to ${filePath}`);
})();
