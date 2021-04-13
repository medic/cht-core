module.exports = js =>
  js.split('\n')
    .map(s =>
      s.trim()
       .replace(/\s*\/\/.*/, '') // single-line comments (like this one)
    ).join('')
        .replace(/\s*\/\*(?:(?!\*\/).)*\*\/\s*/g, '') /* this kind of comment */
        .replace(/function \(/g, 'function(') // different node versions do function.toString() differently :\
        ;
