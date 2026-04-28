export interface BalanceResponse {
  address?: string;
  address_hex?: string;
  balance_zek: string;
  utxo_count?: number;
}

export interface ZekkoRawInfo {
  status: boolean;
  txHash: string;
  blockHeight?: number;
}

export interface ZekkoTxIO {
  owner: string;
  owner_hex: string;
  value_zek: string;
}

export interface ZekkoTxDetail {
  txid: string;
  version: number;
  kind: string;
  inputs: ZekkoTxIO[];
  outputs: (ZekkoTxIO & { idx: number })[];
  fee_zek: string;
  valid_until: number;
  status: 'pending' | 'confirmed';
  block_height: number | null;
  block_hash: string | null;
  tx_index: number | null;
}

export interface ZekkoAddressTxRow {
  txid: string;
  block_height: number;
  block_hash: string;
  tx_index: number;
  kind: string;
  input_count: number;
  output_count: number;
  fee_zek: string;
  timestamp: number;
}

export interface ZekkoAddressTxs {
  address: string;
  address_hex: string;
  total: number;
  limit: number;
  offset: number;
  items: ZekkoAddressTxRow[];
}

export interface ZekkoMempoolTxRow {
  txid: string;
  version: number;
  kind: string;
  input_count: number;
  output_count: number;
  fee_zek: string;
  valid_until: number;
}

export interface ZekkoMempoolPending {
  count: number;
  items: ZekkoMempoolTxRow[];
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
  async getBalanceInfo(address: string): Promise<BalanceResponse> {
    return this.post<BalanceResponse>('balance', { address });
  }
  async getBalance(address: string): Promise<string> {
    const info = await this.getBalanceInfo(address);
    return info?.balance_zek || '0';
  }
  /**
   * Look up a transaction by id. Searches mempool then ledger, so a freshly
   * submitted tx returns `status: 'pending'` until confirmed.
   */
  async getTx(txid: string): Promise<ZekkoTxDetail | null> {
    try {
      return await this.post<ZekkoTxDetail>('get_tx', { txid });
    } catch {
      return null;
    }
  }
  async getTransactionStatus(txid: string): Promise<ZekkoRawInfo | null> {
    const tx = await this.getTx(txid);
    if (!tx) return null;
    return {
      status: tx.status === 'confirmed',
      txHash: tx.txid,
      blockHeight: tx.block_height ?? undefined,
    };
  }
  async getAddressTxs(
    address: string,
    limit = 20,
    offset = 0,
  ): Promise<ZekkoAddressTxs> {
    return this.post<ZekkoAddressTxs>('address_txs', {
      address,
      limit,
      offset,
    });
  }
  async getMempoolPending(): Promise<ZekkoMempoolPending> {
    return this.post<ZekkoMempoolPending>('mempool_pending', {});
  }
}

export default ZekkoAPI;
