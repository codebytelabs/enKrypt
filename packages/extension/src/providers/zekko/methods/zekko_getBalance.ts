import { MiddlewareFunction } from '@enkryptcom/types';
import { ProviderRPCRequest } from '@/types/provider';
import { getCustomError } from '@/libs/error';

const method: MiddlewareFunction = async function (
  this: any,
  payload: ProviderRPCRequest,
  res,
  next,
): Promise<void> {
  if (payload.method !== 'zekko_getBalance') return next();
  try {
    const address = payload.params?.[0] as string;
    if (!address) {
      res(getCustomError('Address required'));
      return;
    }
    const api = await (this as any).network.api();
    const bal = await api.getBalance(address);
    res(null, bal.balance_zek || '0');
  } catch {
    res(getCustomError('Could not fetch Zekko balance'));
  }
};
export default method;
