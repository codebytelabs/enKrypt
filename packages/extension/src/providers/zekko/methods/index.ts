import { MiddlewareFunction } from '@enkryptcom/types';
import { BackgroundProviderInterface } from '@/types/provider';
import zekko_getBalance from './zekko_getBalance';
import zekko_requestAccounts from './zekko_requestAccounts';
import zekko_signMessage from './zekko_signMessage';
import zekko_sendTransaction from './zekko_sendTransaction';

export default (
  _provider: BackgroundProviderInterface,
): MiddlewareFunction[] => {
  return [
    zekko_getBalance,
    zekko_requestAccounts,
    zekko_signMessage,
    zekko_sendTransaction,
    async (request, response, next) => {
      return next();
    },
  ];
};
