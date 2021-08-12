import jQuery from 'jquery';
import { expect } from 'chai';
import sinon from 'sinon';

import * as externalAppLauncher from '../../../../../src/js/enketo/widgets/external-app-launcher';

describe('External App Launcher Widget', () => {
  const $ = jQuery;
  let $html;
  let $widget;
  let originalWindowCHTCore;
  let externalAppLauncherService;

  beforeEach(() => {
    externalAppLauncherService = {
      launchExternalApp: sinon.stub(),
      isEnabled: sinon.stub().returns(true)
    };
    originalWindowCHTCore = window.CHTCore;
    window.CHTCore = {
      Translate: { get: sinon.stub().resolves('') },
      ExternalAppLauncher: externalAppLauncherService
    };

    $html = $(`
      <section id="test-form-group" class="or-group-data" name="/main">
        <section class="or-appearance-external-app-launcher or-group-data" name="/app"></section>
      </section>
    `);

    document.body.insertAdjacentHTML('afterbegin', $html[0]);
    $widget = $html.find(externalAppLauncher.selector);
    new externalAppLauncher.widget($widget[0], {});
  });

  afterEach(() => {
    window.CHTCore = originalWindowCHTCore;
    $('#test-form-group').remove();
  });

  describe('External App settings and inputs', () => {
    it('should launch app with all settings and no inputs', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves();

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/action" value="org.example.action.VIEW">
        </label>
        <label class="question">
          <input type="text" name="/main/app/category" value="a category">
        </label>
        <label class="question">
          <input type="text" name="/main/app/type" value="a type">
        </label>
        <label class="question">
          <input type="text" name="/main/app/uri"value="slack://user?team=medic&id=0">
        </label>
        <label class="question">
          <input type="text" name="/main/app/packageName" value="org.example">
        </label>
        <label class="question">
          <input type="text" name="/main/app/flags" value="5">
        </label>
      `;
      const inputs = `
        <section class="or-appearance-external-app-inputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name" value="Jack">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name" value="Doors">
          </label>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
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

    it('should send deep objects to the external app', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves();

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/type" value="a type">
        </label>
        <label class="question">
          <input type="text" name="/main/app/uri"value="slack://user?team=medic&id=0">
        </label>
        <label class="question">
          <input type="text" name="/main/app/flags" value="5">
        </label>
      `;
      const inputs = `
        <section class="or-appearance-external-app-inputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name" value="Jack">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name" value="Doors">
          </label>
          <section class="or-appearance-external-app-object or-group" name="/main/app/inputs/address">
            <label class="question">
              <input type="text" name="/main/app/inputs/address/city" value="Seattle">
            </label>
            <label class="question">
              <input type="text" name="/main/app/inputs/address/country" value="USA">
            </label>
            <section class="or-appearance-external-app-object or-group" name="/main/app/inputs/address/house_info">
              <label class="question">
                <input type="text" name="/main/app/inputs/address/description" value="The house is a pineapple">
              </label>
              <label class="question">
                <input type="text" name="/main/app/inputs/address/house_number" value="5">
              </label>
            </section>
          </section>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
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

    it('should send array of values to the external app', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves();

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/action" value="org.example.action.VIEW">
        </label>
        <label class="question">
          <input type="text" name="/main/app/category" value="a category">
        </label>
      `;
      const inputs = `
        <section class="or-appearance-external-app-inputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name" value="Jack">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name" value="Doors">
          </label>
          <section class="or-group" name="/main/app/inputs/repeat">
            <section class="or-appearance-external-app-value-list or-group" name="/main/app/inputs/repeat/my_colors">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/my_colors/color" value="blue">
              </label>
            </section>
            <section class="or-appearance-external-app-value-list or-group" name="/main/app/inputs/repeat/my_colors">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/my_colors/color" value="red">
              </label>
            </section>
            <section class="or-appearance-external-app-value-list or-group" name="/main/app/inputs/repeat/my_colors">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/my_colors/color" value="green">
              </label>
            </section>
          </section>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW',
        category: 'a category',
        extras: {
          first_name: 'Jack',
          last_name: 'Doors',
          my_colors: ['blue', 'red', 'green']
        }
      }]);
    });

    it('should send array of objects to the external app', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves();

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/action" value="org.example.action.VIEW">
        </label>
        <label class="question">
          <input type="text" name="/main/app/category" value="a category">
        </label>
      `;
      const inputs = `
        <section class="or-appearance-external-app-inputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name" value="Jack">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name" value="Doors">
          </label>
          <section class="or-group" name="/main/app/inputs/repeat">
            <section class="or-appearance-external-app-object-list or-group" name="/main/app/inputs/repeat/addresses">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/city" value="Hokkaido">
              </label>
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/country" value="Japan">
              </label>
              <section 
                class="or-appearance-external-app-object or-group" 
                name="/main/app/inputs/repeat/addresses/house_info">
                <label class="question">
                  <input 
                    type="text" 
                    name="/main/app/inputs/repeat/addresses/house_info/description" 
                    value="House is a shell">
                </label>
                <label class="question">
                  <input type="text" name="/main/app/inputs/repeat/addresses/house_info/house_number" value="15">
                </label>
              </section>
            </section>
            <section class="or-appearance-external-app-object-list or-group" name="/main/app/inputs/repeat/addresses">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/city" value="Seattle">
              </label>
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/country" value="USA">
              </label>
              <section 
                class="or-appearance-external-app-object or-group" 
                name="/main/app/inputs/repeat/addresses/house_info">
                <label class="question">
                  <input 
                    type="text" 
                    name="/main/app/inputs/repeat/addresses/house_info/description" 
                    value="House is a pineapple">
                </label>
                <label class="question">
                  <input type="text" name="/main/app/inputs/repeat/addresses/house_info/house_number" value="5">
                </label>
              </section>
            </section>
          </section>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(inputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
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

  describe('External App outputs', () => {
    it('should set flat outputs', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves({
        first_name: 'Jack',
        last_name: 'Doors'
      });

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/action" value="org.example.action.VIEW">
        </label>
      `;
      const outputs = `
        <section class="or-appearance-external-app-outputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name">
          </label>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);

      expect($widget.find('input[name="/main/app/inputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/inputs/last_name"]').val()).to.equal('Doors');
    });

    it('should set outputs with deep objects', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves({
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

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/action" value="org.example.action.VIEW">
        </label>
      `;
      const outputs = `
        <section class="or-appearance-external-app-outputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name">
          </label>
          <section class="or-appearance-external-app-object or-group" name="/main/app/inputs/address">
            <label class="question">
              <input type="text" name="/main/app/inputs/address/city">
            </label>
            <label class="question">
              <input type="text" name="/main/app/inputs/address/country">
            </label>
            <section class="or-appearance-external-app-object or-group" name="/main/app/inputs/address/house_info">
              <label class="question">
                <input type="text" name="/main/app/inputs/address/description">
              </label>
              <label class="question">
                <input type="text" name="/main/app/inputs/address/house_number">
              </label>
            </section>
          </section>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);

      expect($widget.find('input[name="/main/app/inputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/inputs/last_name"]').val()).to.equal('Doors');
      expect($widget.find('input[name="/main/app/inputs/address/city"]').val()).to.equal('Seattle');
      expect($widget.find('input[name="/main/app/inputs/address/country"]').val()).to.equal('USA');
      expect($widget.find('input[name="/main/app/inputs/address/description"]').val())
        .to.equal('The house is a pineapple');
      expect($widget.find('input[name="/main/app/inputs/address/house_number"]').val()).to.equal('5');
    });

    it('should set outputs with array of values', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves({
        first_name: 'Jack',
        last_name: 'Doors',
        my_colors: ['blue', 'red', 'green']
      });

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/action" value="org.example.action.VIEW">
        </label>
      `;
      const outputs = `
        <section class="or-appearance-external-app-outputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name">
          </label>
          <section class="or-group" name="/main/app/inputs/repeat">
            <section 
              class="or-appearance-external-app-value-list or-group repeat-1" 
              name="/main/app/inputs/repeat/my_colors">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/my_colors/color">
              </label>
            </section>
            <section 
              class="or-appearance-external-app-value-list or-group repeat-2" 
              name="/main/app/inputs/repeat/my_colors">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/my_colors/color">
              </label>
            </section>
            <section 
              class="or-appearance-external-app-value-list or-group repeat-3" 
              name="/main/app/inputs/repeat/my_colors">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/my_colors/color">
              </label>
            </section>
          </section>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);
      expect($widget.find('input[name="/main/app/inputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/inputs/last_name"]').val()).to.equal('Doors');
      expect($widget.find('.repeat-1 input[name="/main/app/inputs/repeat/my_colors/color"]').val())
        .to.equal('blue');
      expect($widget.find('.repeat-2 input[name="/main/app/inputs/repeat/my_colors/color"]').val())
        .to.equal('red');
      expect($widget.find('.repeat-3 input[name="/main/app/inputs/repeat/my_colors/color"]').val())
        .to.equal('green');
    });

    it('should set outputs with array of objects', async () => {
      const $launchAppBtn = $html.find('.external-app-launcher-actions .launch-app');
      window.CHTCore.ExternalAppLauncher.launchExternalApp.resolves({
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

      const appSettings = `
        <label class="question">
          <input type="text" name="/main/app/action" value="org.example.action.VIEW">
        </label>
      `;
      const outputs = `
        <section class="or-appearance-external-app-outputs or-group-data" name="/main/app/inputs">
          <label class="question">
            <input type="text" name="/main/app/inputs/first_name">
          </label>
          <label class="question">
            <input type="text" name="/main/app/inputs/last_name">
          </label>
          <section class="or-group" name="/main/app/inputs/repeat">
            <section 
              class="or-appearance-external-app-object-list or-group repeat-1" 
              name="/main/app/inputs/repeat/addresses">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/city">
              </label>
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/country">
              </label>
              <section 
                class="or-appearance-external-app-object or-group" 
                name="/main/app/inputs/repeat/addresses/house_info">
                <label class="question">
                  <input type="text" name="/main/app/inputs/repeat/addresses/house_info/description">
                </label>
                <label class="question">
                  <input type="text" name="/main/app/inputs/repeat/addresses/house_info/house_number">
                </label>
              </section>
            </section>
            <section 
            class="or-appearance-external-app-object-list or-group repeat-2" 
            name="/main/app/inputs/repeat/addresses">
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/city">
              </label>
              <label class="question">
                <input type="text" name="/main/app/inputs/repeat/addresses/country">
              </label>
              <section class="or-appearance-external-app-object or-group" name="/main/app/inputs/address/house_info">
                <label class="question">
                  <input type="text" name="/main/app/inputs/repeat/addresses/house_info/description">
                </label>
                <label class="question">
                  <input type="text" name="/main/app/inputs/repeat/addresses/house_info/house_number">
                </label>
              </section>
            </section>
          </section>
        </section>
      `;

      $widget
        .append(appSettings)
        .append(outputs);

      $launchAppBtn.click();
      await Promise.resolve();

      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.callCount).to.equal(1);
      expect(window.CHTCore.ExternalAppLauncher.launchExternalApp.args[0]).to.have.deep.members([{
        action: 'org.example.action.VIEW'
      }]);
      expect($widget.find('input[name="/main/app/inputs/first_name"]').val()).to.equal('Jack');
      expect($widget.find('input[name="/main/app/inputs/last_name"]').val()).to.equal('Doors');
      expect($widget.find('.repeat-1 input[name="/main/app/inputs/repeat/addresses/city"]').val())
        .to.equal('Hokkaido');
      expect($widget.find('.repeat-1 input[name="/main/app/inputs/repeat/addresses/country"]').val())
        .to.equal('Japan');
      expect($widget.find('.repeat-1 input[name="/main/app/inputs/repeat/addresses/house_info/description"]').val())
        .to.equal('House is a shell');
      expect($widget.find('.repeat-1 input[name="/main/app/inputs/repeat/addresses/house_info/house_number"]').val())
        .to.equal('15');
      expect($widget.find('.repeat-2 input[name="/main/app/inputs/repeat/addresses/city"]').val())
        .to.equal('Seattle');
      expect($widget.find('.repeat-2 input[name="/main/app/inputs/repeat/addresses/country"]').val())
        .to.equal('USA');
      expect($widget.find('.repeat-2 input[name="/main/app/inputs/repeat/addresses/house_info/description"]').val())
        .to.equal('House is a pineapple');
      expect($widget.find('.repeat-2 input[name="/main/app/inputs/repeat/addresses/house_info/house_number"]').val())
        .to.equal('5');
    });
  });
});
