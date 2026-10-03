import { isPublicAddress } from './address-policy';

describe('isPublicAddress', () => {
  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '2a00:1450:4001:81b::200e',
  ])('allows public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '0.0.0.0',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '64:ff9b::7f00:1',
  ])('blocks non-public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 addresses that wrap private IPv4', () => {
    expect(isPublicAddress('::ffff:127.0.0.1')).toBe(false);
    expect(isPublicAddress('::ffff:10.0.0.1')).toBe(false);
    expect(isPublicAddress('::ffff:169.254.169.254')).toBe(false);
  });

  it('allows IPv4-mapped IPv6 addresses that wrap public IPv4', () => {
    expect(isPublicAddress('::ffff:8.8.8.8')).toBe(true);
  });

  it('rejects strings that are not IP addresses', () => {
    expect(isPublicAddress('localhost')).toBe(false);
    expect(isPublicAddress('example.com')).toBe(false);
    expect(isPublicAddress('')).toBe(false);
    expect(isPublicAddress('999.1.1.1')).toBe(false);
  });
});
