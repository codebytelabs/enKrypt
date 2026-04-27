import { describe, it, expect } from "vitest";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { bufferToHex } from "@enkryptcom/utils";
import { ZekkoSigner } from "../src";

describe("Zekko signing", () => {
  const MNEMONIC = {
    mnemonic:
      "vault grant math damage slight live equip turtle taxi prize phrase notice",
  };

  const msg =
    "Everything should be made as simple as possible, but not simpler.";
  const msgHash = bufferToHex(blake2AsU8a(msg));

  it("should sign and verify correctly", async () => {
    const signer = new ZekkoSigner();
    const keypair = await signer.generate(MNEMONIC, "m/44'/1409'/0'/0'/0");
    const signature = await signer.sign(msgHash, keypair);

    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(0);

    const isValid = await signer.verify(msgHash, signature, keypair.publicKey);
    expect(isValid).toBe(true);
  });

  it("should reject invalid signatures", async () => {
    const signer = new ZekkoSigner();
    const keypair = await signer.generate(MNEMONIC, "m/44'/1409'/0'/0'/0");
    const invalidSignature = `0x${"0".repeat(128)}`;
    const isValid = await signer.verify(
      msgHash,
      invalidSignature,
      keypair.publicKey,
    );

    expect(isValid).toBe(false);
  });
});
