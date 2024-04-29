# Apdex Performance Tests

## Setup

1. Enable the developer mode in your phone and enable the USB Debugger mode.
2. Connect the phone to the computer
3. Create a settings file:
```
{
  "instanceURL": "<instance-url>",
  "hasPrivacyPolicy": true,
  "capabilities": [
    {
      "platformVersion": "<android-version>",
      "deviceName": "<device-name>"
    }
  ],
  "users": [
    {
      "type": "offline",
      "role": "chw",
      "username": "<username>",
      "password": "<password>"
    }
  ],
  "pages": {
      "contact-list": {
        "navigation": [ { "selector": "<selector>" } ],
        "assert": { "selector": "<selector>" }
      },
      "chw-area": {
        "navigation": [
          { "selector": "<selector>" },
          { "selector": "<selector>" }
        ]
      },
      "household": {
        "navigation": [
          { "selector": "<selector>" },
          { "selector": "<selector>" },
          { "selector": "<selector>" }
        ]
      },
      "patient": {
        "navigation": [
          { "selector": "<selector>" },
          { "selector": "<selector>" },
          { "selector": "<selector>" },
          { "selector": "<selector>" }
        ]
      },
      "report-list": {
        "navigation": [ { "selector": "<selector>" } ]
      },
      "task-list": {
        "navigation": [ { "selector": "<selector>" } ]
      },
      "message-list": {
        "navigation": [ { "selector": "<selector>" } ]
      },
      "targets": {
        "navigation": [ { "selector": "<selector>" } ]
      }
    },
}
```
  - Find the android version by running `adb shell getprop | grep ro.build.version.release`
  - Find the device name by running `adb shell getprop | grep ro.product.model`
4. Set the environment variable `APDEX_TEST_SETTINGS` with the path of your settings file.
```
export APDEX_TEST_SETTINGS=/Users/pepe/Documents/apdex-settings.json
```
