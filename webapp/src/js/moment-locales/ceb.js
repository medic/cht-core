//! moment.js locale configuration
//! locale : Illonggo (Philippines) [ceb]
//! author : Joy Kimmel : https:/github.com/joymkimmel

const moment = require('moment');
moment.defineLocale('ceb', {
  months: 'Enero_Pebrero_Marso_Abril_Mayo_Hunyo_Hulyo_Agosto_Setyembre_Oktubre_Nobyembre_Disyembre'.split(
    '_'
  ),
  monthsShort: 'Ene_Peb_Mar_Abr_May_Hun_Hul_Ago_Set_Okt_Nob_Dis'.split('_'),
  weekdays: 'Domingo_Lunes_Martes_Miyerkules_Huwebes_Biyernes_Sabado'.split(
    '_'
  ),
  weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
  weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'MM/D/YYYY',
    LL: 'MMMM D, YYYY',
    LLL: 'MMMM D, YYYY HH:mm',
    LLLL: 'dddd, MMMM DD, YYYY HH:mm',
  },
  calendar: {
    sameDay: 'LT [karon nga adlaw]',
    nextDay: '[sunod nga adlaw] LT',
    nextWeek: 'LT [sunod nga semana] dddd',
    lastDay: 'LT [gahapon]',
    lastWeek: 'LT [niagi nga semana] dddd',
    sameElse: 'L',
  },
  relativeTime: {
    future: 'sa sulod sa %s',
    past: '%s ang niagi',
    s: 'usa ka segundo',
    ss: '%d segundo',
    m: 'usa ka minuto',
    mm: '%d minuto',
    h: 'usa ka oras',
    hh: '%d oras',
    d: 'usa ka adlaw',
    dd: '%d adlaw',
    M: 'usa ka bulan',
    MM: '%d bulan',
    y: 'usa ka tuig',
    yy: '%d tuig',
  },
  dayOfMonthOrdinalParse: /\d{1,2}/,
  ordinal: function (number) {
    return number;
  },
  week: {
    dow: 0, // Sunday is the first day of the week.
    doy: 4, // The week that contains Jan 4th is the first week of the year.
  },
});
