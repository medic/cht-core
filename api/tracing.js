/* eslint-disable */
'use strict'

const load = (server) => {
  if (!server) { return; }
  const process = require('process');
  const opentelemetry = require('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  // const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
  const { OTLPTraceExporter } =  require('@opentelemetry/exporter-trace-otlp-proto');
  const { Resource } = require('@opentelemetry/resources');
  const { SEMRESATTRS_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

  // configure the SDK to export telemetry data to the console
  // enable all auto-instrumentations from the meta package
  // const traceExporter = new ConsoleSpanExporter();

  const collectorOptions = {
    url: server, // url is optional and can be omitted - default is http://localhost:4318/v1/traces
    // headers: {
    //   f_oo: 'b_ar'
    // }, //an optional object containing custom headers to be sent with each request will only work with http
  };

  // const provider = new BasicTracerProvider();
  const traceExporter = new OTLPTraceExporter(collectorOptions);
  const sdk = new opentelemetry.NodeSDK({
    resource: new Resource({
      [ SEMRESATTRS_SERVICE_NAME ]: 'api',
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()]
  });

  // initialize the SDK and register with the OpenTelemetry API
  // this enables the API to record telemetry
  sdk.start();

  // gracefully shut down the SDK on process exit
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}

module.exports = {
  load
}
