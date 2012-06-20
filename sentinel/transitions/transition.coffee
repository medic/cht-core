_ = require('underscore')

class Transition
  constructor: (@code, options = {}) ->
    _.extend(@, options)
    throw new Error("No onMatch defined") unless @onMatch

    @required_fields ?= []
    @required_fields = @required_fields.split(' ') if _.isString(@required_fields)

    @db = require('../db')
    _.extend(@, require('../lib/utils'))

    @i18n = require('../i18n')
    @date = require('../date')
    @config = require('../config')
  complete: (err, doc) ->
    if err
      throw JSON.stringify(err)

    if doc
      doc.transitions ?= []
      doc.transitions.push(@code)
      doc.transitions = _.unique(doc.transitions)
      @db.saveDoc(doc, (err, result) ->
        console.error(JSON.stringify(err)) if err
      )
  generateFilter: (code) ->
    ((doc)->
      transitions = doc.transitions ?= []

      return false if transitions.indexOf('__CODE__') >= 0

      form = '__FORM__'
      return false if form and doc.form isnt form

      test = (obj, fields, negate) ->
        fields = fields.split('.') unless Array.isArray(fields)
        field = fields.shift()
        if obj?[field] and fields.length
          test(obj[field], fields, negate)
        else
          result = !!obj?[field]
          if negate then !result else result

      required_fields = '__REQUIRED_FIELDS__'
      if required_fields is ''
        required_fields = []
      else
        required_fields = required_fields.split(' ')

      fields_match = required_fields.every((field) ->
        negate = field.indexOf('!') is 0
        test(doc, field.replace(/^!/, ''), negate)
      )

      fields_match
    ).toString()
      .replace(/'__FORM__'/g, "'#{@form or ''}'")
      .replace(/'__CODE__'/g, "'#{code}'")
      .replace(/'__REQUIRED_FIELDS__'/g, "'#{@required_fields.join(' ')}'")
  attach: ->
    stream = @db.changesStream(filter: "kujua-sentinel/#{@code}", include_docs: true)
    # TODO add couchdb error handling e.g. if the stream closes
    stream.on('data', (change) =>
      @onMatch(change)
    )
module.exports = Transition
