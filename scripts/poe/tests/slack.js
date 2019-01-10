const slack = require('../lib/slack');
const {post} = require('request');

jest.mock('request');

describe('slack', () => {
  test('send', () => {
    post.mockResolvedValueOnce(null);
    slack('someurl').send('hello');
    expect(post).toHaveBeenCalledWith(
      {'json': {'text': 'hello'}, 'url': 'someurl'},
      expect.any(Function)
    );
  });
});
