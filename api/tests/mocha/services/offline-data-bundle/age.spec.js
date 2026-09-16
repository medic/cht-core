const chai = require('chai');
const { ReadableStream } = require('node:stream/web');

const service = require('../../../../src/services/offline-data-bundle/age');

describe('offline-data-bundle age service', () => {
  describe('isValidRecipient', () => {
    it('returns true for a real age recipient', async () => {
      const identity = await service.generateIdentity();
      const recipient = await service.identityToRecipient(identity);
      chai.expect(await service.isValidRecipient(recipient)).to.be.true;
    });

    it('returns false for garbage input', async () => {
      chai.expect(await service.isValidRecipient('not-a-recipient')).to.be.false;
    });

    it('returns false for an empty string', async () => {
      chai.expect(await service.isValidRecipient('')).to.be.false;
    });
  });

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

  describe('encrypt / decrypt round-trip', () => {
    it('encrypts to a recipient and decrypts the stream with the matching identity', async () => {
      const identity = await service.generateIdentity();
      const recipient = await service.identityToRecipient(identity);
      const plaintext = Buffer.from('hello checkpoint', 'utf8');

      const ciphertext = await service.encrypt(recipient, plaintext);
      const decrypted = await collect(await service.decryptStream(identity, streamOf(ciphertext)));

      chai.expect(decrypted.toString('utf8')).to.equal('hello checkpoint');
    });

    it('produces ciphertext a non-matching identity cannot decrypt', async () => {
      const recipient = await service.identityToRecipient(await service.generateIdentity());
      const otherIdentity = await service.generateIdentity();
      const ciphertext = await service.encrypt(recipient, Buffer.from('secret', 'utf8'));

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
