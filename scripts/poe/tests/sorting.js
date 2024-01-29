const path = require('path');
const fs = require('fs');
const {save} = require('../lib/utils');
const get = require('../lib/get');
const fPath = path.resolve(__dirname, 'translations', 'sorting-en.properties');

jest.mock('../lib/get');

afterEach(() => {
  fs.unlinkSync(fPath);
});

describe('save', () => {
  test('sorting', async () => {
    get.mockResolvedValueOnce({body: 'yesterday:yes\ntoday:no'});
    await save('http://poe', fPath);
    const content = fs.readFileSync(fPath).toString();
    const lines = content.split('\n');
    expect(lines[0]).toEqual('today:no');
    expect(lines[1]).toEqual('yesterday:yes');
  });
});
