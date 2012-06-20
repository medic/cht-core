fs = require('fs')
_ = require('underscore')
async = require('async')
date = require('../date')

tasks = _.compact(_.map(fs.readdirSync('./schedule'), (file) ->
  try
    require("./#{file}") unless file is 'index.coffee'
  catch e
    console.error(e)
    # do nothing
))

check_schedule = ->
  # only send between 9am and 6pm
  if 8 <= date.getDate().getHours() <= 18
    async.forEach(tasks, (task) ->
      task()
    , (err) ->
      throw err if err
      reschedule()
    )
  else
    reschedule()

reschedule = ->
  next_heartbeat = new Date()
  now = new Date().getTime()
  next_heartbeat.setHours(next_heartbeat.getHours() + 1)
  next_heartbeat.setMinutes(0, 0, 0)
  next_heartbeat = next_heartbeat.getTime() - now
  console.log("Checking again in #{Math.floor(next_heartbeat / (1000 * 60))}m#{Math.floor(next_heartbeat / 1000) % 60}s...")
  setTimeout(check_schedule, next_heartbeat)

check_schedule()
