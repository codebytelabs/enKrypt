import { BaseNetwork } from '@/types/base-network';
import { NetworkNames, SignerType } from '@enkryptcom/types';
import { ProviderName } from '@/types/provider';
import { AssetsType } from '@/types/provider';
import { Activity } from '@/types/activity';
import { BaseToken } from '@/types/base-token';
import { fromBase } from '@enkryptcom/utils';
import ZekkoAPI from '../libs/api';

export class ZekkoBase extends BaseNetwork {
  constructor(options: { name: NetworkNames; node: string; icon: string }) {
    super({
      name: options.name,
      name_long: 'Zekko',
      homePage: 'https://zekko.network',
      blockExplorerTX: '',
      blockExplorerAddr: '',
      isTestNetwork: false,
      currencyName: 'ZKO',
      currencyNameLong: 'Zekko',
      node: options.node,
      icon: options.icon || '/assets/zekko-logo.png',
      basePath: "m/44'/1409'/0'/0'",
      signer: [SignerType.ed25519zek],
      displayAddress: (address: string) => address,
      provider: ProviderName.zekko,
      coingeckoID: undefined,
      identicon: () => '',
      decimals: 18,
      api: async () => new ZekkoAPI(options.node),
      customTokens: false,
    });
  }

  async getAllTokens(_address: string): Promise<BaseToken[]> {
    return [];
  }

  async getAllTokenInfo(address: string): Promise<AssetsType[]> {
    try {
      const api = (await this.api()) as unknown as ZekkoAPI;
      const bal = await api.getBalance(address);
      const balanceRaw = bal.balance_zek || '0';
      const balanceFormatted = fromBase(balanceRaw, this.decimals);
      return [
        {
          name: 'Zekko',
          symbol: 'ZKO',
          icon: this.icon,
          balance: balanceRaw,
          balancef: balanceFormatted,
          balanceUSD: 0,
          balanceUSDf: '0',
          value: '0',
          valuef: '0',
          decimals: this.decimals,
          sparkline: '',
          priceChangePercentage: 0,
        },
      ];
    } catch {
      return [];
    }
  }

  async getAllActivity(_address: string): Promise<Activity[]> {
    return [];
  }
}
