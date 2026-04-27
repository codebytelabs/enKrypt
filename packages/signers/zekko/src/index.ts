import {
  KeyPair,
  MnemonicWithExtraWord,
  SignerInterface,
} from "@enkryptcom/types";
import { bufferToHex, hexToBuffer } from "@enkryptcom/utils";
import { blake3 } from "@noble/hashes/blake3";
import { mnemonicToSeedSync } from "bip39";
import { sign as tweetSign } from "tweetnacl";
import { derivePath } from "./libs/ed25519";

const BECH32M_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32M_CONST = 0x2bc830a3;

export class ZekkoSigner implements SignerInterface {
  async generate(
    mnemonic: MnemonicWithExtraWord,
    derivationPath = "",
  ): Promise<KeyPair> {
    const seed = bufferToHex(
      mnemonicToSeedSync(mnemonic.mnemonic, mnemonic.extraWord),
      true,
    );
    const keys = derivePath(`${derivationPath}'`, seed);
    const keyPair = tweetSign.keyPair.fromSeed(keys.key);
    return {
      address: encodeBech32m("zk", blake3(keyPair.publicKey)),
      privateKey: bufferToHex(keyPair.secretKey),
      publicKey: bufferToHex(keyPair.publicKey),
    };
  }

  async verify(
    msgHash: string,
    sig: string,
    publicKey: string,
  ): Promise<boolean> {
    return tweetSign.detached.verify(
      hexToBuffer(msgHash),
      hexToBuffer(sig),
      hexToBuffer(publicKey),
    );
  }

  async sign(msgHash: string, keyPair: KeyPair): Promise<string> {
    const sig = tweetSign.detached(
      hexToBuffer(msgHash),
      hexToBuffer(keyPair.privateKey),
    );
    return bufferToHex(sig);
  }
}

const encodeBech32m = (hrp: string, bytes: Uint8Array): string => {
  const data = convertBits(bytes, 8, 5, true);
  const checksum = createChecksum(hrp, data);
  const combined = [...data, ...checksum];
  return `${hrp}1${combined.map((value) => BECH32M_CHARSET[value]).join("")}`;
};

const convertBits = (
  bytes: Uint8Array,
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] => {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of bytes) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) {
    ret.push((acc << (toBits - bits)) & maxv);
  }
  return ret;
};

const createChecksum = (hrp: string, data: number[]): number[] => {
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const polymod = bech32Polymod(values) ^ BECH32M_CONST;
  const ret: number[] = [];
  for (let p = 0; p < 6; p += 1) {
    ret.push((polymod >> (5 * (5 - p))) & 31);
  }
  return ret;
};

const hrpExpand = (hrp: string): number[] => {
  const high = Array.from(hrp).map((char) => char.charCodeAt(0) >> 5);
  const low = Array.from(hrp).map((char) => char.charCodeAt(0) & 31);
  return [...high, 0, ...low];
};

const bech32Polymod = (values: number[]): number => {
  const generator = [
    0x3b6a57b2,
    0x26508e6d,
    0x1ea119fa,
    0x3d4233dd,
    0x2a1462b3,
  ];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i += 1) {
      if ((top >> i) & 1) {
        chk ^= generator[i];
      }
    }
  }
  return chk;
};
