crypto = require('crypto')
_ = require('underscore')
config = require('../config')

LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')
format = undefined

addNumber = (result, number) ->
  result.push(number % 10)
  Math.floor(number / 10)

addLetter = (result, number) ->
  result.push(LETTERS[number % LETTERS.length])
  Math.floor(number / LETTERS.length)

addCheckDigit = (digits) ->
  offset = format.length + 1
  total = _.reduce(digits, (sum, digit, index) ->
    char = format.charAt(index)
    if /\d/.test(char)
      sum + (Number(digit) * (offset - index))
    else if /\w/.test(char)
      sum + ((_.indexOf(LETTERS, char) + 1) * (offset - index))
    else
      sum
  , 0)
  result = total % 11
  digits.push(if result is 10 then 0 else result)

generate = (s) ->
  sum = crypto.createHash('md5')
  sum.update("#{s}-#{new Date().getTime() * Math.random()}")
  number = parseInt(sum.digest('hex').substring(0, 12), 16)

  format = config.get('id_format') or '111111'
  result = _.reduce(format.split(''), (memo, char) ->
    if /\d/.test(char)
      number = addNumber(memo, number)
    else if /\w/.test(char)
      number = addLetter(memo, number)
    else
      memo.push(char)
    memo
  , [])

  addCheckDigit(result)
  result.join('')

module.exports.generate = generate
