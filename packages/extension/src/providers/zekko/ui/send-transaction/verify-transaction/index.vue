<template>
  <div class="verify-transaction">
    <div class="verify-transaction__header">
      <h3>Confirm Transaction</h3>
      <a class="verify-transaction__close" @click="close">×</a>
    </div>

    <div class="verify-transaction__content">
      <div class="verify-transaction__detail">
        <p class="verify-transaction__label">From</p>
        <p class="verify-transaction__value">{{ txData.fromAddress }}</p>
      </div>
      <div class="verify-transaction__detail">
        <p class="verify-transaction__label">To</p>
        <p class="verify-transaction__value">{{ txData.toAddress }}</p>
      </div>
      <div class="verify-transaction__detail">
        <p class="verify-transaction__label">Amount</p>
        <p class="verify-transaction__value">{{ txData.amount }} {{ txData.symbol }}</p>
      </div>
      <div class="verify-transaction__detail">
        <p class="verify-transaction__label">Fee</p>
        <p class="verify-transaction__value">{{ txData.fee || '0.001' }} {{ txData.symbol }}</p>
      </div>
      <div class="verify-transaction__detail">
        <p class="verify-transaction__label">Network</p>
        <p class="verify-transaction__value">Zekko</p>
      </div>
    </div>

    <p v-if="errorMsg" class="verify-transaction__error">{{ errorMsg }}</p>

    <div v-if="txHash" class="verify-transaction__success">
      <p class="verify-transaction__success-title">Transaction Sent!</p>
      <p class="verify-transaction__success-hash">{{ txHash }}</p>
      <a
        :href="explorerLink"
        target="_blank"
        rel="noopener noreferrer"
        class="verify-transaction__explorer-link"
      >
        View on Explorer
      </a>
      <base-button title="Done" :click="done" />
    </div>

    <div v-if="!txHash" class="verify-transaction__buttons">
      <base-button
        title="Reject"
        :no-background="true"
        :click="close"
        :disabled="isProcessing"
      />
      <base-button
        :title="isProcessing ? 'Sending...' : 'Confirm'"
        :click="sendAction"
        :disabled="isProcessing"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@action/components/base-button/index.vue';
import BigNumber from 'bignumber.js';
import sendUsingInternalMessengers from '@/libs/messenger/internal-messenger';
import { InternalMethods } from '@/types/messenger';
import PublicKeyRing from '@/libs/keyring/public-keyring';
import { getNetworkByName } from '@/libs/utils/networks';
import type { BaseNetwork } from '@/types/base-network';
import { ActivityStatus, ActivityType } from '@/types/activity';
import ActivityState from '@/libs/activity-state';

const route = useRoute();
const router = useRouter();
const keyring = new PublicKeyRing();

interface TxData {
  fromAddress: string;
  toAddress: string;
  amount: string;
  fee?: string;
  symbol: string;
  rawValue: string;
  rawFeeValue?: string;
}

const txData = ref<TxData>({
  fromAddress: '',
  toAddress: '',
  amount: '',
  fee: '0.001',
  symbol: 'ZKO',
  rawValue: '0',
  rawFeeValue: '0',
});

onMounted(() => {
  try {
    const data = route.query.txData as string;
    if (data) {
      const parsed = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
      txData.value = parsed as TxData;
    }
  } catch {
    // ignore decode errors
  }
});

const extractTxHash = (response: unknown): string => {
  const candidates: unknown[] = [response];

  if (response && typeof response === 'object') {
    const responseObj = response as Record<string, unknown>;
    candidates.push(
      responseObj.result,
      responseObj.txid,
      responseObj.txHash,
      responseObj.tx_id,
    );
    if (responseObj.result && typeof responseObj.result === 'object') {
      const resultObj = responseObj.result as Record<string, unknown>;
      candidates.push(
        resultObj.result,
        resultObj.txid,
        resultObj.txHash,
        resultObj.tx_id,
      );
    }
    if (typeof responseObj.result === 'string') {
      try {
        const parsed = JSON.parse(responseObj.result) as Record<string, unknown>;
        candidates.push(parsed.result, parsed.txid, parsed.txHash, parsed.tx_id);
      } catch {
        // ignore non-JSON result payloads
      }
    }
  }

  const hash = candidates.find(
    value => typeof value === 'string' && value.length > 0,
  );
  return typeof hash === 'string' ? hash : '';
};

const close = () => {
  router.go(-1);
};

const done = () => {
  const networkId = route.query.id as string | undefined;
  router.push({ name: 'assets', params: { id: networkId || '' } });
};

const isProcessing = ref(false);
const errorMsg = ref('');
const txHash = ref('');
const networkRef = ref<BaseNetwork | null>(null);

const explorerLink = computed(() => {
  if (!networkRef.value || !txHash.value) return '#';
  return networkRef.value.blockExplorerTX.replace('[[txHash]]', txHash.value);
});

const sendAction = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  errorMsg.value = '';
  try {
    const networkName = (route.query.id as string) || 'Zekko';
    const network = (await getNetworkByName(networkName)) as
      | BaseNetwork
      | undefined;
    if (!network) throw new Error(`Unknown network: ${networkName}`);
    networkRef.value = network;

    const account = await keyring.getAccount(txData.value.fromAddress);
    // The node's `devnet_transfer` RPC expects `amount_zek` and `fee_zek`
    // as base-unit (zek) integer strings, where 1 ZKO = 10^18 zek.
    // `txData.rawValue` is already in base units (computed in send-transaction
    // as `humanAmount * 10^decimals`), so pass it through as-is.
    const amountZek = new BigNumber(txData.value.rawValue).toFixed(0);
    const feeZek = new BigNumber(txData.value.rawFeeValue || '0').toFixed(0);
    const displayAddress = network.displayAddress(txData.value.fromAddress);

    const activityState = new ActivityState();

    const response = await sendUsingInternalMessengers({
      method: InternalMethods.zekkoDevnetTransfer,
      params: [
        {
          from: txData.value.fromAddress,
          to: txData.value.toAddress,
          amountZek,
          feeZek,
          node: network.node,
        },
        account,
      ],
    });

    if (response?.error) {
      const parsed =
        typeof response.error === 'string'
          ? response.error
          : JSON.stringify(response.error);
      // Persist failed activity so it appears in history.
      await activityState.addActivities(
        [
          {
            network: network.name,
            from: displayAddress,
            to: txData.value.toAddress,
            value: amountZek,
            timestamp: Date.now(),
            isIncoming: false,
            transactionHash: '',
            token: {
              name: network.name_long,
              symbol: network.currencyName,
              decimals: network.decimals,
              icon: network.icon,
            },
            status: ActivityStatus.failed,
            type: ActivityType.transaction,
          },
        ],
        { address: displayAddress, network: network.name },
      );
      throw new Error(parsed);
    }

    const hash = extractTxHash(response);
    if (!hash) throw new Error('Missing transaction hash from transfer response');
    txHash.value = hash;

    // Persist successful/pending activity immediately so it shows in the
    // Activity tab before the node confirms the block.
    await activityState.addActivities(
      [
        {
          network: network.name,
          from: displayAddress,
          to: txData.value.toAddress,
          value: amountZek,
          timestamp: Date.now(),
          isIncoming: false,
          transactionHash: hash,
          token: {
            name: network.name_long,
            symbol: network.currencyName,
            decimals: network.decimals,
            icon: network.icon,
          },
          status: ActivityStatus.pending,
          type: ActivityType.transaction,
        },
      ],
      { address: displayAddress, network: network.name },
    );

    console.info('Zekko transfer submitted:', hash);
  } catch (err: any) {
    console.error('Zekko send failed:', err);
    errorMsg.value = err?.message || 'Failed to send transaction';
  } finally {
    isProcessing.value = false;
  }
};
</script>

<style lang="less">
@import '@action/styles/theme.less';

.verify-transaction {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e6e6e6;
    h3 {
      margin: 0;
      font-size: 16px;
    }
  }
  &__close {
    font-size: 20px;
    cursor: pointer;
  }
  &__content {
    padding: 16px;
  }
  &__detail {
    margin-bottom: 16px;
  }
  &__label {
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
  }
  &__value {
    font-size: 14px;
    word-break: break-all;
  }
  &__buttons {
    display: flex;
    gap: 8px;
    padding: 0 16px 16px;
  }
  &__error {
    color: #d32f2f;
    font-size: 12px;
    padding: 0 16px;
    word-break: break-word;
  }
  &__success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px 16px;
    text-align: center;
  }
  &__success-title {
    font-size: 16px;
    font-weight: 600;
    color: #2e7d32;
    margin: 0;
  }
  &__explorer-link {
    font-size: 13px;
    color: #1565c0;
    text-decoration: underline;
    word-break: break-all;
  }
  &__success-hash {
    font-size: 12px;
    color: #666;
    margin: 0;
    word-break: break-all;
  }
  &__success-hint {
    font-size: 11px;
    color: #888;
    margin: 0;
  }
}
</style>

