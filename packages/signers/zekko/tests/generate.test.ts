import { describe, it, expect } from "vitest";
import { ZekkoSigner } from "../src";

describe("Zekko address generate", () => {
  const MNEMONIC = {
    mnemonic:
      "vault grant math damage slight live equip turtle taxi prize phrase notice",
  };

  it("should generate Zekko addresses correctly", async () => {
    const signer = new ZekkoSigner();

    let keypair = await signer.generate(MNEMONIC, "m/44'/1409'/0'/0'/0");
    expect(keypair.address).match(/^zk1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/);
    expect(keypair.publicKey).toHaveLength(66);
    expect(keypair.privateKey).toHaveLength(130);

    keypair = await signer.generate(MNEMONIC, "m/44'/1409'/0'/0'/1");
    expect(keypair.address).match(/^zk1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/);
    expect(keypair.address).not.toEqual(
      (await signer.generate(MNEMONIC, "m/44'/1409'/0'/0'/0")).address,
    );
  });
});

describe("Zekko address generate with extraword", () => {
  const MNEMONIC = {
    mnemonic:
      "maximum hurt want daring rail alley ripple attract winter stay math piano",
    extraWord: "i am enkrypt",
  };

  it("should generate stable Zekko address", async () => {
    const signer = new ZekkoSigner();
    const keypairA = await signer.generate(MNEMONIC, "m/44'/1409'/0'/0'/0");
    const keypairB = await signer.generate(MNEMONIC, "m/44'/1409'/0'/0'/0");

    expect(keypairA.address).toEqual(keypairB.address);
    expect(keypairA.publicKey).toEqual(keypairB.publicKey);
    expect(keypairA.privateKey).toEqual(keypairB.privateKey);
  });
});
