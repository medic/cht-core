_ = require('underscore')
fs = require('fs')
Transition = require('./transition')

result = _.reduce(fs.readdirSync('./transitions'), (memo, file) ->
  try
    unless _.contains(['index.coffee', 'transition.coffee'], file)
      options = require("./#{file}")

      key = file.replace(/\.coffee$/, '')

      memo.filters[key] = new Transition(key, options).generateFilter(key)

      memo.transitions[key] = options
  catch e
    # do nothing
    console.error(e)
  memo
, {
  filters: {}
  transitions: {}
})

result.Transition = Transition

module.exports = result
