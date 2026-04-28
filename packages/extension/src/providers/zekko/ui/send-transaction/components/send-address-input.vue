<template>
  <div class="send-address-input" :class="{ focus: isFocus }">
    <div class="send-address-input__avatar">
      <img
        v-if="address && identicon"
        :src="identicon"
        class="send-address-input__identicon"
      />
      <div v-else class="send-address-input__identicon"></div>
    </div>
    <input
      ref="inputRef"
      v-model="address"
      type="text"
      placeholder="Enter Zekko address (zk1...)"
      @focus="changeFocus"
      @blur="changeFocus"
    />
    <a class="send-address-input__paste" @click="pasteFromClipboard">
      <paste-icon />
    </a>
    <a
      class="send-address-input__scan"
      @click="emit('toggle:showContacts')"
    >
      <qr-icon />
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import PasteIcon from '@action/icons/actions/paste.vue';
import QrIcon from '@action/icons/header/qr_icon.vue';

const emit = defineEmits<{
  (e: 'update:inputAddress', value: string): void;
  (e: 'toggle:showContacts'): void;
}>();

const props = defineProps({
  value: {
    type: String,
    default: '',
  },
  network: {
    type: Object,
    default: () => ({}),
  },
});

const isFocus = ref(false);
const inputRef = ref<HTMLInputElement>();

const address = computed({
  get: () => props.value,
  set: (val: string) => emit('update:inputAddress', val),
});

const identicon = computed(() => {
  if (!address.value || !props.network?.identicon) return '';
  return props.network.identicon(address.value);
});

const changeFocus = () => {
  isFocus.value = !isFocus.value;
};

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    emit('update:inputAddress', text.trim());
  } catch {
    // ignore
  }
};
</script>

<style lang="less" scoped>
.send-address-input {
  display: flex;
  align-items: center;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  padding: 8px 12px;
  transition: border-color 0.3s;
  background: #fff;

  &.focus {
    border-color: #007aff;
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    background: transparent;
    margin: 0 8px;
  }

  &__identicon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f0f0f0;
  }

  &__paste,
  &__scan {
    cursor: pointer;
    margin-left: 8px;
  }
}
</style>
