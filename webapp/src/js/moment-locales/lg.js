/* 
  Moment.js locale definition for Luganda
*/
const moment = require('moment');
moment.defineLocale('lg', {
  months: `Ogusooka_Ogwokubiri_Ogwokusatu_Ogwokuna_Ogwokutaano_Ogwomukaaga_Ogwomusanvu_Ogwomunaana_
    Ogwomwenda_Ogwekkumi_Ogwekkuminogumu_Ogwekkumineebiri`.split('_'),
  monthsShort: 'Og1_Ogw2_Ogw3_Ogw4_Ogw5_Ogw6_Ogw7_Ogw8_Ogw9_Ogw10_Ogw11_Ogw12'.split('_'),
  weekdays: 'Sabbiiti_Balaza_Lwakubiri_Lwakusatu_Lwakuna_Lwakutaano_Lwamukaaga'.split('_'),
  weekdaysShort: 'Sab_Bal_Lw2_Lw3_Lw4_Lw5_Lw6'.split('_'),
  weekdaysMin: 'Sab_Bal_Lw2_Lw3_Lw4_Lw5_Lw6'.split('_'),
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D MMMM YYYY',
    LLL: 'D MMMM YYYY HH:mm',
    LLLL: 'dddd, D MMMM YYYY HH:mm'
  },
  calendar: {
    sameDay: '[Leero ku] LT',
    nextDay: '[Enkya ku] LT',
    nextWeek: 'dddd [ku] LT',
    lastDay: '[Eggulo ku] LT',
    lastWeek: 'dddd [sabbiiti ewedde ku] LT',
    sameElse: 'L'
  },
  relativeTime: {
    future: 'mu %s',
    past: '%s emabega',
    s: 'mu butikitiki butono',
    ss: 'butikitiki %d',
    m: 'dakika emu',
    mm: 'dakika %d',
    h: 'ssawa emu',
    hh: 'ssawa %d',
    d: 'lunaku lumu',
    dd: 'naku %d',
    M: 'mwezi gumu',
    MM: 'myezi %d',
    y: 'mwaka gumu',
    yy: 'myaka %d'
  },
  dayOfMonthOrdinalParse: /\d{1,2}/,
  ordinal: '%d',
  week: {
    dow: 1, // Monday is the first day of the week.
    doy: 4  // The week that contains Jan 4th is the first week of the year.
  }
});
