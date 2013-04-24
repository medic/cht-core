getFirstWeek = (year) ->
  end = new Date(year, 0, 1)
  end.setHours(0, 0, 0, 0)
  days = 0
  while ++days < 4 or end.getDay() isnt 6
    end.setDate(end.getDate() + 1)
  start = new Date(end.getTime())
  start.setDate(start.getDate() - 6)
  start

calculate = (date = new Date(), marker) ->
  date.setHours(0, 0, 0, 0)

  firstWeekThisYear = getFirstWeek(date.getFullYear())
  firstWeekNextYear = getFirstWeek(date.getFullYear() + 1)

  marker ?= new Date(date.getTime())
  marker.setMonth(0, 1)
  week = 0
  while marker < date
    day = marker.getDay()
    week++ if day is 6
    marker.setDate(marker.getDate() + 1)
  if week is 0
    if date >= firstWeekThisYear
      week: 1
      year: date.getFullYear()
    else
      marker.setFullYear(date.getFullYear() - 1, 0, 1)
      calculate(date, marker)
  else
    if week >= 51 and date >= firstWeekNextYear
      week: 1
      year: date.getFullYear() + 1
    else
      week: week + 1
      year: date.getFullYear() - (if date < firstWeekThisYear then 1 else 0)

module.exports = calculate
