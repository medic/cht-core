global.framework = {
    auth: require('./modules/auth')(),
    constants: require('./modules/constants'),
    gatewayApiUtils: require('./modules/gateway-api.utils'),
    helper: require('./modules/helper'),
    serviceManager: require('./modules/service-manager'),
    TEST_OBJECT: require('./modules/testObject'),
    utils: require('./modules/utils')
};

module.exports = framework;