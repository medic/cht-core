# Kujua Sentinel

Sentinel is required for certain forms that have the `use-sentinel` property
set to true.

## Configuration

Copy `.env-example` to `.env` and modify for your database settings.

A default configuration is also generated from `config.coffee` and saved at
`db/sentinel-configuration` you can make your configuration changes to this
document and save it as part of the project source files.

## Run

`node ./server.js`
