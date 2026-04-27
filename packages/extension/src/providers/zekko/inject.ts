import EventEmitter from 'eventemitter3';
import { EthereumRequest, EthereumResponse } from '@/providers/ethereum/types';
import {
  ProviderName,
  ProviderOptions,
  ProviderType,
  ProviderInterface,
  SendMessageHandler,
} from '@/types/provider';
import { EnkryptWindow } from '@/types/globals';

export class Provider extends EventEmitter implements ProviderInterface {
  connected: boolean;
  name: ProviderName;
  type: ProviderType;
  version = __VERSION__;
  autoRefreshOnNetworkChange = false;
  sendMessageHandler: SendMessageHandler;

  constructor(options: ProviderOptions) {
    super();
    this.connected = true;
    this.name = options.name;
    this.type = options.type;
    this.sendMessageHandler = options.sendMessageHandler;
  }

  async request(request: EthereumRequest): Promise<EthereumResponse> {
    const res = (await this.sendMessageHandler(
      this.name,
      JSON.stringify(request),
    )) as EthereumResponse;
    return res;
  }

  isConnected(): boolean {
    return this.connected;
  }

  handleMessage(msg: string): void {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.event === 'notification') {
        this.emit(parsed.method, parsed.data);
      }
    } catch {
      /* ignore non-JSON messages */
    }
  }
}

const injectDocument = (
  document: EnkryptWindow | Window,
  options: ProviderOptions,
): void => {
  const provider = new Provider(options);
  document['enkrypt']['providers'][options.name] = provider;
};

export default injectDocument;
