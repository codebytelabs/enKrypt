import { NetworkNames } from '@enkryptcom/types';
import { ZekkoBase } from './zekko-base';

const zekkoNetworks = {
  Zekko: new ZekkoBase({
    name: NetworkNames.Zekko,
    node: 'http://localhost:26657',
    icon: '',
  }),
};

export default zekkoNetworks;
