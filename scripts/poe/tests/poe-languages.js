const poe = require('../lib/poe');
const post = require('../lib/post');

jest.mock('../lib/post');

const arg = { id1: '123', id2: '456' };
const response = JSON.stringify({result: {languages: [{code: 'en'}]}});
const expectedOptions = {
  body: 'id1=123&id2=456',
  headers: {
    'Content-Length': 15,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  url: 'http://poe/languages/list'
};

describe('poe', () => {
  beforeEach(() => {
    console = { log: jest.fn() };
    process = { env: {POE_API_URL: 'http://poe'} };
  });

  test('languages', async () => {
    post.mockResolvedValueOnce({body: response});
    await poe.languages(arg);
    expect(post).toHaveBeenCalledWith(expectedOptions);
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});
