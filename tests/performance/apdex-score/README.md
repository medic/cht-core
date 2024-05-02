# Apdex Performance Tests

## Setup

1. Enable the developer mode in your phone and enable the USB Debugger mode.
2. Connect the phone to the computer
3. Create a settings file:
```
{
    "iterations": <number - times to run the test cases>,
    "instanceURL": <string, instance url>,
    "hasPrivacyPolicy": <bool, wether it has privacy policies>,
    "capabilities": [
      {
        "platformVersion": <string, Android version. E.g. "13">,
        "deviceName": <string, device name. E.g. "Neon Ray Ultra S">
      }
    ],
    "users": [
      {
        "type": "offline",
        "role": "chw",
        "username": <username>,
        "password": <password>
      }
    ],
  
    "pages": {
      "contact-list": {
        "navigation": [
          { "selector": "//*[@text=\"<another tab name>\"]" }, // Always go to another tab in each iteration to reload Contacts 
          {
            "selector": "//*[@text=\"<contacts tab name>\"]",
            "asserts": [ { "selector": "//*[contains(@text, \"<contact name in the list>\")]" } ]
          }
        ]
      },
      "chw-area": {
        "navigation": [
          {
            "selector": "//*[contains(@text, \"<chw area name to select>\")]", // Avoid using special characters like single quote
            "asserts": [
              {
                "selector": "//*[@text=\"<contact summary field value>\"]"
              },
              {
                "selector": "//*[contains(@text, \"<contact care card value>\")]"
              },
              {
                "scrollDown": 3, // Add scrolls as needed on any assert object.
                "selector": "//*[@text=\"<report name>\"]"
              }
            ]
          }
        ],
        "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ] // Click on the back button after test case is done.
      },
      "household": {
        "navigation": [
          { "selector":  "selector": "//*[@text=\"<contacts tab name>\"]",
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
            "scrollUp": 2,
            "selector": "//*[contains(@text, \"<Patient name to select>\")]",
            "asserts": [
              { "selector": "//*[contains(@text, \"<contact summary field value>\")]" },
              { "selector": "//*[contains(@text, \"<a task name>\")]" },
              {
                "scrollDown": 1,
                "selector": "//*[contains(@text, \"<a report name>\")]"
              }
            ]
          }
        ],
        "postTestPath": [ { "selector": "//*[@text=\"Back\"]" } ] // Click on the back button after test case is done.
      }
    }
}
```
  - Find the android version by running `adb shell getprop | grep ro.build.version.release`
  - Find the device name by running `adb shell getprop | grep ro.product.model`
4. Set the environment variable `APDEX_TEST_SETTINGS` with the path of your settings file.
```
export APDEX_TEST_SETTINGS=/Users/pepe/Documents/apdex-settings.json
```
