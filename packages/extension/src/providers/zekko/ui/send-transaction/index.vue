<template>
  <div class="send-transaction">
    <send-header
      :is-send-token="true"
      :is-nft-available="false"
    />

    <div class="send-transaction__content">
      <send-address-input
        v-show="!isOpenSelectContactTo"
        :value="addressTo"
        placeholder="zk1..."
        @update:input-address="(val: string) => (addressTo = val)"
        @toggle:show-contacts="() => (isOpenSelectContactTo = !isOpenSelectContactTo)"
      />

      <send-contacts-list
        v-show="isOpenSelectContactTo"
        :network="network"
        @selected:account="selectContactTo"
        @update:paste="(val: string) => (addressTo = val)"
      />

      <send-input-amount
        :amount="amount"
        :has-enough-balance="hasEnoughBalance"
        :show-max="true"
        :fiat-value="'0'"
        @update:input-amount="(val: string) => (amount = val)"
        @update:input-set-max="setMaxAmount"
      />

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
import BigNumber from 'bignumber.js';
import type { BaseNetwork } from '@/types/base-network';
import type { AccountsHeaderData } from '@/ui/action/types/account';
import SendHeader from '@/providers/common/ui/send-transaction/send-header.vue';
import SendAddressInput from './components/send-address-input.vue';
import SendContactsList from '@/providers/common/ui/send-transaction/send-contacts-list.vue';
import SendInputAmount from '@/providers/common/ui/send-transaction/send-input-amount.vue';
import BaseButton from '@action/components/base-button/index.vue';
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

const selectedAccountBalance = computed<string>(() => {
  const accounts = props.accountInfo.activeAccounts || [];
  const balances = props.accountInfo.activeBalances || [];
  const selected = props.accountInfo.selectedAccount?.address;
  if (!selected) return '0';
  const idx = accounts.findIndex(acc => acc.address === selected);
  if (idx === -1) return '0';
  const bal = balances[idx];
  return !bal || bal === '~' ? '0' : bal;
});

const selectedToken = computed(() => {
  return {
    name: 'Zekko',
    symbol: 'ZKO',
    decimals: props.network.decimals || 18,
    icon: props.network.icon,
    balance: selectedAccountBalance.value,
    balancef: selectedAccountBalance.value,
  };
});

const DEFAULT_FEE = '0.001'; // ZKO

const hasEnoughBalance = computed(() => {
  if (!amount.value) return true;
  const bal = new BigNumber(selectedToken.value.balance || '0');
  const amt = new BigNumber(amount.value || '0');
  const fee = new BigNumber(DEFAULT_FEE);
  return amt.plus(fee).lte(bal);
});

const setMaxAmount = () => {
  const bal = new BigNumber(selectedToken.value.balance || '0');
  const fee = new BigNumber(DEFAULT_FEE);
  amount.value = bal.minus(fee).gt(0) ? bal.minus(fee).toString() : '0';
};

const isInputsValid = computed(() => {
  if (!addressTo.value || !amount.value) return false;
  if (!addressTo.value.startsWith('zk1')) return false;
  if (new BigNumber(amount.value).lte(0)) return false;
  if (!hasEnoughBalance.value) return false;
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

  // selectedToken.value.balance is human-readable (decimals applied), so convert input to base units
  const decimals = props.network.decimals || 18;
  const rawAmount = new BigNumber(amount.value)
    .times(new BigNumber(10).pow(decimals))
    .toFixed(0);

  const feeRaw = new BigNumber(DEFAULT_FEE)
    .times(new BigNumber(10).pow(decimals))
    .toFixed(0);

  const txVerifyInfo = {
    fromAddress: props.accountInfo.selectedAccount?.address,
    toAddress: addressTo.value,
    amount: amount.value,
    fee: DEFAULT_FEE,
    symbol: 'ZKO',
    rawValue: rawAmount,
    rawFeeValue: feeRaw,
  };

  router.push({
    name: RouterNames.verify.name,
    query: {
      id: props.network.name,
      txData: Buffer.from(JSON.stringify(txVerifyInfo), 'utf8').toString(
        'base64',
      ),
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
