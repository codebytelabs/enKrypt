import { NetworkNames } from '@enkryptcom/types';

export interface BalanceResponse {
  balance_zek: string;
}

export interface ZekkoRawInfo {
  status: boolean;
  txHash: string;
}

class ZekkoAPI {
  node: string;
  constructor(node: string) {
    this.node = node;
  }
  async post<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.node, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || json.error);
    return json.result;
  }
  async getBalance(address: string): Promise<BalanceResponse> {
    return this.post<BalanceResponse>('balance', { address });
  }
  async getTransactionStatus(hash: string): Promise<ZekkoRawInfo | null> {
    try {
      const result = await this.post<{ status: string; tx_hash: string }>(
        'tx_status',
        { hash },
      );
      if (!result) return null;
      return {
        status: result.status === 'confirmed',
        txHash: result.tx_hash,
      };
    } catch {
      return null;
    }
  }
}

export default ZekkoAPI;
