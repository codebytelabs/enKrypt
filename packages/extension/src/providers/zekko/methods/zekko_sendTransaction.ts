import { MiddlewareFunction } from '@enkryptcom/types';
import { ProviderRPCRequest } from '@/types/provider';
import { getCustomError } from '@/libs/error';
import BigNumber from 'bignumber.js';

interface ZekkoSendParams {
  from: string;
  to: string;
  value: string; // base units (10^18 zek)
  fee?: string; // base units, optional, defaults to 0
  data?: string;
}

const method: MiddlewareFunction = async function (
  this: any,
  payload: ProviderRPCRequest,
  res,
  next,
): Promise<void> {
  if (payload.method !== 'zekko_sendTransaction') return next();
  try {
    // Two payload shapes supported: structured params or pre-signed tx_hex.
    const first = payload.params?.[0];
    if (typeof first === 'string') {
      // Legacy: caller supplied a hex-encoded bincode tx.
      const api = await (this as any).network.api();
      const result = await api.post('submit_tx', { tx_hex: first });
      res(null, result);
      return;
    }

    const params = first as ZekkoSendParams | undefined;
    if (!params || !params.from || !params.to || !params.value) {
      res(getCustomError('Invalid Zekko transaction params'));
      return;
    }
    if (!params.from.startsWith('zk1') || !params.to.startsWith('zk1')) {
      res(getCustomError('Zekko addresses must start with zk1'));
      return;
    }

    const network = (this as any).network;
    const decimals: number = network.decimals ?? 18;
    const amountZek = new BigNumber(params.value)
      .div(new BigNumber(10).pow(decimals))
      .toFixed();
    const feeZek = params.fee
      ? new BigNumber(params.fee).div(new BigNumber(10).pow(decimals)).toFixed()
      : '0';

    // Derive the raw 32-byte ed25519 seed from the keyring. tweetnacl secret
    // keys are 64 bytes (seed||pubkey); the node expects only the seed.
    const keypair = await (this as any).KeyRing.getKeyPair(params.from);
    const privkeyHex = (keypair.privateKey as string)
      .replace(/^0x/, '')
      .slice(0, 64);

    const api = await network.api();
    const result = await api.post('devnet_transfer', {
      from: params.from,
      to: params.to,
      amount_zek: amountZek,
      fee_zek: feeZek,
      privkey_hex: privkeyHex,
    });
    res(null, result);
  } catch (err: any) {
    res(
      getCustomError(
        `Failed to send Zekko transaction: ${err?.message || String(err)}`,
      ),
    );
  }
};
export default method;
