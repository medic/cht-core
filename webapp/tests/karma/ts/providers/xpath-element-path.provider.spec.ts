import { expect } from 'chai';
import { Xpath } from '@mm-providers/xpath-element-path.provider';

const parseXml = (xml: string): XMLDocument => new DOMParser().parseFromString(xml, 'text/xml');

const getElement = (xml: string, selector: string): Element => {
  const element = parseXml(xml).querySelector(selector);
  if (!element) {
    throw new Error(`No element found for selector [${selector}]`);
  }
  return element;
};

describe('Xpath provider', () => {
  describe('getElementXPath', () => {
    it('returns the path of the document element', () => {
      const doc = parseXml('<data><name>Sally</name></data>');
      expect(Xpath.getElementXPath(doc.documentElement)).to.equal('/data');
    });

    it('returns the path of a nested element', () => {
      const xml = '<data><address><geo><lat>-47.15</lat></geo></address></data>';
      expect(Xpath.getElementXPath(getElement(xml, 'lat'))).to.equal('/data/address/geo/lat');
    });

    it('includes the namespace prefix', () => {
      const xml = '<data xmlns:my="http://example.com/my"><my:group><my:name>Sally</my:name></my:group></data>';
      expect(Xpath.getElementXPath(getElement(xml, 'name'))).to.equal('/data/my:group/my:name');
    });

    it('returns the same path for repeated elements', () => {
      const xml = '<data><child><name>a</name></child><child><name>b</name></child></data>';
      const [first, second] = Array.from(parseXml(xml).querySelectorAll('name'));
      expect(Xpath.getElementXPath(first)).to.equal('/data/child/name');
      expect(Xpath.getElementXPath(second)).to.equal('/data/child/name');
    });
  });

  describe('getElementPositionalXPath', () => {
    it('returns the path of the document element', () => {
      const doc = parseXml('<data><name>Sally</name></data>');
      expect(Xpath.getElementPositionalXPath(doc.documentElement, ['/data'])).to.equal('/data[1]');
    });

    it('adds no positions when there are no repeat paths', () => {
      const xml = '<data><child><name>a</name></child><child><name>b</name></child></data>';
      const [first, second] = Array.from(parseXml(xml).querySelectorAll('name'));

      expect(Xpath.getElementPositionalXPath(first)).to.equal('/data/child/name');
      expect(Xpath.getElementPositionalXPath(second)).to.equal('/data/child/name');
    });

    it('adds the position of each repeat instance', () => {
      const xml = `
        <data>
          <child><name>a</name></child>
          <child><name>b</name></child>
          <child><name>c</name></child>
        </data>`;
      const names = Array.from(parseXml(xml).querySelectorAll('name'));

      const paths = names.map(name => Xpath.getElementPositionalXPath(name, ['/data/child']));

      expect(paths).to.deep.equal([
        '/data/child[1]/name',
        '/data/child[2]/name',
        '/data/child[3]/name',
      ]);
    });

    it('adds the position of a repeat instance that is the only instance', () => {
      const xml = '<data><child><name>a</name></child></data>';

      const path = Xpath.getElementPositionalXPath(getElement(xml, 'name'), ['/data/child']);

      expect(path).to.equal('/data/child[1]/name');
    });

    it('adds the position of the repeat instance itself', () => {
      const xml = '<data><child><name>a</name></child><child><name>b</name></child></data>';
      const children = Array.from(parseXml(xml).querySelectorAll('child'));

      const paths = children.map(child => Xpath.getElementPositionalXPath(child, ['/data/child']));

      expect(paths).to.deep.equal(['/data/child[1]', '/data/child[2]']);
    });

    it('adds a position at every level of nested repeats', () => {
      const xml = `
        <data>
          <child>
            <foods><type>ugali</type></foods>
            <foods><type>chapati</type></foods>
          </child>
          <child>
            <foods><type>porridge</type></foods>
          </child>
        </data>`;
      const types = Array.from(parseXml(xml).querySelectorAll('type'));

      const paths = types.map(type => Xpath
        .getElementPositionalXPath(type, ['/data/child', '/data/child/foods']));

      expect(paths).to.deep.equal([
        '/data/child[1]/foods[1]/type',
        '/data/child[1]/foods[2]/type',
        '/data/child[2]/foods[1]/type',
      ]);
    });

    it('adds no position for a repeated element that is not a repeat path', () => {
      const xml = '<data><child><name>a</name></child><child><name>b</name></child></data>';
      const [first, second] = Array.from(parseXml(xml).querySelectorAll('name'));
      const repeatPaths = ['/data/other', '/data/child/name/deeper'];

      expect(Xpath.getElementPositionalXPath(first, repeatPaths)).to.equal('/data/child/name');
      expect(Xpath.getElementPositionalXPath(second, repeatPaths)).to.equal('/data/child/name');
    });

    it('counts only same-named siblings when positioning a repeat instance', () => {
      const xml = `
        <data>
          <other>x</other>
          <child><name>a</name></child>
          <other>y</other>
          <child><name>b</name></child>
        </data>`;
      const names = Array.from(parseXml(xml).querySelectorAll('name'));

      const paths = names.map(name => Xpath.getElementPositionalXPath(name, ['/data/child']));

      expect(paths).to.deep.equal(['/data/child[1]/name', '/data/child[2]/name']);
    });
  });
});
