<template>
  <div class="verify-transaction">
    <common-popup-header :title="'Confirm Transaction'" @close="close" />

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
        <p class="verify-transaction__label">Network</p>
        <p class="verify-transaction__value">Zekko</p>
      </div>
    </div>

    <div class="verify-transaction__buttons">
      <base-button
        title="Reject"
        :no-background="true"
        :click="close"
      />
      <base-button
        title="Confirm"
        :click="sendAction"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CommonPopupHeader from '@action/components/common-popup-header/index.vue';
import BaseButton from '@action/components/base-button/index.vue';
import { sendToBackgroundFromAction } from '@/libs/messenger/extension';
import { InternalMethods } from '@/types/messenger';

const route = useRoute();
const router = useRouter();

interface TxData {
  fromAddress: string;
  toAddress: string;
  amount: string;
  symbol: string;
}

const txData = ref<TxData>({
  fromAddress: '',
  toAddress: '',
  amount: '',
  symbol: 'ZKO',
});

onMounted(() => {
  try {
    const data = route.params.txData as string;
    if (data) {
      const parsed = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
      txData.value = parsed as TxData;
    }
  } catch {
    // ignore decode errors
  }
});

const close = () => {
  router.go(-1);
};

const sendAction = async () => {
  try {
    const id = route.params.id as string;
    const params = JSON.parse(Buffer.from(id, 'base64').toString('utf8'));

    await sendToBackgroundFromAction(
      InternalMethods.sendToBackground,
      JSON.stringify({
        method: 'zekko_sendTransaction',
        params: [params],
      }),
    );

    router.push({ name: 'activity' });
  } catch (err) {
    console.error('Send failed:', err);
  }
};
</script>

<style lang="less">
@import '@action/styles/theme.less';

.verify-transaction {
  &__content {
    padding: 16px;
  }
  &__detail {
    margin-bottom: 16px;
  }
  &__label {
    font-size: 12px;
    color: @labelColor;
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
}
</style>

