/* eslint-disable no-console */
module.exports = {
  init: function(target, prefix, suffix) {
    let runningTotal = 0;
    let startTime = Date.now();

    function print() {
      let bar = '', i;

      const timeTaken = Date.now() - startTime;
      const timeLeft = Math.floor(timeTaken * (target - runningTotal) / (runningTotal * 1000));

      const format = message => message
          .replace('{{n}}', runningTotal)
          .replace('{{N}}', target)
          .replace('{{s}}', () => roundAndPad(timeLeft % 60))
          .replace('{{m}}', () => roundAndPad(timeLeft / 60, 1))
          .replace('{{%}}', () => roundAndPad(runningTotal * 100 / target, 3, ' ') + '%');

      const fPrefix = prefix ? format(prefix) : '';
      const fSuffix = suffix ? format(suffix) : '';

      const barTotal = process.stdout.columns - fPrefix.length - fSuffix.length - 3;
      const pBarLen = Math.floor(runningTotal * barTotal / target);

      for(i=pBarLen; i>0; --i) bar += '█';

      for(i=barTotal-pBarLen; i>0; --i) bar += ' ';

      process.stdout.write(`\r${fPrefix}[${bar}]${fSuffix}`);
    }

    print();

    return {
      increment: d => { runningTotal += d; print(); },
      done: () => { runningTotal = target; print(); console.log(); },
      cancel: () => { console.log(); },
    };
  },
};

function roundAndPad(n, digits, padWith) {
  if(typeof digits === 'undefined') digits = 2;
  if(typeof padWith === 'undefined') padWith = '0';
  n = Math.round(n);
  let s;
  if(Number.isFinite(n)) s = n.toString();
  else {
    padWith = '?';
    s = '';
  }
  while(s.length < digits) s = padWith + s;
  return s;
}
