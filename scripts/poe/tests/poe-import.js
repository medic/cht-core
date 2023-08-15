const poe = require('../lib/poe');
const post = require('../lib/post');
const {readStream} = require('../lib/read');
const {validTranslations} = require('../lib/validate');

jest.mock('fs');
jest.mock('../lib/post');
jest.mock('../lib/read');
jest.mock('../lib/validate');

const importArg = {
  id: '123',
  file: 'translations/messages-en.properties'
};

const response = JSON.stringify({result: {total: 177}, response: {code: '200'}});

const expectedOptions = {
  formData: {
    file: undefined, // this is ok since we are not mocking the stream.
    id: '123',
    language: 'en'
  },
  headers: {
    'Content-Type': 'multipart/form-data; charset=UTF-8'
  },
  'uri': 'http://poe/projects/upload'
};

describe('poe', () => {
  test('import', async () => {
    process = {
      cwd: () => '/Users/simon',
      env: {POE_API_URL: 'http://poe'}
    };
    console = {
      log: jest.fn()
    };
    validTranslations.mockResolvedValueOnce(true);
    post.mockResolvedValueOnce({body: response});
    await poe.upload(importArg);
    expect(readStream).toHaveBeenCalledWith(
      '/Users/simon/translations/messages-en.properties'
    );
    expect(post).toHaveBeenCalledWith(expectedOptions);
    expect(console.log.mock.calls).toEqual([
      ['en'],
      [{total: 177}],
      ['Slack channel not defined (.env). Unable to notify.']
    ]);
  });
});
