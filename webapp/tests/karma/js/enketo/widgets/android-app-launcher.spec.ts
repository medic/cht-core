import jQuery from 'jquery';
import { expect } from 'chai';
import sinon from 'sinon';

import * as Androidapplauncher from '../../../../../src/js/enketo/widgets/android-app-launcher';

describe('Android App Launcher Widget', () => {
  const $ = jQuery;
  let $html;
  let $widget;
  let originalWindowCHTCore;
  let androidAppLauncherService;

  const createGroup = (appearance, name, fields?) => {
    const $group = $(`<section class="${appearance} or-group-data" name="${name}"></section>`);
    return fields ? $group.append(createFields(fields)) : $group;
  };

  const createFields = (fields) => {
    let html = '';

    Object
      .keys(fields)
      .forEach(name => {
        html += `<label class="question">
          <input type="text" name="${name}" value="${fields[name]}">
        </label>`;
      });

    return html;
  };

  beforeEach(() => {
    androidAppLauncherService = {
      launchAndroidApp: sinon.stub(),
      isEnabled: sinon.stub().returns(true)
    };
    originalWindowCHTCore = window.CHTCore;
    window.CHTCore = {
      Translate: { get: sinon.stub().resolves('') },
      AndroidAppLauncher: androidAppLauncherService
    };

    $html = $(`
      <label id="android-app-launcher-test" class="question">\
        <section id="test-form-group" class="or-group-data" name="/main">
          <section class="or-appearance-android-app-launcher or-group-data" name="/app"></section>
        </section>
      </label>
    `);

    document.body.insertAdjacentHTML('afterbegin', $html[0]);
    $widget = $html.find(Androidapplauncher.selector);
    new Androidapplauncher($widget[0], {});
  });

  afterEach(() => {
    window.CHTCore = originalWindowCHTCore;
    $('#test-form-group').remove();
  });

  describe('Android App settings and inputs', () => {
    it('should launch app with all settings and no inputs', async () => {
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves();
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');

      const appSettings = createFields({
        '/main/app/action': 'org.example.action.VIEW',
        '/main/app/category': 'a category',
        '/main/app/type': 'a type',
        '/main/app/uri': 'slack://user?team=medic&id=0',
        '/main/app/packageName': 'org.example',
        '/main/app/flags': '5'
      });
      const $inputs = createGroup(
        'or-appearance-android-app-inputs',
        '/main/app/inputs',
        {
          '/main/app/inputs/first_name': 'Jack',
          '/main/app/inputs/last_name': 'Doors'
        }
      );

      $widget
        .append(appSettings)
        .append($inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW',
        category: 'a category',
        type: 'a type',
        uri: 'slack://user?team=medic&id=0',
        packageName: 'org.example',
        flags: '5',
        extras: {
          first_name: 'Jack',
          last_name: 'Doors'
        }
      }]);
    });

    it('should send deep objects to the android app', async () => {
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves();

      const appSettings = createFields({
        '/main/app/type': 'a type',
        '/main/app/uri': 'slack://user?team=medic&id=0',
        '/main/app/flags': '5'
      });
      const $inputs = createGroup(
        'or-appearance-android-app-inputs',
        '/main/app/inputs',
        {
          '/main/app/inputs/first_name': 'Jack',
          '/main/app/inputs/last_name': 'Doors'
        }
      );
      const $addressGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/inputs/address',
        {
          '/main/app/inputs/address/city': 'Seattle',
          '/main/app/inputs/address/country': 'USA'
        }
      );
      const $houseGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/inputs/address/house_info',
        {
          '/main/app/inputs/address/description': 'The house is a pineapple',
          '/main/app/inputs/address/house_number': '5'
        }
      );

      $addressGroup.append($houseGroup);
      $inputs.append($addressGroup);
      $widget
        .append(appSettings)
        .append($inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        type: 'a type',
        uri: 'slack://user?team=medic&id=0',
        flags: '5',
        extras: {
          first_name: 'Jack',
          last_name: 'Doors',
          address: {
            country: 'USA',
            city: 'Seattle',
            house_info: {
              description: 'The house is a pineapple',
              house_number: '5'
            }
          }
        }
      }]);
    });

    it('should send array of values to the android app', async () => {
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves();

      const appSettings = createFields({
        '/main/app/action': 'org.example.action.VIEW',
        '/main/app/category': 'a category'
      });
      const $inputs = createGroup(
        'or-appearance-android-app-inputs',
        '/main/app/inputs',
        {
          '/main/app/inputs/first_name': 'Jack',
          '/main/app/inputs/last_name': 'Doors'
        }
      );
      const $repeatGroup = createGroup('', '/main/app/inputs/repeat');
      const $blueGroup = createGroup(
        'or-appearance-android-app-value-list',
        '/main/app/inputs/repeat/my_colors',
        {
          '/main/app/inputs/repeat/my_colors/color': 'blue'
        }
      );
      const $redGroup = createGroup(
        'or-appearance-android-app-value-list',
        '/main/app/inputs/repeat/my_colors',
        {
          '/main/app/inputs/repeat/my_colors/color': 'red'
        }
      );
      const $greenGroup = createGroup(
        'or-appearance-android-app-value-list',
        '/main/app/inputs/repeat/my_colors',
        {
          '/main/app/inputs/repeat/my_colors/color': 'green'
        }
      );

      $repeatGroup
        .append($blueGroup)
        .append($redGroup)
        .append($greenGroup);
      $inputs.append($repeatGroup);
      $widget
        .append(appSettings)
        .append($inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW',
        category: 'a category',
        extras: {
          first_name: 'Jack',
          last_name: 'Doors',
          my_colors: ['blue', 'red', 'green']
        }
      }]);
    });

    it('should send array of objects to the android app', async () => {
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves();

      const appSettings = createFields({
        '/main/app/action': 'org.example.action.VIEW',
        '/main/app/category': 'a category'
      });
      const $inputs = createGroup(
        'or-appearance-android-app-inputs',
        '/main/app/inputs',
        {
          '/main/app/inputs/first_name': 'Jack',
          '/main/app/inputs/last_name': 'Doors'
        }
      );
      const $repeatGroup = createGroup('', '/main/app/inputs/repeat');
      const $usaAddressGroup = createGroup(
        'or-appearance-android-app-object-list',
        '/main/app/inputs/repeat/addresses',
        {
          '/main/app/inputs/repeat/address/city': 'Seattle',
          '/main/app/inputs/repeat/address/country': 'USA'
        }
      );
      const $usaHouseGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/inputs/repeat/address/house_info',
        {
          '/main/app/inputs/repeat/address/house_info/description': 'House is a pineapple',
          '/main/app/inputs/repeat/address/house_info/house_number': '5'
        }
      );
      const $japanAddressGroup = createGroup(
        'or-appearance-android-app-object-list',
        '/main/app/inputs/repeat/addresses',
        {
          '/main/app/inputs/repeat/address/city': 'Hokkaido',
          '/main/app/inputs/repeat/address/country': 'Japan'
        }
      );
      const $japanHouseGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/inputs/repeat/address/house_info',
        {
          '/main/app/inputs/repeat/address/house_info/description': 'House is a shell',
          '/main/app/inputs/repeat/address/house_info/house_number': '15'
        }
      );

      $japanAddressGroup.append($japanHouseGroup);
      $usaAddressGroup.append($usaHouseGroup);
      $repeatGroup
        .append($japanAddressGroup)
        .append($usaAddressGroup);
      $inputs.append($repeatGroup);
      $widget
        .append(appSettings)
        .append($inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW',
        category: 'a category',
        extras: {
          first_name: 'Jack',
          last_name: 'Doors',
          addresses: [
            {
              country: 'Japan',
              city: 'Hokkaido',
              house_info: {
                description: 'House is a shell',
                house_number: '15'
              }
            },
            {
              country: 'USA',
              city: 'Seattle',
              house_info: {
                description: 'House is a pineapple',
                house_number: '5'
              }
            }
          ]
        }
      }]);
    });
  });

  describe('Android App outputs', () => {
    it('should set flat outputs', async () => {
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves({
        first_name: 'Jack',
        last_name: 'Doors'
      });

      const appSettings = createFields({
        '/main/app/action': 'org.example.action.VIEW'
      });
      const $outputs = createGroup(
        'or-appearance-android-app-outputs',
        '/main/app/outputs',
        {
          '/main/app/outputs/first_name': '',
          '/main/app/outputs/last_name': ''
        }
      );

      $widget
        .append(appSettings)
        .append($outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);

      expect($widget.find('input[name="/main/app/outputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/outputs/last_name"]').val()).to.equal('Doors');
    });

    it('should set outputs with deep objects', async () => {
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves({
        first_name: 'Jack',
        last_name: 'Doors',
        address: {
          country: 'USA',
          city: 'Seattle',
          house_info: {
            description: 'The house is a pineapple',
            house_number: '5'
          }
        }
      });

      const appSettings = createFields({
        '/main/app/action': 'org.example.action.VIEW'
      });
      const $outputs = createGroup(
        'or-appearance-android-app-outputs',
        '/main/app/outputs',
        {
          '/main/app/outputs/first_name': '',
          '/main/app/outputs/last_name': ''
        }
      );
      const $addressGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/outputs/address',
        {
          '/main/app/outputs/address/city': '',
          '/main/app/outputs/address/country': ''
        }
      );
      const $houseGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/outputs/address/house_info',
        {
          '/main/app/outputs/address/description': '',
          '/main/app/outputs/address/house_number': ''
        }
      );

      $addressGroup.append($houseGroup);
      $outputs.append($addressGroup);
      $widget
        .append(appSettings)
        .append($outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);

      expect($widget.find('input[name="/main/app/outputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/outputs/last_name"]').val()).to.equal('Doors');
      expect($widget.find('input[name="/main/app/outputs/address/city"]').val()).to.equal('Seattle');
      expect($widget.find('input[name="/main/app/outputs/address/country"]').val()).to.equal('USA');
      expect($widget.find('input[name="/main/app/outputs/address/description"]').val())
        .to.equal('The house is a pineapple');
      expect($widget.find('input[name="/main/app/outputs/address/house_number"]').val()).to.equal('5');
    });

    it('should set outputs with array of values', async () => {
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves({
        first_name: 'Jack',
        last_name: 'Doors',
        my_colors: ['blue', 'red', 'green']
      });

      const appSettings = createFields({
        '/main/app/action': 'org.example.action.VIEW'
      });
      const $outputs = createGroup(
        'or-appearance-android-app-outputs',
        '/main/app/outputs',
        {
          '/main/app/outputs/first_name': '',
          '/main/app/outputs/last_name': ''
        }
      );
      const $repeatGroup = createGroup('', '/main/app/outputs/repeat');
      const $blueGroup = createGroup(
        'repeat-1 or-appearance-android-app-value-list',
        '/main/app/outputs/repeat/my_colors',
        {
          '/main/app/outputs/repeat/my_colors/color': ''
        }
      );
      const $redGroup = createGroup(
        'repeat-2 or-appearance-android-app-value-list',
        '/main/app/outputs/repeat/my_colors',
        {
          '/main/app/outputs/repeat/my_colors/color': ''
        }
      );
      const $greenGroup = createGroup(
        'repeat-3 or-appearance-android-app-value-list',
        '/main/app/outputs/repeat/my_colors',
        {
          '/main/app/outputs/repeat/my_colors/color': ''
        }
      );

      $repeatGroup
        .append($blueGroup)
        .append($redGroup)
        .append($greenGroup);
      $outputs.append($repeatGroup);
      $widget
        .append(appSettings)
        .append($outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);
      expect($widget.find('input[name="/main/app/outputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/outputs/last_name"]').val()).to.equal('Doors');
      expect($widget.find('.repeat-1 input[name="/main/app/outputs/repeat/my_colors/color"]').val())
        .to.equal('blue');
      expect($widget.find('.repeat-2 input[name="/main/app/outputs/repeat/my_colors/color"]').val())
        .to.equal('red');
      expect($widget.find('.repeat-3 input[name="/main/app/outputs/repeat/my_colors/color"]').val())
        .to.equal('green');
    });

    it('should set outputs with array of objects', async () => {
      const $launchAppBtn = $html.find('.android-app-launcher-actions .launch-app');
      window.CHTCore.AndroidAppLauncher.launchAndroidApp.resolves({
        first_name: 'Jack',
        last_name: 'Doors',
        addresses: [
          {
            country: 'Japan',
            city: 'Hokkaido',
            house_info: {
              description: 'House is a shell',
              house_number: '15'
            }
          },
          {
            country: 'USA',
            city: 'Seattle',
            house_info: {
              description: 'House is a pineapple',
              house_number: '5'
            }
          }
        ]
      });

      const appSettings = createFields({
        '/main/app/action': 'org.example.action.VIEW'
      });
      const $outputs = createGroup(
        'or-appearance-android-app-outputs',
        '/main/app/outputs',
        {
          '/main/app/outputs/first_name': '',
          '/main/app/outputs/last_name': ''
        }
      );
      const $repeatGroup = createGroup('', '/main/app/outputs/repeat');
      const $usaAddressGroup = createGroup(
        'repeat-2 or-appearance-android-app-object-list',
        '/main/app/outputs/repeat/addresses',
        {
          '/main/app/outputs/repeat/address/city': '',
          '/main/app/outputs/repeat/address/country': ''
        }
      );
      const $usaHouseGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/outputs/repeat/address/house_info',
        {
          '/main/app/outputs/repeat/address/house_info/description': '',
          '/main/app/outputs/repeat/address/house_info/house_number': ''
        }
      );
      const $japanAddressGroup = createGroup(
        'repeat-1 or-appearance-android-app-object-list',
        '/main/app/outputs/repeat/addresses',
        {
          '/main/app/outputs/repeat/address/city': '',
          '/main/app/outputs/repeat/address/country': ''
        }
      );
      const $japanHouseGroup = createGroup(
        'or-appearance-android-app-object',
        '/main/app/outputs/repeat/address/house_info',
        {
          '/main/app/outputs/repeat/address/house_info/description': '',
          '/main/app/outputs/repeat/address/house_info/house_number': ''
        }
      );

      $japanAddressGroup.append($japanHouseGroup);
      $usaAddressGroup.append($usaHouseGroup);
      $repeatGroup
        .append($japanAddressGroup)
        .append($usaAddressGroup);
      $outputs.append($repeatGroup);
      $widget
        .append(appSettings)
        .append($outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.callCount).to.equal(1);
      expect(window.CHTCore.AndroidAppLauncher.launchAndroidApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);
      expect($widget.find('input[name="/main/app/outputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/outputs/last_name"]').val()).to.equal('Doors');
      expect($widget.find('.repeat-1 input[name="/main/app/outputs/repeat/address/city"]').val())
        .to.equal('Hokkaido');
      expect($widget.find('.repeat-1 input[name="/main/app/outputs/repeat/address/country"]').val())
        .to.equal('Japan');
      expect($widget.find('.repeat-1 input[name="/main/app/outputs/repeat/address/house_info/description"]').val())
        .to.equal('House is a shell');
      expect($widget.find('.repeat-1 input[name="/main/app/outputs/repeat/address/house_info/house_number"]').val())
        .to.equal('15');
      expect($widget.find('.repeat-2 input[name="/main/app/outputs/repeat/address/city"]').val())
        .to.equal('Seattle');
      expect($widget.find('.repeat-2 input[name="/main/app/outputs/repeat/address/country"]').val())
        .to.equal('USA');
      expect($widget.find('.repeat-2 input[name="/main/app/outputs/repeat/address/house_info/description"]').val())
        .to.equal('House is a pineapple');
      expect($widget.find('.repeat-2 input[name="/main/app/outputs/repeat/address/house_info/house_number"]').val())
        .to.equal('5');
    });
  });
});
