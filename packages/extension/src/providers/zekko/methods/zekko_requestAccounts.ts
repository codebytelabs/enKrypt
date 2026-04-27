import { MiddlewareFunction } from '@enkryptcom/types';
import { ProviderRPCRequest } from '@/types/provider';
import { getCustomError } from '@/libs/error';

const method: MiddlewareFunction = async function (
  this: any,
  payload: ProviderRPCRequest,
  res,
  next,
): Promise<void> {
  if (payload.method !== 'zekko_requestAccounts') return next();
  try {
    const accounts = await (this as any).KeyRing.getAccounts(
      (this as any).network.signer,
    );
    res(null, accounts.map((a: any) => a.address));
  } catch {
    res(getCustomError('Failed to get accounts'));
  }
};
export default method;
