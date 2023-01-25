/* 
  Moment.js locale definition for Luganda
*/
const moment = require('moment');
moment.defineLocale('lg', {
  months: 'Janwali_Febwali_Marisi_Apuli_Maayi_Juuni_Julaayi_Agusito_Sebuttemba_Okitobba_Novemba_Desemba'.split('_'),
  monthsShort: 'Jan_Feb_Mar_Apu_Maa_Jun_Jul_Agu_Seb_Oki_Nov_Des'.split('_'),
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
    sameDay: '[Leero ku ssawa] LT',
    nextDay: '[Enkya ku ssawa] LT',
    nextWeek: 'dddd [ku ssawa] LT',
    lastDay: '[Eggulo ku ssawa] LT',
    lastWeek: 'dddd [sabbiiti ewedde ku ssawa] LT',
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
