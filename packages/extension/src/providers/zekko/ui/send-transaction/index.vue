<template>
  <div class="send-transaction">
    <send-header
      title="Send ZKO"
      :network="network"
      :account-info="accountInfo"
    />

    <div class="send-transaction__content">
      <send-address-input
        v-show="!isOpenSelectContactTo"
        :value="addressTo"
        label="To"
        :is-valid="isValidAddressTo"
        placeholder="zk1..."
        @update:input="(val: string) => (addressTo = val)"
        @toggle:contact="() => (isOpenSelectContactTo = !isOpenSelectContactTo)"
      />

      <send-contacts-list
        v-show="isOpenSelectContactTo"
        :network="network"
        @selected:account="selectContactTo"
        @update:paste="(val: string) => (addressTo = val)"
      />

      <send-input-amount
        :token="selectedToken"
        :value="amount"
        :has-error="!!errorMsg"
        @update:input="(val: string) => (amount = val)"
      />

      <send-alert v-show="errorMsg" :error-msg="errorMsg" />

      <div class="send-transaction__buttons">
        <div class="send-transaction__buttons-cancel">
          <base-button title="Cancel" :click="close" :no-background="true" />
        </div>
        <div class="send-transaction__buttons-send">
          <base-button
            :title="sendButtonTitle"
            :click="sendAction"
            :disabled="!isInputsValid"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, PropType } from 'vue';
import { useRouter } from 'vue-router';
import SendHeader from '@/providers/common/ui/send-transaction/send-header.vue';
import SendAddressInput from '@/providers/common/ui/send-transaction/send-address-input.vue';
import SendContactsList from '@/providers/common/ui/send-transaction/send-contacts-list.vue';
import SendInputAmount from '@/providers/common/ui/send-transaction/send-input-amount.vue';
import BaseButton from '@action/components/base-button/index.vue';
import SendAlert from '@/providers/solana/ui/send-transaction/components/send-alert.vue';
import { AccountsHeaderData } from '@action/types/account';
import { BaseNetwork } from '@/types/base-network';
import { fromBase } from '@enkryptcom/utils';
import BigNumber from 'bignumber.js';
import { routes as RouterNames } from '@/ui/action/router';

const props = defineProps({
  network: {
    type: Object as PropType<BaseNetwork>,
    default: () => ({}),
  },
  accountInfo: {
    type: Object as PropType<AccountsHeaderData>,
    default: () => ({}),
  },
});

const router = useRouter();
const addressTo = ref('');
const amount = ref<string>('');
const isOpenSelectContactTo = ref(false);
const errorMsg = ref('');

const selectedToken = computed(() => {
  return {
    name: 'Zekko',
    symbol: 'ZKO',
    decimals: props.network.decimals || 18,
    icon: props.network.icon,
    balance: props.accountInfo.activeBalances?.[0] || '0',
    balancef: props.accountInfo.activeBalances?.[0] || '0',
  };
});

const isValidAddressTo = computed(() => {
  if (!addressTo.value) return true;
  return addressTo.value.startsWith('zk1');
});

const isInputsValid = computed(() => {
  if (!addressTo.value || !amount.value) return false;
  if (!addressTo.value.startsWith('zk1')) return false;
  if (new BigNumber(amount.value).lte(0)) return false;
  return true;
});

const sendButtonTitle = computed(() => 'Send');

const selectContactTo = (acc: any) => {
  addressTo.value = acc.address;
  isOpenSelectContactTo.value = false;
};

const close = () => {
  router.go(-1);
};

const sendAction = () => {
  if (!isInputsValid.value) return;

  const rawAmount = new BigNumber(amount.value)
    .times(new BigNumber(10).pow(props.network.decimals || 18))
    .toFixed(0);

  const params = {
    from: props.accountInfo.selectedAccount?.address,
    to: addressTo.value,
    value: rawAmount,
    data: '',
  };

  const txVerifyInfo = {
    fromAddress: params.from,
    toAddress: params.to,
    amount: amount.value,
    symbol: 'ZKO',
  };

  router.push({
    name: RouterNames.verify.name,
    params: {
      id: Buffer.from(JSON.stringify(params)).toString('base64'),
      txData: Buffer.from(JSON.stringify(txVerifyInfo)).toString('base64'),
    },
  });
};
</script>

<style lang="less">
@import '@action/styles/theme.less';

.send-transaction {
  &__content {
    padding: 16px;
  }
  &__buttons {
    display: flex;
    gap: 8px;
    margin-top: 24px;
    &-cancel,
    &-send {
      flex: 1;
    }
  }
}
</style>
