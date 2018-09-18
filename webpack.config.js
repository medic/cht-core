// var debug = process.env.NODE_ENV !== "production";
const path = require('path'),
  webpack = require('webpack'),
  ngAnnotatePlugin = require('ng-annotate-webpack-plugin'),
  AotPlugin = require('@ngtools/webpack').AotPlugin,
  AngularCompilerPlugin = require('@ngtools/webpack').AngularCompilerPlugin;

// import { AngularCompilerPlugin } from '@ngtools/webpack';

module.exports = {
  // mode: 'production',
  mode: 'development',
  context: __dirname,
  // devtool: debug ? "inline-sourcemap" : null,
  entry: './webapp/src/js/app.module',
  output: {
    path: path.join(__dirname, '/build/ddocs/medic/_attachments/js'),
    filename: 'inbox.js',
  },
  module: {
    rules: [
      // {
      //   test: /\.tsx?$/,
      //   exclude: /node_modules/,
      //   use: 'ts-loader',
      // },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'ng-annotate-loader',
      },
      {
        test: /\.ts$/,
        loader: '@ngtools/webpack',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      'angular-translate-handler-log': path.join(
        __dirname,
        '/webapp/node_modules/angular-translate/dist/angular-translate-handler-log/angular-translate-handler-log.js'
      ),
      'angular-translate-interpolation-messageformat': path.join(
        __dirname,
        '/webapp/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat.js'
      ),
      // 'pouchdb-browser': path.join(__dirname, '/webapp/node_modules/pouchdb-browser/lib/index.js')
    },
  },
  node: {
    fs: 'empty',
  },
  // plugins: [
  //   new ngAnnotatePlugin({ add: true })
  // ]
  plugins: [
    new AngularCompilerPlugin({
      tsConfigPath: 'tsconfig.json',
      entryModule: 'webapp/src/js/app.module#AppModule',
      // mainPath: 'webapp/src/js/app.ts',
      // sourceMap: true
    }),
  ],
};
