import { getCustomError } from '@/libs/error';
import KeyRingBase from '@/libs/keyring/keyring';
import { InternalOnMessageResponse } from '@/types/messenger';
import {
  EnkryptAccount,
  RPCRequestType,
  SignOptions,
} from '@enkryptcom/types';

interface ZekkoTransferParams {
  from: string;
  to: string;
  amountZek: string; // human-readable ZKO units, e.g. "1.5"
  feeZek?: string; // human-readable, default "0"
  node: string; // RPC endpoint URL
}

const zekkoDevnetTransfer = async (
  keyring: KeyRingBase,
  message: RPCRequestType,
): Promise<InternalOnMessageResponse> => {
  if (!message.params || message.params.length < 2) {
    return {
      error: getCustomError('zekkoDevnetTransfer: missing params'),
    };
  }
  const transfer = message.params[0] as ZekkoTransferParams;
  const account = message.params[1] as EnkryptAccount;
  if (!transfer?.from || !transfer?.to || !transfer?.amountZek) {
    return {
      error: getCustomError('zekkoDevnetTransfer: invalid transfer payload'),
    };
  }
  if (!transfer.from.startsWith('zk1') || !transfer.to.startsWith('zk1')) {
    return {
      error: getCustomError(
        'zekkoDevnetTransfer: addresses must be zk1-prefixed bech32m',
      ),
    };
  }
  if (!account?.address || account.address !== transfer.from) {
    return {
      error: getCustomError(
        'zekkoDevnetTransfer: account does not match from-address',
      ),
    };
  }

  try {
    const opts: SignOptions = {
      basePath: account.basePath,
      pathIndex: account.pathIndex,
      signerType: account.signerType,
      walletType: account.walletType,
    };
    const keypair = await keyring.getKeyPair(opts);
    // tweetnacl secret keys are 64 bytes (seed||pubkey); the node expects
    // only the 32-byte ed25519 seed.
    const privkeyHex = keypair.privateKey.replace(/^0x/, '').slice(0, 64);

    const res = await fetch(transfer.node, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'devnet_transfer',
        params: {
          from: transfer.from,
          to: transfer.to,
          amount_zek: transfer.amountZek,
          fee_zek: transfer.feeZek || '0',
          privkey_hex: privkeyHex,
        },
      }),
    });
    const body = await res.json();
    if (body.error) {
      return {
        error: getCustomError(
          `zekkoDevnetTransfer: ${body.error.message || body.error}`,
        ),
      };
    }
    const txId = body?.result?.tx_id;
    if (!txId) {
      return {
        error: getCustomError('zekkoDevnetTransfer: missing tx_id in RPC result'),
      };
    }
    return { result: txId };
  } catch (err: any) {
    return {
      error: getCustomError(
        `zekkoDevnetTransfer: ${err?.message || String(err)}`,
      ),
    };
  }
};

export default zekkoDevnetTransfer;
