fs = require('fs')
_ = require('underscore')

module.exports = _.reduce(fs.readdirSync('./views'), (memo, file) ->
  try
    unless file is 'index.coffee'
      view = require("./#{file}")
      memo[file.replace(/\.(coffee|js)$/, '')] = view
  catch e
    # do nothing
    console.error(e)
  memo
, {})
