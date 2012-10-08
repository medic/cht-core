fs = require('fs')
_ = require('underscore')
async = require('async')
date = require('../date')

tasks = _.compact(_.map(fs.readdirSync(__dirname), (file) ->
  try
    if file isnt 'index.coffee'
        console.log('loading task '+file)
        require("./#{file}")
  catch e
    console.error(e)
    # do nothing
))

check_schedule = ->
  # only send between 9am and 6pm
  if 9 <= date.getDate().getHours() <= 17
    console.log('checking schedule at '+date.getDate())
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
  console.log("checking schedule again in #{Math.floor(next_heartbeat / (1000 * 60))}m#{Math.floor(next_heartbeat / 1000) % 60}s...")
  setTimeout(check_schedule, next_heartbeat)

check_schedule()
