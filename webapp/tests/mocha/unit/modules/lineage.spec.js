const assert = require('chai').assert;
const format = require('../../../../src/js/modules/format');

let $state;

beforeEach(() => {
  $state = { href: (route, params) => `${route}?id=${params.id}` };
});

describe('lineage', () => {

  describe('array', () => {

    it('returns empty ol when given an empty array', () => {
      const given = [];
      const actual = format.lineage(given);
      assert.equal(actual, '<ol class="horizontal lineage"></ol>');
    });

    it('returns empty ol when given an array with empty items', () => {
      const given = ['', null];
      const actual = format.lineage(given);
      assert.equal(actual, '<ol class="horizontal lineage"></ol>');
    });

    it('returns list items for each given string', () => {
      const given = ['clinic', 'district'];
      const actual = format.lineage(given);
      assert.equal(actual, '<ol class="horizontal lineage"><li>clinic</li><li>district</li></ol>');
    });

    it('escapes each given string', () => {
      const given = ['<b>clinic</b>', '<script>alert("pwned")</script>district'];
      const actual = format.lineage(given);
      assert.equal(actual, '<ol class="horizontal lineage"><li>&lt;b&gt;clinic&lt;/b&gt;</li><li>&lt;script&gt;' +
        'alert(&quot;pwned&quot;)&lt;/script&gt;district</li></ol>');
    });

    it('returns links for every given entity', () => {
      const given = [
        { _id: 'a', name: 'clinic' },
        { _id: 'b', contact: { phone: '+123' } }
      ];
      const actual = format.lineage(given, $state);
      assert.equal(actual, '<ol class="horizontal lineage"><li><a href="contacts.detail?id=a">clinic</a></li>' +
        '<li><a href="contacts.detail?id=b">+123</a></li></ol>');
    });

    it('escapes entity names', () => {
      const given = [
        { _id: 'a', name: '<b>clinic</b>' },
        { _id: 'b', contact: { phone: '<blink>+123</blink>' } }
      ];
      const actual = format.lineage(given, $state);
      assert.equal(actual, '<ol class="horizontal lineage">' +
        '<li><a href="contacts.detail?id=a">&lt;b&gt;clinic&lt;/b&gt;</a></li>' +
        '<li><a href="contacts.detail?id=b">&lt;blink&gt;+123&lt;/blink&gt;</a></li></ol>');
    });

  });

  describe('entity', () => {

    it('iterates over parents to build up lineage', () => {
      const given = {
        _id: 'a',
        name: 'clinic',
        parent: {
          name: 'centre',
          parent: {
            _id: 'c',
            contact: {
              phone: '+456'
            }
          }
        }
      };
      const actual = format.lineage(given, $state);
      assert.equal(actual, '<ol class="horizontal lineage"><li><a href="contacts.detail?id=a">clinic</a></li>' +
        '<li>centre</li><li><a href="contacts.detail?id=c">+456</a></li></ol>');
    });

  });

});
