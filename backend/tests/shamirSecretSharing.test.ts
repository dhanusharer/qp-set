import { describe, expect, it } from "vitest";
import { splitSecret, combineShares } from "../src/utils/shamirSecretSharing.js";

describe("Shamir's Secret Sharing (SSS) GF(256) Primitives", () => {
  const secretKey = "amcec-strongroom-master-paper-unsealing-key-2026!";

  it("splits secret into 5 shares and reconstructs with any 3 shares (threshold)", () => {
    const shares = splitSecret(secretKey, 5, 3);
    expect(shares).toHaveLength(5);

    // Combination 1: Shares 0, 1, 2
    const reconstructed1 = combineShares([shares[0], shares[1], shares[2]]);
    expect(reconstructed1).toBe(secretKey);

    // Combination 2: Shares 1, 3, 4
    const reconstructed2 = combineShares([shares[1], shares[3], shares[4]]);
    expect(reconstructed2).toBe(secretKey);

    // Combination 3: Shares 0, 2, 4
    const reconstructed3 = combineShares([shares[0], shares[2], shares[4]]);
    expect(reconstructed3).toBe(secretKey);
  });

  it("reconstructs successfully with 4 or 5 shares", () => {
    const shares = splitSecret(secretKey, 5, 3);
    const reconstructedAll = combineShares(shares);
    expect(reconstructedAll).toBe(secretKey);
  });

  it("fails to reconstruct with only 2 shares (less than threshold of 3)", () => {
    const shares = splitSecret(secretKey, 5, 3);
    // 2 shares will NOT produce the original secret in polynomial interpolation
    const wrong = combineShares([shares[0], shares[1]]);
    expect(wrong).not.toBe(secretKey);
  });
});
