module.exports = {
  resolve: {
    alias: {
      // Only include the jquery version from the package.json (and not any different versions pulled in transitively).
      'jquery': __dirname + '/node_modules/jquery',
    },
    fallback: {
      path: false,
      fs: false,
      os: false,
      zlib: false,
      http: false,
      https: false,
    }
  }
};
