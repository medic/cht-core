const chai = require('chai');
const { ReadableStream } = require('node:stream/web');

const service = require('../../../../src/services/offline-data-bundle/age');

// The service only ever decrypts, so the test plays the device's part and encrypts with the
// library directly.
const encryptTo = async (recipient, plaintext) => {
  const { Encrypter } = await import('age-encryption'); // eslint-disable-line n/no-extraneous-import
  const encrypter = new Encrypter();
  encrypter.addRecipient(recipient);
  return encrypter.encrypt(plaintext);
};

// Reads a web ReadableStream of bytes back into a single Buffer.
const collect = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const streamOf = (buffer) => new ReadableStream({
  start: (controller) => {
    controller.enqueue(new Uint8Array(buffer));
    controller.close();
  },
});

describe('offline-data-bundle age service', () => {
  it('generates an identity and its recipient', async () => {
    const identity = await service.generateIdentity();
    chai.expect(identity).to.match(/^AGE-SECRET-KEY-1/);
    chai.expect(await service.identityToRecipient(identity)).to.match(/^age1/);
  });

  describe('decryptStream', () => {
    it('decrypts a stream encrypted to the matching identity', async () => {
      const identity = await service.generateIdentity();
      const recipient = await service.identityToRecipient(identity);
      const ciphertext = await encryptTo(recipient, Buffer.from('hello bundle', 'utf8'));

      const decrypted = await collect(await service.decryptStream(identity, streamOf(ciphertext)));

      chai.expect(decrypted.toString('utf8')).to.equal('hello bundle');
    });

    it('fails for an identity the payload was not encrypted to', async () => {
      const recipient = await service.identityToRecipient(await service.generateIdentity());
      const otherIdentity = await service.generateIdentity();
      const ciphertext = await encryptTo(recipient, Buffer.from('secret', 'utf8'));

      let threw = false;
      try {
        await collect(await service.decryptStream(otherIdentity, streamOf(ciphertext)));
      } catch {
        threw = true;
      }
      chai.expect(threw).to.be.true;
    });
  });
});
