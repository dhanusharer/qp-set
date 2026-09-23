import crypto from "crypto";

/**
 * Shamir's Secret Sharing (SSS) over Galois Field GF(2^8).
 * Provides mathematical information-theoretic security:
 * Any k (threshold) shares can reconstruct the master secret.
 * Any k-1 shares reveal strictly zero information about the secret.
 */

// GF(256) Generator and Lookup Tables with irreducible polynomial 0x11b (x^8 + x^4 + x^3 + x + 1)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x = x ^ (x << 1);
    if (x & 0x100) {
      x ^= 0x11b; // Rijndael polynomial
    }
  }
  LOG[0] = 0; // Special case (log of 0 is undefined, handled in mul)
})();

function gfAdd(a: number, b: number): number {
  return a ^ b;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero in GF(256)");
  if (a === 0) return 0;
  return EXP[(LOG[a] - LOG[b] + 255) % 255];
}

export interface SecretShare {
  x: number; // Share evaluation point (1..255)
  dataHex: string; // Hex representation of evaluated bytes
}

/**
 * Split arbitrary secret into n shares with threshold k.
 */
export function splitSecret(secret: string | Buffer, totalShares: number = 5, threshold: number = 3): SecretShare[] {
  if (threshold > totalShares) throw new Error("Threshold cannot exceed total shares");
  if (totalShares > 255) throw new Error("GF(256) supports maximum 255 shares");
  if (threshold < 2) throw new Error("Threshold must be at least 2");

  const secretBytes = typeof secret === "string" ? Buffer.from(secret, "utf8") : secret;
  const shares: { x: number; bytes: Uint8Array }[] = [];

  for (let i = 1; i <= totalShares; i++) {
    shares.push({ x: i, bytes: new Uint8Array(secretBytes.length) });
  }

  // For each byte in secret, generate random polynomial of degree (threshold - 1)
  // f(x) = secret + a_1*x + a_2*x^2 + ... + a_{k-1}*x^{k-1}
  const coefficients = new Uint8Array(threshold);

  for (let byteIdx = 0; byteIdx < secretBytes.length; byteIdx++) {
    coefficients[0] = secretBytes[byteIdx];
    for (let c = 1; c < threshold; c++) {
      coefficients[c] = crypto.randomBytes(1)[0];
    }

    // Evaluate f(x) for each share x = 1..totalShares
    for (let s = 0; s < totalShares; s++) {
      const x = shares[s].x;
      let val = coefficients[0];
      let xPower = 1;

      for (let c = 1; c < threshold; c++) {
        xPower = gfMul(xPower, x);
        val = gfAdd(val, gfMul(coefficients[c], xPower));
      }

      shares[s].bytes[byteIdx] = val;
    }
  }

  return shares.map((s) => ({
    x: s.x,
    dataHex: Buffer.from(s.bytes).toString("hex")
  }));
}

/**
 * Reconstruct master secret using Lagrange polynomial interpolation at x = 0.
 */
export function combineShares(shares: SecretShare[]): string {
  if (!shares || shares.length === 0) throw new Error("No shares provided");

  const xCoords = shares.map((s) => s.x);
  const uniqueX = new Set(xCoords);
  if (uniqueX.size !== shares.length) throw new Error("Duplicate share x coordinates detected");

  const shareBuffers = shares.map((s) => Buffer.from(s.dataHex, "hex"));
  const byteLength = shareBuffers[0].length;

  for (const b of shareBuffers) {
    if (b.length !== byteLength) throw new Error("Mismatched share byte lengths");
  }

  const k = shares.length;
  const reconstructed = Buffer.alloc(byteLength);

  // Lagrange basis polynomial evaluation at x = 0:
  // L_i(0) = \prod_{j \neq i} \frac{0 - x_j}{x_i - x_j} = \prod_{j \neq i} \frac{x_j}{x_i \oplus x_j}
  const lagrangeWeights: number[] = new Array(k);

  for (let i = 0; i < k; i++) {
    let weight = 1;
    const xi = xCoords[i];
    for (let j = 0; j < k; j++) {
      if (i === j) continue;
      const xj = xCoords[j];
      const num = xj;
      const den = gfAdd(xi, xj);
      const factor = gfDiv(num, den);
      weight = gfMul(weight, factor);
    }
    lagrangeWeights[i] = weight;
  }

  // Reconstruct each byte
  for (let byteIdx = 0; byteIdx < byteLength; byteIdx++) {
    let secretByte = 0;
    for (let i = 0; i < k; i++) {
      const shareVal = shareBuffers[i][byteIdx];
      const term = gfMul(shareVal, lagrangeWeights[i]);
      secretByte = gfAdd(secretByte, term);
    }
    reconstructed[byteIdx] = secretByte;
  }

  return reconstructed.toString("utf8");
}
