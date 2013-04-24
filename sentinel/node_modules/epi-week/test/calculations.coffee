epi = require('..')

vows = require('vows')
should = require('should')

vows.describe('2012').addBatch(
  'jan':
    topic: -> epi
    'jan 1 week 1': (epi) ->
      epi(new Date(2012, 0, 1)).should.eql(week: 1, year: 2012)
    'jan 7 week 1': (epi) ->
      epi(new Date(2012, 0, 7)).should.eql(week: 1, year: 2012)
  'apr':
    topic: -> epi
    'apr 28': (epi) ->
      epi(new Date(2012, 3, 28)).should.eql(week: 17, year: 2012)
    'apr 29': (epi) ->
      epi(new Date(2012, 3, 29)).should.eql(week: 18, year: 2012)
  'dec':
    topic: -> epi
    'dec 29 2012': (epi) ->
      epi(new Date(2012, 11, 29)).should.eql(week: 52, year: 2012)
    'dec 30 2012': (epi) ->
      epi(new Date(2012, 11, 30)).should.eql(week: 1, year: 2013)
).export(module)
vows.describe('2013').addBatch(
  'jan':
    topic: -> epi
    'jan 1 week 1': (epi) ->
      epi(new Date(2013, 0, 1)).should.eql(week: 1, year: 2013)
  'dec':
    topic: -> epi
    'dec 28': (epi) ->
      epi(new Date(2013, 11, 28)).should.eql(week: 52, year: 2013)
    'dec 30 2013': (epi) ->
      epi(new Date(2013, 11, 30)).should.eql(week: 1, year: 2014)
).export(module)
vows.describe('2014').addBatch(
  'week 53':
    topic: -> epi
    '2015-1-1': (epi) ->
      epi(new Date(2015, 0, 1)).should.eql(week: 53, year: 2014)
).export(module)
