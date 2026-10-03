import { BlockList, isIP } from 'node:net';

/**
 * Address ranges the link-preview fetcher must never connect to: loopback,
 * private, link-local (cloud metadata lives at 169.254.169.254), CGNAT,
 * multicast, documentation and other reserved space.
 */
const NON_PUBLIC_RANGES = new BlockList();

const IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const IPV6_RANGES: Array<[string, number]> = [
  // Unspecified, loopback and the deprecated IPv4-compatible block.
  ['::', 96],
  // NAT64 / 6to4 / Teredo tunnel space can embed private IPv4 addresses.
  ['64:ff9b::', 96],
  ['2001::', 32],
  ['2002::', 16],
  ['100::', 64],
  ['2001:db8::', 32],
  // Unique-local, link-local, site-local and multicast.
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
];

for (const [network, prefix] of IPV4_RANGES) {
  NON_PUBLIC_RANGES.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of IPV6_RANGES) {
  NON_PUBLIC_RANGES.addSubnet(network, prefix, 'ipv6');
}

/** True only for a syntactically valid IP that is routable on the public internet. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  // BlockList also matches IPv4-mapped IPv6 (::ffff:10.0.0.1) against the IPv4 rules.
  return !NON_PUBLIC_RANGES.check(address, family === 4 ? 'ipv4' : 'ipv6');
}
