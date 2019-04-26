const poe = require('../lib/poe');
const post = require('../lib/post');
const {validDirectory} = require('../lib/validate');

jest.mock('fs');
jest.mock('../lib/post');
jest.mock('../lib/utils');
jest.mock('../lib/validate');

const exportArg = {
  id: '123',
  language: 'all',
  type: 'properties',
  file: 'poe/translations',
  tags: '3.4.0'
};

const langsResponse = JSON.stringify({result: {languages: [{code: 'en'}]}});
const filesResponse = JSON.stringify({response: {code: '200'}, result: []});

const expectedLangOptions = {
  body: 'id=123&language=en&type=properties&tags=3.4.0',
  headers: {
    'Content-Length': 45,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  url: 'http://poe/projects/export'
};

describe('poe', () => {
  test('download', async () => {
    process = {
      cwd: () => '/Users/simon',
      env: {POE_API_URL: 'http://poe'}
    };
    console = {
      log: jest.fn()
    };
    validDirectory.mockResolvedValueOnce(true);
    post.mockResolvedValueOnce({body: langsResponse});
    post.mockResolvedValueOnce({body: filesResponse});
    await poe.download(exportArg);
    expect(post).toHaveBeenCalledWith(expectedLangOptions);
    expect(console.log).toHaveBeenCalledWith(
      '\ten saved to /Users/simon/poe/translations/messages-en.properties');
  });
});
