# if passed in a timestamp as part of running it, set it on process.env
[ timestamp ] = require('optimist').argv._

if timestamp
  matches =  String(timestamp).match(/(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/)
  if matches
    [ fullmatch, year, month, day, hours, minutes ] = matches
    hours ?= 0
    minutes ?= 0
    ts = new Date()
    ts.setFullYear(year, month - 1, day)
    ts.setHours(hours, minutes, 0, 0)

module.exports =
  getDate: ->
    if ts
      new Date(ts.getTime())
    else
      new Date()
  isSynthetic: ->
    !!ts
