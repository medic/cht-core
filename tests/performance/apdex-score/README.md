# Apdex Performance Tests

## Setup

1. Enable the developer mode in your phone and enable the USB Debugger mode.
2. Connect the phone to the computer
3. Create a settings file:

<details> <summary>Expand to see settings file structure </summary>

```
{
  "iterations": <Mandatory. Number of times to run the test cases>,
  "instanceURL": <Mandatory. String, instance url>,
  "hasPrivacyPolicy": <Mandatory. Boolean, wether it has privacy policies>,
  
  "capabilities": [
    {
      "platformVersion": <Mandatory. String, Android version. E.g. "13">,
      "deviceName": <Mandatory. String, device name. E.g. "Neon Ray Ultra S">
      "appPath": <Path to APK, relative to CHT root folder>
      "noReset": false
    }
  ],
  
  "skip": {
      "login": false,
      "loadContactList": false,
      "loadCHWArea": false,
      "loadHousehold": false,
      "loadPatient": false,
      "searchContact": false,
      "searchReport": false,
      "loadMessageList": false,
      "loadTaskList": true,
      "loadTargets": true,
      "loadReportList": true,
      "createPatient": true,
      "submitPatientReport": true
    },
  
  "users": [
    {
      "type": "offline",
      "role": "chw",
      "username": <Mandatory. String, username>,
      "password": <Mandatory. String, password>
    }
  ],
  
  "commonElements": {
    "fab": <Optional. String, selector>,
    "formSubmit": <Optional. String, selector>,
    "formNext": <Optional. String, selector>
  },
  
  "pages": {
    "contactList": {
      "navigation": [
        { "selector": "//*[@text=\"<another tab name>\"]" }, // Always go to another tab in each iteration to reload Contact List 
        {
          "selector": "//*[@text=\"<contact's tab name>\"]",
          "asserts": [ { "selector": "//*[contains(@text, \"<contact name in the list>\")]" } ]
        }
      ],
      "search": {
        "value": "<contact name>",
        "asserts": [
          { "selector": "//*[@text=\"<contact name>\"]" },
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
          "selector": "//*[contains(@text, \"<chw area name to select>\")]",
          "asserts": [
            { "selector": "//*[@text=\"<contact summary field value>\"]" },
            { "selector": "//*[contains(@text, \"<contact care card value>\")]" },
            {
              "scrollDown": <Optional. Number of scrolls>,
              "selector": "//*[@text=\"<report name>\"]"
            }
          ]
        }
      ],
      "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ] // Click on the back button after test case is done.
    },
    "household": {
      "navigation": [
        { "selector": //*[@text=\"<contacts tab name>\"]",
        {
          "selector":  "//*[@text=\"<Household name to select>\"]", // Wait for contacts to load
          "asserts": [
            { "selector": "//*[@text=\"<contact summary field value>\"]" },
            { "selector": "//*[contains(@text, \"<a contact descendant name>\")]" },
            {
             "scrollDown": 1,
             "selector": "//*[contains(@text, \"<a task name>\")]"
            },
            {
              "scrollDown": 1,
              "selector": "//*[contains(@text, \"<a report name>\")]"
            }
          ]
        }
      ]
    },
    "patient": {
      "navigation": [
        {
          "scrollUp": <Optional. Number of scrolls>,
          "selector": "//*[contains(@text, \"<Patient name to select>\")]",
          "asserts": [
            { "selector": "//*[contains(@text, \"<contact summary field value>\")]" },
            { "selector": "//*[contains(@text, \"<a task name>\")]" },
            {
              "scrollDown": <Optional. Number of scrolls>,
              "selector": "//*[contains(@text, \"<a report name>\")]"
            }
          ]
        }
      ],
      "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ] // Click on the back button after test case is done.
    }
  },
  
  "forms": {
    "patientReport": {
      "navigation": [{
        "scrollDown": <Optional. Number of scrolls>,
        "selector": "//*[@text=\"<a report form name>\"]"
      }],
      "pages": [
        {
          "asserts": [
            { "selector": "//*[contains(@text, \"<a text in the form>\")]" } // Wait for form to load
          ],
          "fields": [
            {
              "selector": <Mandatory. String, clickable element selector>, // Radio buttons, text boxes (to activate), etc.
              // Use this when you need to type in the phone's keyboard, find the keycodes here: https://developer.android.com/reference/android/view/KeyEvent
              "keycodes": <Optional. Array of numbers (keycodes).  
              // Use this when you want an equivalent of element.setValue(myValue)
              "value": <Optional. String or number>
              // Use this when you want to select an option from a dropdown. The dropdown will open with the "selector" property
              "dropdownOption": <Optional. String, clickable element selector>
              // Scroll to reach field
              "scrollDown": <Optional. Number of scrolls>
              "scrollUp": <Optional. Number of scrolls>
            },
          ],
          // Scroll to reach page buttons
          "scrollDown": <Optional. Number of scrolls>
          "scrollUp": <Optional. Number of scrolls>
        },
        { // Add this page to assert the form summary page.
          "asserts": [
            { "selector": "//*[@text=\"<a text in the form summary>\"]" },
            { "selector": "//*[contains(@text, \"<a text in the form summary>\")]" },
            // Scroll to reach page buttons
            "scrollDown": <Optional. Number of scrolls>
            "scrollUp": <Optional. Number of scrolls>
          ]
        }
      ],
      "postSubmitAsserts": [ // Add to assert result after form is submitted.
        { "select": "//android.widget.TextView[contains(@text, \"Submitted by <username>\")]" }
      ],
      "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ]
    },
  }
}
```

</details>

  - Find the android version by running `adb shell getprop | grep ro.build.version.release`
  - Find the device name by running `adb shell getprop | grep ro.product.model`

4. Set the environment variable `APDEX_TEST_SETTINGS` with the path of your settings file.
```
export APDEX_TEST_SETTINGS=/Users/pepe/Documents/apdex-settings.json
```

## Settings file

| Property | Type | Description | Mandatory |
|--|--|--|--|
| iterations | Number | Times to run the test cases | Yes |
| instanceURL | String | Instance url | Yes |
| hasPrivacyPolicy | Boolean | Wether it has privacy policies to accept | Yes |
| capabilities | Object[] | Configures Appium to use your device for testing | Yes |
| capabilities.platformVersion | String | Android version. E.g. "13". Find the android version by running `adb shell getprop | grep ro.build.version.release` | Yes |
| capabilities.deviceName | String | Device name. E.g. "Neon Ray Ultra S". Find the device name by running `adb shell getprop | grep ro.product.model` | Yes |
| capabilities.appPath | String | Path to CHT Android APK. E.g. "/Users/john/Downloads/cht-android-v1.4.0-unbranded-armeabi-v7a-release.apk" | Yes |
| capabilities.noReset | Boolean | Default false. When set false, it deletes the app cache and storage data. If set to true, the app will start again in the last page it was before, review your configuration to take that start point. | No |
| skip.login | Boolean | Default false. Skip login, and it's expected that the user has already login previous running the automation tests. | No |
| skip.loadContactList | Boolean | Default false. Skip test for loading the contact list. | No |
| skip.loadCHWArea | Boolean | Default false. Skip test for loading the CHT Area. | No |
| skip.loadHousehold | Boolean | Default false. Skip test for loading a household. | No |
| skip.loadPatient | Boolean | Default false. Skip test for loading a patient. | No |
| skip.searchContact | Boolean | Default false. Skip test for searching patient. | No |
| skip.loadTaskList | Boolean | Default false. Skip test for loading the task list. | No |
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
| commonElements.relaunchAppAssert | String | XPath selector to element to assert when the app opens | No |
| commonElements.searchIcon | String | XPath selector to element | No |
| commonElements.fab | String | XPath selector to element | No |
| commonElements.fabListTitle | String | XPath selector to element | No |
| commonElements.formSubmit | String | XPath selector to element | No |
| commonElements.formNext | String | XPath selector to element | No |
| pages | Object | Object containing the definition of the pages that the automation tests use. See Pages section below for more details. | Yes |
| pages.contactList | Object | Definition for Contact List page. See Pages section below for more details. | Yes |
| pages.chwArea | Object | Definition for Contact CHW Area page. See Pages section below for more details. | Yes |
| pages.household | Object | Definition for Contact Household page. See Pages section below for more details. | Yes |
| pages.patient | Object | Definition for Contact Patient page. See Pages section below for more details. | Yes |
| forms | Object | Definition for app forms or contact forms that the automation tests use. See Forms section below for more details. | Yes |
| forms.patientReport | Object | Definition for an app form that is submitted on the Patient page. See Forms section below for more details. | Yes |
| forms.patientContact | Object | Definition for a contact form that is used to create patients. Submitted from the Household page. See Forms section below for more details. | Yes |
| pages.messageList | Object | Definition for Message List page. See Pages section below for more details. | Yes |
| pages.reportList | Object | Definition for Report List page. See Pages section below for more details. | Yes |
| pages.taskList | Object | Definition for Task List page. See Pages section below for more details. | Yes |
| pages.targets | Object | Definition for Targets page. See Pages section below for more details. | Yes |


#### Pages
Object containing the definition of the pages to load and assert during these automation tests.

| Property | Type | Description | Mandatory |
|--|--|--|--|
| navigation | Object[] | Click path to navigate to that page. See Navigation section below for more details. | Yes |
| postTestPath | Object[] | Click path to navigate after the test has finished. E.g. clicking on the back button to go back to the main list. It uses the same Navigation structure, see the Navigation section below for more details. | No |

#### Forms
Object containing the definition of forms to load, fill fields and asserts outcomes. 

| Property | Type | Description | Mandatory |
|--|--|--|--|
| navigation | Object[] | Click path to navigate to that page. See Navigation section below for more details. | Yes |
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
    - For example, if you need to run 3 times the scroll down command, then you add 3 like this: `"scrollDown": 3,`
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

