# Apdex Performance Tests

## Setup

1. Enable the developer mode in your phone and enable the USB Debugger mode.
2. Connect the phone to the computer
3. Create a settings file:
```
{
  "instanceURL": "<instance_url>",
  "appium": {
    "platformVersion": "<android-version>",
    "deviceName": "<device-name>"
  },
  "users": [
    {
      "type": "offline",
      "role": "chw",
      "username": "<username>",
      "password": "<password>"
    }
  ]
}
```
  - Find the android version by running `adb shell getprop | grep ro.build.version.release`
  - Find the device name by running `adb shell getprop | grep ro.product.model`
4. Set the environment variable `APDEX_TEST_SETTINGS` with the path of your settings file.
```
export APDEX_TEST_SETTINGS=/Users/pepe/Documents/apdex-settings.json
```
