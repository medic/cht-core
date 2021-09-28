const Factory = require('rosie').Factory;
const privacyPolicyHtml = ({ header, paragraph }) => {
  return `
<div>
  <h1>${header}</h1>
  <p>${paragraph}</p>
</div>
`;
};

const english = { header: 'English Privacy Policy', paragraph: 'More markup', language: 'English' };
const french = { header: 'Politique de confidentialité en Francais', paragraph: 'Plus de markup', language: 'French' };
const privacyPolicyInFrench = privacyPolicyHtml(french);
const privacyPolicyInEnglish = privacyPolicyHtml(english);



const privacyPolicy = () => {
  return new Factory()
    .attr('_id', 'privacy-policies')
    .attr('privacy_policies', { en: 'en.attachment', fr: 'fr.html', })
    .attr('_attachments', {
      'en.attachment': {
        content_type: 'text/html',
        data: Buffer.from(privacyPolicyInEnglish).toString('base64'),
        digest: 'en_digest'
      },
      'fr.html': {
        content_type: 'text/html',
        data: Buffer.from(privacyPolicyInFrench).toString('base64'),
        digest: 'fr_digest'
      }
    });
};

module.exports = {
  privacyPolicy,
  english,
  french
};
