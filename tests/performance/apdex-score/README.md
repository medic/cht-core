# Apdex Performance Tests

## Setup

1. Enable the developer mode in your phone and enable the USB Debugger mode.
   - ensure your device does not have a lock screen pin/passcode
2. Connect your phone to the computer using the appropriate device cable or you can follow [these steps](https://developer.android.com/studio/run/device#wireless) to connect your device using Wi-Fi. 
   - run `adb devices` command to see your connected device listed as one of the devices attached
3. Create a settings file or reuse one of the [sample settings](tests/performance/apdex-score/sample-settings-files) files

<details> <summary>Expand to see settings file structure </summary>

```
{
  "iterations": 1,
  "instanceURL": "<instance url>",
  "hasPrivacyPolicy": false,
  "capabilities": [
    {
      "platformVersion": "<android version>",
      "deviceName": "<phone model>",
      "appPath": "<path to cht android apk>",
      "noReset": false
    }
  ],

  "skip": {
    "login": false,

    "loadContactList": false,
    "loadChwArea": false,
    "loadHousehold": false,
    "loadPatient": false,
    "loadMessageList": false,
    "loadTaskList": false,
    "loadAnalytics": false,
    "loadReportList": false,
    "searchContact": false,
    "searchReport": false,
    "submitTask": true,
    "createPatient": true,
    "submitPatientReport": true
  },

  "users": [
    {
      "type": "offline",
      "role": "chw",
      "username": "<username>",
      "password": "<password>"
    }
  ],

  "pages": {
    "contactList": {
      "navigation": [
        { "selector": "//*[@text=\"Reports\"]" },
        {
          "selector": "//*[@text=\"People\"]",
          "asserts": [ { "selector": "//*[contains(@text, \"West Miltonside\")]" } ]
        }
      ],
      "search": {
        "value": "Rafael Windler",
        "asserts": [
          { "selector": "//*[@text=\"Rafael Windler\"]" },
          {
            "scrollDown": 5,
            "selector": "//*[contains(@text, \"No more people\")]"
          }
        ],
        "postTestPath": [
          { "selector": "//*[@text=\"Reports\"]" }
        ]
      }
    },
    "chwArea": {
      "navigation": [
        {
          "selector": "//*[contains(@text, \"West Miltonside\")]",
          "asserts": [
            { "selector": "//*[contains(@text, \"External ID\")]" },
            { "selector": "//*[contains(@text, \"Rafael Windler\")]" },
            { "selector": "//*[contains(@text, \"Households\")]" },
            { "selector": "//*[contains(@text, \"Abilene\")]" }
          ]
        }
      ],
      "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ]
    },
    "household": {
      "navigation": [
        { "selector": "//*[contains(@text, \"West Miltonside\")]" },
        {
          "selector": "//*[contains(@text, \"Abilene\")]",
          "asserts": [
            { "selector": "//*[contains(@text, \"Phone\")]" },
            { "selector": "//*[contains(@text, \"Bill Pouros\")]" },
            {
              "scrollDown": 2,
              "selector": "//*[text()[contains(.,\"Danger sign follow up\")]"
            },
            { "selector": "//*[text()[contains(.,\"Due today\")]" },
            { "selector": "//*[text()[contains(.,\"Pregnancy danger sign\")]" }
          ]
        }
      ]
    },
    "patient": {
      "navigation": [
        {
          "selector": "//*[contains(@text, \"Irene Shields\")]",
          "asserts": [
            { "selector": "//*[contains(@text, \"37 years\")]" },
            {
              "scrollDown": 1,
              "selector": "//*[contains(@text, \"Danger sign follow up\")]" },
            { "selector": "//*[contains(@text, \"Pregnancy danger sign\")]" }
          ]
        }
      ],
      "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ]
    },
    "messageList": {
      "navigation": [
        {
          "selector": "//*[@text=\"Messages\"]",
          "asserts": [ { "selector": "//*[contains(@text, \"No messages found\")]" } ]
        }
      ]
    },
    "reportList": {
      "navigation": [
        {
          "selector": "//*[@text=\"Reports\"]",
          "asserts": [ { "selector": "//*[contains(@text, \"Pregnancy danger sign\")]" } ]
        }
      ],
      "search": {
        "value": "Alexandra Lemke",
        "asserts": [
          {
            "selector": "//*[contains(@text, \"No reports found\")]"
          }
        ],
        "postTestPath": [
          { "selector": "//*[@text=\"Tasks\"]" }
        ]
      }
    },
    "taskList": {
      "navigation": [
        {
          "selector": "//*[@text=\"Tasks\"]",
          "asserts": [ { "selector": "//*[contains(@text, \"Danger sign follow up\")]" } ]
        }
      ]
    },
    "targets": {
      "navigation": [
        {
          "selector": "//*[@text=\"Targets\"]",
          "asserts": [ { "selector": "//*[contains(@text, \"New pregnancies\")]" } ]
        }
      ]
    }
  },
  
  "forms": {
    "patientReport": {
      "navigation": [{
        "scrollDown": 3,
        "selector": "//*[@text=\"Pregnancy\"]"
      }],
      "pages": [
        {
          "asserts": [
            { "selector": "//*[contains(@text, \"Select patient\")]" } // Wait for form to load
          ],
          "fields": [
            {
              "selector": "<Mandatory. XPath selector of radio buttons, text boxes (to open keyboard), etc.>",
              // Optional. Use this when you need to type in the phone's keyboard, find the keycodes here: https://developer.android.com/reference/android/view/KeyEvent
              "keycodes": "<Array of numbers (keycodes)>",  
              // Optional. Use this when you want an equivalent of element.setValue(myValue)
              "value": "<String. Field value>",
              // Optional. Use this when you want to select an option from a dropdown. The dropdown will open with the "selector" property
              "dropdownOption": "<String. XPath selector to a dropdown option and clicks on it.>",
              // Optional. Number of scrolls to reach the field
              "scrollDown": 1,
              "scrollUp": 1
            }
          ],
          // Optional. Number of scrolls to reach the page's buttons
          "scrollDown": 2,
          "scrollUp": 1
        },
        { // Add this to assert the form summary page.
          "asserts": [
            { "selector": "//*[@text=\"Pregnancy in danger\"]" },
            { "selector": "//*[contains(@text, \"Refer patient to clinic\")]" }
          ],
          // Optional. Number of scrolls to reach the page's buttons
          "scrollDown": 2,
          "scrollUp": 3
        }
      ],
      "postSubmitAsserts": [ // Add to assert result after form is submitted.
        { "select": "//android.widget.TextView[contains(@text, \"Submitted by Paula\")]" }
      ],
      "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ]
    }
  }
}
```

</details>

4. Set the environment variable `APDEX_TEST_SETTINGS` with the path of your settings file (apdex-settings.json).
   - Ensure the apdex-settings.json file has been updated with the correct instance url, login credentials and assertion texts for page navigation, forms and other app interactions
   - Under the skip section of the settings file, set `true` for tests you want to skip and `false` for the tests to be executed
   - Update the fields for `platformVersion` and `deviceName` to match the value for your device
     - Find the android version by running `adb shell getprop | grep ro.build.version.release`
     - Find the device name by running `adb shell getprop | grep ro.product.model`
5. Ensure all dependencies have been properly installed - run `npm ci` from the root directory 
6. Run `npm run apdex-test` from the root directory to execute the selected tests

```
export APDEX_TEST_SETTINGS=/Users/pepe/Documents/apdex-settings.json
```

## Settings file

| Property | Type | Description | Mandatory |
|--|--|--|--|
| iterations | Number | Times to run the test cases | Yes |
| instanceURL | String | Instance url | Yes |
| hasPrivacyPolicy | Boolean | Whether it has privacy policies to accept | Yes |
| capabilities | Object[] | Configures Appium to use your device for testing | Yes |
| capabilities.platformVersion | String | Android version. E.g. "13". Find the android version by running `adb shell getprop | grep ro.build.version.release` | Yes |
| capabilities.deviceName | String | Device name. E.g. "Neon Ray Ultra S". Find the device name by running `adb shell getprop | grep ro.product.model` | Yes |
| capabilities.appPath | String | Path to CHT Android APK. E.g. "/Users/john/Downloads/cht-android-v1.4.0-unbranded-armeabi-v7a-release.apk" | Yes |
| capabilities.noReset | Boolean | Default false. When set false, it deletes the app cache and storage data. If set to true, the app will start again in the last page it was before, review your configuration to take that start point. | No |
| skip.login | Boolean | Default false. Skip login, and it's expected that the user has already login previous running the automation tests. | No |
| skip.loadContactList | Boolean | Default false. Skip test for loading the contact list. | No |
| skip.loadChwArea | Boolean | Default false. Skip test for loading the CHT Area. | No |
| skip.loadHousehold | Boolean | Default false. Skip test for loading a household. | No |
| skip.loadPatient | Boolean | Default false. Skip test for loading a patient. | No |
| skip.searchContact | Boolean | Default false. Skip test for searching patient. | No |
| skip.loadTaskList | Boolean | Default false. Skip test for loading the task list. | No |
| skip.submitTask | Boolean | Default false. Skip test for submitting a task. | No |
| skip.loadTargets | Boolean | Default false. Skip test for loading the targets page. | No |
| skip.loadReportList | Boolean | Default false. Skip test for loading the report list. | No |
| skip.searchReport | Boolean | Default false. Skip test for searching a report. | No |
| skip.createPatient | Boolean | Default false. Skip test for creating a patient. | No |
| skip.submitPatientReport | Boolean | Default false. Skip test for submiting a report for a patient. | No |
| users | Object[] | User to login and use for testing | Yes |
| users.type | String | Use: "offline" or "online" | Yes |
| users.role | String | Use: "chw" | Yes |
| users.username | String | Username | Yes |
| users.password | String | Password | Yes |
| commonElements | Object | Overrides selectors of system elements | No |
| commonElements.fab | String | XPath selector to element | No |
| commonElements.fabListTitle | String | XPath selector to element | No |
| commonElements.formSubmit | String | Form's submit button label | No |
| commonElements.formNext | String | Form's next button label | No |
| commonElements.relaunchAppAssert | String | XPath selector to element | No |
| commonElements.searchIcon | String | XPath selector to element | No |
| pages | Object | Object containing the definition of the pages that the automation tests use. See Pages section below for more details. | Yes |
| pages.contactList | Object | Definition for Contact List page. See Pages section below for more details. | Yes |
| pages.chwArea | Object | Definition for Contact CHW Area page. See Pages section below for more details. | Yes |
| pages.household | Object | Definition for Contact Household page. See Pages section below for more details. | Yes |
| pages.patient | Object | Definition for Contact Patient page. See Pages section below for more details. | Yes |
| pages.messageList | Object | Definition for Message List page. See Pages section below for more details. | Yes |
| pages.reportList | Object | Definition for Report List page. See Pages section below for more details. | Yes |
| pages.taskList | Object | Definition for Task List page. See Pages section below for more details. | Yes |
| pages.targets | Object | Definition for Targets page. See Pages section below for more details. | Yes |
| forms | Object | Definition for app forms or contact forms that the automation tests use. See Forms section below for more details. | Yes |
| forms.patientReport | Object | Definition for an app form that is submitted on the Patient page. See Forms section below for more details. | Yes |
| forms.patientContact | Object | Definition for a contact form that is used to create patients. Submitted from the Household page. See Forms section below for more details. | Yes |

#### Pages

Object containing the definition of the pages to load and assert during these automation tests.

| Property | Type | Description | Mandatory |
|--|--|--|--|
| navigation | Object[] | Click path to navigate to that page. See Navigation section below for more details. | Yes |
| search | Object | Contains the configuration to filter data by using the search feature from the page | No |
| search.value | String | Search term | No |
| search.asserts | Object[] | Elements to assert once it has finished searching in the current page. Use to make sure all elements in the page have finished rendering. See Asserts section for more details. | No |
| search.postTestPath | Object[] | Click path to navigate after the test has finished searching and the asserts has finished. | No |
| postTestPath | Object[] | Click path to navigate after the test has finished. E.g. clicking on the back button to go back to the main list. It uses the same Navigation structure, see the Navigation section below for more details. | No |
| relaunchApp | Boolean | Set true, to close and open the app before navigating to this page. This can make tests slower as the app needs to load the assets and data again. | No |

#### Forms

Object containing the definition of forms to load, fill fields and asserts outcomes.

| Property | Type | Description | Mandatory |
|--|--|--|--|
| navigation | Object[] | Click path to navigate to that page. See Navigation section below for more details. | Yes |
| useFAB | Boolean | Whether to click on the floating action button to open the form before proceeding with the tests. | Yes |
| pages.asserts | Object[] | Elements to assert once it has finished navigating to the current page. Use to make sure all elements in the page have finished rendering. See Asserts section for more details. | Yes |
| pages.fields | Object[] | Fields to fill-up. See Fields section below for more details. | Yes |
| pages.scrollDown | Number | Times to scroll down to reach to the page buttons. | No |
| pages.scrollUp | Number | Times to scroll up in the page. | No |
| postSubmitAsserts | Object[] | Elements to assert once it has finished submitting the form. Use to make sure the form was submitted correctly. Same as Asserts, see Asserts section for more details. | Yes |
| postTestPath | Object[] | Click path to navigate after the test has finished. E.g. clicking on the back button to go back to the main list. It uses the same Navigation structure, see the Navigation section below for more details. | No |

#### Fields

Object containing the information to fill up fields.

| Property | Type | Description | Mandatory |
|--|--|--|--|
| selector | String | XPath selector to element and clicks on it. Use it to select radio buttons or checkboxes; to activate a input text to open a keyboard; or to open a dropdown. | Yes |
| keycodes | Number[] | Array of keycodes. Use it when you need to type in the phone's keyboard, find the keycodes here: https://developer.android.com/reference/android/view/KeyEvent | No |
| dropdownOption | String | XPath selector to a dropdown option and clicks on it. | No |
| value | String or number | Use this to set the value directly in the input instead of using the keyboard. Like when using `element.setValue()`. | No |
| scrollDown | Number | Times to scroll down to reach to the element specified in the "selector". | No |
| scrollUp | Number | Times to scroll up to reach to the element specified in the "selector". | No |
| id | String | When having too many fields, use the id to label your fields and help you understand better the settings file. | No |

#### Navigation

Object containing the click path to navigate to a page.

| Property | Type | Description | Mandatory |
|--|--|--|--|
| selector | String | XPath selector to element and clicks on it. | Yes |
| asserts | Object[] | Elements to assert once it has finished navigating. Use to make sure all elements in the page have finished rendering. See Asserts section for more details. | Yes |
| scrollDown | Number | Times to scroll down to reach to the element specified in the "selector". | No |
| scrollUp | Number | Times to scroll up to reach to the element specified in the "selector". | No |

#### Asserts

Elements to assert that are displayed in the screen.

| Property | Type | Description | Mandatory |
|--|--|--|--|
| selector | String | XPath selector to element and clicks on it. | Yes |
| scrollDown | Number | Times to scroll down to reach to the element specified in the "selector". | No |
| scrollUp | Number | Times to scroll up to reach to the element specified in the "selector". | No |

## Tips

- Take time to understand the forms you are testing:
   - Are fields appearing dynamically?
   - Are there field's labels being updated automatically and removing the previous selection?

- Assert for elements in the screen before interacting with them, to ensure they are ready.
- Test how many scrolls you need by plugging the phone in the computer and run these adb commands:
   - Scroll down: `adb shell input swipe 500 1000 300 300`
   - Scroll up: `adb shell input swipe 300 300 500 1000`
   - For example, if you need to run the scroll down command 3 times, then you add 3 as the value for scrollDown like this: `"scrollDown": 3,`
- In some cases, it's necessary to unfocus a selected element, trigger a click in a label. For example:

```
{
  "id": "age_field_label",
  "selector": "//*[contains(@text, \"What is your age\")]"
},
```

- XPATH selectors
  - Avoid XPATH selector with special characters like single quote, asterisks.
  - Find an element containing a text _anywhere_ in the screen: `"//*[text()[contains(.,\"Eric Patt\")]"`
  - Use [Appium Inspector](https://github.com/appium/appium-inspector) to help you find the XPath selectors. Sometimes it produces very long selectors but you can find a way to make them shorter.
     - If it fails to start after setting up with capabilities. Try running `appium server` in the terminal then run the Appium Inspector.
