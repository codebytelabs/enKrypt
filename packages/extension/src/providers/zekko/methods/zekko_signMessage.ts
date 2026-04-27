import { MiddlewareFunction } from '@enkryptcom/types';
import { ProviderRPCRequest } from '@/types/provider';
import { getCustomError } from '@/libs/error';

const method: MiddlewareFunction = async function (
  this: any,
  payload: ProviderRPCRequest,
  res,
  next,
): Promise<void> {
  if (payload.method !== 'zekko_signMessage') return next();
  res(getCustomError('Use UI to sign messages'));
};
export default method;
