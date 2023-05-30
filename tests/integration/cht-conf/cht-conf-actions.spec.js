const { expect } = require('chai');

const { runCommand } = require('@utils/cht-conf');
const utils = require('@utils');

//Not all actions tested here due to missing forms and config
//[convert-collect-forms , upload-collect-form, upload-branding, upload-partners, upload-privacy-policies]
const actions = [
  'delete-all-forms',
  'compile-app-settings',
  'backup-app-settings',
  'convert-app-forms',
  'convert-contact-forms',
  'backup-all-forms',
  'upload-app-forms',
  'upload-contact-forms',
  'upload-resources',
  'upload-custom-translations',
  'upload-branding',
  'upload-partners'
];
const configPath = 'config/default';
let originalVersion;

describe('cht-conf actions tests', () => {
  before(async () => {
    const settings = await utils.getDoc('settings');
    originalVersion = Number(settings._rev.charAt(0));
    expect(settings.settings.roles).to.not.include.any.keys('program_officer', 'chw_supervisor', 'chw');
  });

  after(async () => await utils.revertSettings(true));

  it('should execute upload-app-settings', async () => {
    const result = await runCommand('upload-app-settings', configPath);
    expect(result).to.contain(`INFO Settings updated successfully`);
    const settings = await utils.getDoc('settings');
    console.log('newVersion', settings._rev);
    const newVersion = Number(settings._rev.charAt(0));
    expect(newVersion).to.be.greaterThanOrEqual(originalVersion);
    expect(settings.settings.roles).to.include.all.keys('program_officer', 'chw_supervisor', 'chw');
  });

  for (const action of actions) {
    it(`should execute ${action}`, async () => {
      const result = await runCommand(action, configPath);
      expect(result).to.contain(`INFO ${action} complete.`);
    });
  }

  it('should upload branding', async () => {
    const branding = await utils.getDoc('branding').catch(error => {
      if(error){
        console.log(error);
      }
    });
    expect(branding.title).to.equal('Medic');
  });

  it('should upload forms', async () => {
    const forms = await utils.request({
      path: '/api/v1/forms',
      method: 'GET'
    }).catch(error => {
      if(error){
        console.log(error);
      }
    });
    expect(forms).to.deep.equal([
      'contact:clinic:create.xml',
      'contact:clinic:edit.xml',
      'contact:district_hospital:create.xml',
      'contact:district_hospital:edit.xml',
      'contact:health_center:create.xml',
      'contact:health_center:edit.xml',
      'contact:person:create.xml',
      'contact:person:edit.xml',
      'death_report.xml',
      'delivery.xml',
      'pnc_danger_sign_follow_up_baby.xml',
      'pnc_danger_sign_follow_up_mother.xml',
      'pregnancy.xml',
      'pregnancy_danger_sign.xml',
      'pregnancy_danger_sign_follow_up.xml',
      'pregnancy_facility_visit_reminder.xml',
      'pregnancy_home_visit.xml',
      'replace_user.xml',
      'undo_death_report.xml'
    ]);
  });

  it('should upload resources', async () => {
    const resources = await utils.getDoc('resources').catch(error => {
      if(error){
        console.log(error);
      }
    });
    expect(resources.resources).to.deep.equal({
      'icon-area': 'icon-places-CHW-area@2x.png',
      'icon-branch': 'icon-places-clinic@2x.png',
      'icon-calendar': 'icon-calendar.png',
      'icon-child': 'icon-people-child@2x.png',
      'icon-children': 'icon-people-children@2x.png',
      'icon-clinic': 'icon-places-clinic@2x.png',
      'icon-death-general': 'icon-death-general.png',
      'icon-death-maternal': 'icon-death-maternal.png',
      'icon-death-neonatal': 'icon-death-neonatal.png',
      'icon-family': 'icon-people-family@2x.png',
      'icon-follow-up': 'icon-followup-general@2x.png',
      'icon-healthcare': 'Icon-healthcare-generic@2x.png',
      'icon-household': 'icon-people-family@2x.png',
      'icon-immunization': 'icon-healthcare-immunization@2x.png',
      'icon-infant': 'icon-people-baby@2x.png',
      'icon-mother-child': 'icon-people-woman-baby@2x.png',
      'icon-new-person': 'icon-people-person-general@2x.png',
      'icon-nurse': 'icon-people-nurse-crop@2x.png',
      'icon-off': 'icon-messages-off@2x.png',
      'icon-on': 'icon-messages-on@2x.png',
      'icon-person': 'icon-people-person-general@2x.png',
      'icon-pregnancy': 'icon-people-woman-pregnant@2x.png',
      'icon-pregnancy-danger': 'icon-ANC-danger-sign@2x.png',
      'icon-risk': 'icon-healthcare-warning@2x.png',
      'icon-treatment': 'icon-healthcare-medicine@2x.png',
      'medic-clinic': 'medic-family.svg',
      'medic-district-hospital': 'medic-health-center.svg',
      'medic-health-center': 'medic-chw-area.svg',
      'medic-person': 'medic-person.svg'
    });

    expect(resources._attachments).to.deep.equal({
      'Icon-healthcare-generic@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-x+vjoMsPBe8JcrcxM8qU6w==',
        length: 690,
        stub: true
      },
      'icon-ANC-danger-sign@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-B1hE//00k0/1ucAxX0dY+w==',
        length: 1168,
        stub: true
      },
      'icon-calendar.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-VeHPwrHAh540f9pH8aZcyg==',
        length: 1313,
        stub: true
      },
      'icon-death-general.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-44sZ9ttrLxPz2RlWCA3Dnw==',
        length: 411,
        stub: true
      },
      'icon-death-maternal.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-aW6f+dRG+NfXESUeTbSKkQ==',
        length: 638,
        stub: true
      },
      'icon-death-neonatal.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-ejce8OxOczRoKBWvXhuZmA==',
        length: 712,
        stub: true
      },
      'icon-followup-general@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-vH6PiFI89+HjrbnscXFCxA==',
        length: 1289,
        stub: true
      },
      'icon-healthcare-immunization@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-GT9Fuf1XNFyq5Ew5+QTSIA==',
        length: 889,
        stub: true
      },
      'icon-healthcare-medicine@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-MQshm84Jkdc+/9VlekIO/A==',
        length: 1073,
        stub: true
      },
      'icon-healthcare-warning@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-VUxpfDqkYkMNwIQjrKvkSg==',
        length: 870,
        stub: true
      },
      'icon-messages-off@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-IrxXsdKwTUIoHLttuJLt2w==',
        length: 1314,
        stub: true
      },
      'icon-messages-on@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-HYXvDWZgffEOpCJZKwGXSA==',
        length: 449,
        stub: true
      },
      'icon-people-baby@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-EY7c/5YMOevZEnSNNpSMOg==',
        length: 997,
        stub: true
      },
      'icon-people-child@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-oIKDpoiD1r3EgVM0Cz2Hfw==',
        length: 829,
        stub: true
      },
      'icon-people-children@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-1X2qRRh1fgFi9W7QF+f0+g==',
        length: 1215,
        stub: true
      },
      'icon-people-family@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-ib3By5zqFubosC90QRK5Qg==',
        length: 1393,
        stub: true
      },
      'icon-people-nurse-crop@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-+X46qt+78/4xG7HlCOmZFA==',
        length: 1105,
        stub: true
      },
      'icon-people-person-general@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-158qdmymTnrPCtECE4aGlQ==',
        length: 749,
        stub: true
      },
      'icon-people-woman-baby@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-4dGUiG8KGGTWvnF/WlNBIg==',
        length: 937,
        stub: true
      },
      'icon-people-woman-pregnant@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-TYwCWVE0rAuKmo+DETOVhg==',
        length: 878,
        stub: true
      },
      'icon-places-CHW-area@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-IhS7x0SpIlMYXdgweJCrNA==',
        length: 1224,
        stub: true
      },
      'icon-places-clinic@2x.png': {
        content_type: 'image/png',
        revpos: 3,
        digest: 'md5-9zkj2JJH1rgQEdjB+RwOGg==',
        length: 681,
        stub: true
      },
      'medic-chw-area.svg': {
        content_type: 'image/svg+xml',
        revpos: 3,
        digest: 'md5-70oHopHsHzRVOcClV5FYTw==',
        length: 1145,
        stub: true
      },
      'medic-family.svg': {
        content_type: 'image/svg+xml',
        revpos: 3,
        digest: 'md5-Q0gO1YOmJ4C7w6OCCVB3zw==',
        length: 1654,
        stub: true
      },
      'medic-health-center.svg': {
        content_type: 'image/svg+xml',
        revpos: 3,
        digest: 'md5-xtvZAXNBODZNz3AsX1+btg==',
        length: 357,
        stub: true
      },
      'medic-person.svg': {
        content_type: 'image/svg+xml',
        revpos: 3,
        digest: 'md5-8HoRGS0ihs2qwbg+N4Gmiw==',
        length: 435,
        stub: true
      }
    });
  });
});
