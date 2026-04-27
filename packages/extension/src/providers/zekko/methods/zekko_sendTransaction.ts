import { MiddlewareFunction } from '@enkryptcom/types';
import { ProviderRPCRequest } from '@/types/provider';
import { getCustomError } from '@/libs/error';

const method: MiddlewareFunction = async function (
  this: any,
  payload: ProviderRPCRequest,
  res,
  next,
): Promise<void> {
  if (payload.method !== 'zekko_sendTransaction') return next();
  try {
    const txHex = payload.params?.[0] as string;
    if (!txHex) {
      res(getCustomError('Transaction hex required'));
      return;
    }
    const api = await (this as any).network.api();
    const result = await api.post('submit_tx', { tx_hex: txHex });
    res(null, result);
  } catch {
    res(getCustomError('Failed to send Zekko transaction'));
  }
};
export default method;
