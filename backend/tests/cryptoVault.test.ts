import { describe, it, expect } from 'vitest';
import { encryptPayload, decryptPayload, generateBlindIndex, canonicalizeJson, computeCanonicalHash } from '../src/utils/cryptoVault.js';

describe('CryptoVault Cryptographic Primitives', () => {
  it('encrypts and decrypts payload correctly with AES-256-GCM', () => {
    const sensitiveExamData = {
      course: 'Data Structures',
      question: 'Explain Dijkstra algorithm with a graph example',
      marks: 10,
      bloom: 'L3_APPLY'
    };

    const encrypted = encryptPayload(sensitiveExamData);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toHaveLength(24); // 12 bytes hex
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes hex

    const decrypted = decryptPayload(encrypted);
    expect(decrypted).toEqual(sensitiveExamData);
  });

  it('fails decryption if ciphertext or authTag is tampered with', () => {
    const encrypted = encryptPayload('Confidential Question Paper Content');
    // Tamper with the last character of ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.endsWith('0') ? '1' : '0')
    };

    expect(() => decryptPayload(tampered)).toThrow();
  });

  it('generates consistent HMAC-SHA256 blind index for exact match search', () => {
    const query1 = 'Computer Networks';
    const query2 = '  computer networks  '; // different casing and whitespace
    const index1 = generateBlindIndex(query1);
    const index2 = generateBlindIndex(query2);

    expect(index1).toBe(index2);
    expect(index1).toHaveLength(64); // 32 bytes hex
  });

  it('produces deterministic RFC 8785 canonical JSON regardless of key ordering', () => {
    const objA = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const objB = { a: 1, c: { x: 10, y: 20 }, b: 2 };

    const canonicalA = canonicalizeJson(objA);
    const canonicalB = canonicalizeJson(objB);

    expect(canonicalA).toBe(canonicalB);
    expect(computeCanonicalHash(objA)).toBe(computeCanonicalHash(objB));
  });
});
