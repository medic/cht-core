/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
  {
      from: '/app_settings/:ddoc/:objectpath',
      to: '_show/app_settings/_design/:ddoc',
      method: "GET"
  },
  {
      from: '/app_settings/:ddoc',
      to: '_show/app_settings/_design/:ddoc',
      method: "GET"
  },
  {
      from: '/update_settings/:ddoc',
      to: '_update/update_config/_design/:ddoc',
      method: "PUT"
  }
];
