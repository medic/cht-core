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

const attachments = [
  {
    key: 'en.attachment',
    text: privacyPolicyInEnglish
  },
  {
    key: 'fr.html',
    text: privacyPolicyInFrench
  }
];

const privacyPolicy = () => {
  return new Factory()
    .attr('_id', 'privacy-policies')
    .attr('privacy_policies', { en: 'en.attachment', fr: 'fr.html', })
    .option('attachments', attachments)
    .attr('_attachments', ['attachments'], (attachments) => {
      const builtAttachments = {};
      attachments.forEach((attachment) =>
        builtAttachments[attachment.key] = {
          content_type: 'text/html',
          data: Buffer.from(attachment.text).toString('base64'),
        });
      return builtAttachments;
    });
};

module.exports = {
  privacyPolicy,
  english,
  french,
  privacyPolicyHtml
};