const sinon = require('sinon');
const { expect } = require('chai');
const config = require('../../src/config');
const { generateManifest } = require('../../src/p2p/scope-manifest');

describe('P2P scope-manifest', () => {
  beforeEach(() => {
    sinon.stub(config, 'get');
  });

  afterEach(() => sinon.restore());

  it('should throw when user settings has no facility_id', () => {
    expect(() => generateManifest({ roles: ['chw'] })).to.throw('facility_id');
    expect(() => generateManifest(null)).to.throw('facility_id');
  });

  it('should generate manifest with correct facility_subtree_root', () => {
    config.get.withArgs('replication_depth').returns([]);

    const manifest = generateManifest({
      facility_id: 'clinic-1a',
      roles: ['chw'],
    });

    expect(manifest.facility_subtree_root).to.equal('clinic-1a');
  });

  it('should calculate replication_depth from role settings', () => {
    config.get.withArgs('replication_depth').returns([
      { role: 'chw', depth: '2' },
      { role: 'chw_supervisor', depth: '1' },
    ]);

    const manifest = generateManifest({
      facility_id: 'clinic-1a',
      roles: ['chw'],
    });

    expect(manifest.replication_depth).to.equal(2);
  });

  it('should use highest depth when user has multiple roles', () => {
    config.get.withArgs('replication_depth').returns([
      { role: 'chw', depth: '2' },
      { role: 'chw_supervisor', depth: '3' },
    ]);

    const manifest = generateManifest({
      facility_id: 'hc-1',
      roles: ['chw', 'chw_supervisor'],
    });

    expect(manifest.replication_depth).to.equal(3);
  });

  it('should default to depth 0 when no matching role found', () => {
    config.get.withArgs('replication_depth').returns([
      { role: 'chw', depth: '2' },
    ]);

    const manifest = generateManifest({
      facility_id: 'hc-1',
      roles: ['national_admin'],
    });

    expect(manifest.replication_depth).to.equal(0);
  });

  it('should include default shared_doc_types', () => {
    config.get.withArgs('replication_depth').returns([]);

    const manifest = generateManifest({
      facility_id: 'clinic-1a',
      roles: ['chw'],
    });

    expect(manifest.shared_doc_types).to.include('person');
    expect(manifest.shared_doc_types).to.include('clinic');
    expect(manifest.shared_doc_types).to.include('data_record');
    expect(manifest.shared_doc_types).to.include('task');
    expect(manifest.shared_doc_types).to.include('target');
  });

  it('should include scope_version as deterministic hash string', () => {
    config.get.withArgs('replication_depth').returns([]);

    const manifest1 = generateManifest({
      facility_id: 'clinic-1a',
      roles: ['chw'],
    });

    const manifest2 = generateManifest({
      facility_id: 'clinic-1a',
      roles: ['chw'],
    });

    expect(manifest1.scope_version).to.be.a('string');
    expect(manifest1.scope_version).to.have.lengthOf(16);
    // Deterministic: same inputs produce same hash
    expect(manifest1.scope_version).to.equal(manifest2.scope_version);
  });

  it('should produce different scope_version for different facilities', () => {
    config.get.withArgs('replication_depth').returns([]);

    const manifest1 = generateManifest({
      facility_id: 'clinic-1a',
      roles: ['chw'],
    });

    const manifest2 = generateManifest({
      facility_id: 'clinic-2b',
      roles: ['chw'],
    });

    expect(manifest1.scope_version).to.not.equal(manifest2.scope_version);
  });
});
