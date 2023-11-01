const utils = require('@utils');

describe('rate limit', () => {

  const requestThat401s = () => utils.request({ path: '/medic/123', noAuth: true });

  it('limits the 11th failed login request from the same IP', async () => {

    const requests = Array.from(Array(10), () => {
      return requestThat401s().catch(() => {});
    });
    await Promise.all(requests);

    try {
      await requestThat401s();
      expect.fail('should have been rate limited');
    } catch (e) {
      expect(e.statusCode).to.equal(429);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 10000);
    });

    try {
      await requestThat401s();
      expect.fail('should have rejected due to no auth');
    } catch (e) {
      // the rate limit period has passed, so we're back to 401s
      expect(e.statusCode).to.equal(401);
    }
  });
 
});
