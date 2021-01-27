//! moment.js locale configuration
//! locale : Illonggo (Philippines) [hil]
//! author : Joy Kimmel : https:/github.com/joymkimmel

const moment = require('moment');
moment.defineLocale('hil', {
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
    sameDay: 'LT [subong nga adlaw]',
    nextDay: '[sunod nga adlaw] LT',
    nextWeek: 'LT [sunod nga semana] dddd',
    lastDay: 'LT [kahapon]',
    lastWeek: 'LT [nagligad nga semana] dddd',
    sameElse: 'L',
  },
  relativeTime: {
    future: 'sa sulod sang %s',
    past: '%s ang nagligad',
    s: 'isa ka segundo',
    ss: '%d segundo',
    m: 'isa ka minuto',
    mm: '%d minuto',
    h: 'isa ka oras',
    hh: '%d oras',
    d: 'isa ka adlaw',
    dd: '%d adlaw',
    M: 'isa ka bulan',
    MM: '%d bulan',
    y: 'isa ka tuig',
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
