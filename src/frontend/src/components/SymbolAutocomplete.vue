<template>
  <div class="relative w-full">
    <input
      type="text"
      v-bind="$attrs"
      v-model="internalValue"
      @input="handleInput"
      @focus="showSuggestions = true"
      @blur="handleBlur"
      class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
    />
    <div
      v-if="showSuggestions && filteredSuggestions.length > 0"
      class="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
    >
      <div
        v-for="item in filteredSuggestions"
        :key="item.symbol"
        @mousedown.prevent="selectSymbol(item)"
        class="px-4 py-3 hover:bg-gray-700 cursor-pointer flex flex-col gap-1 border-b border-gray-700/50 last:border-b-0"
      >
        <div class="flex justify-between items-center">
          <span class="font-bold text-white">{{ item.symbol }}</span>
          <span class="text-xs text-gray-400">{{ item.displayName }}</span>
        </div>
        <div class="flex justify-between items-center text-xs mt-1">
          <span class="text-gray-400">Open: <span :class="item.apiStateOpen === 'true' ? 'text-green-400' : 'text-red-400'">{{ item.apiStateOpen }}</span></span>
          <span class="text-gray-400">Close: <span :class="item.apiStateClose === 'true' ? 'text-green-400' : 'text-red-400'">{{ item.apiStateClose }}</span></span>
          <span class="text-gray-400">Precision: <span class="text-gray-200">{{ item.pricePrecision }}</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
}>();

interface Contract {
  symbol: string;
  displayName: string;
  apiStateOpen: string;
  apiStateClose: string;
  pricePrecision: number;
}

const internalValue = ref(props.modelValue);
const allContracts = ref<Contract[]>([]);
const showSuggestions = ref(false);

watch(() => props.modelValue, (newVal) => {
  internalValue.value = newVal;
});

const handleInput = () => {
  emit('update:modelValue', internalValue.value);
  showSuggestions.value = true;
};

const handleBlur = () => {
  showSuggestions.value = false;
  emit('blur');
};

const selectSymbol = (item: Contract) => {
  internalValue.value = item.symbol;
  emit('update:modelValue', item.symbol);
  showSuggestions.value = false;
  emit('blur');
};

const filteredSuggestions = computed(() => {
  if (!internalValue.value) return [];
  const query = internalValue.value.toLowerCase();
  return allContracts.value.filter(c => 
    (c.symbol && c.symbol.toLowerCase().includes(query)) || 
    (c.displayName && c.displayName.toLowerCase().includes(query))
  ).slice(0, 50);
});

onMounted(async () => {
  const cacheKey = 'bingx_contracts_cache';
  const cacheDuration = 60 * 60 * 1000; // 1 hour in ms

  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheDuration) {
        allContracts.value = data;
        return;
      }
    }
    
    const response = await fetch('https://open-api.bingx.com/openApi/swap/v2/quote/contracts');
    const json = await response.json();
    if (json && json.code === 0 && json.data) {
      const data = Array.isArray(json.data) ? json.data : [];
      allContracts.value = data;
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    }
  } catch (err) {
    console.error('Failed to load BingX contracts:', err);
  }
});
</script>
