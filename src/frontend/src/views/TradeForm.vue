<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded mb-6 flex justify-between items-center animate-fade-in" role="alert">
      <span>{{ errorMessage }}</span>
      <button type="button" class="text-red-400 hover:text-white transition-colors" @click="errorMessage = ''" aria-label="Close">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    
    <div class="max-w-2xl mx-auto glass-card animate-slide-up">
      <div class="p-6 border-b border-white/10">
        <h5 class="text-xl font-bold text-white mb-0">{{ isEditing ? 'Edit Trade' : 'Add New Trade' }}</h5>
      </div>
      <div class="p-6">
        <form @submit.prevent="saveTrade" class="space-y-6">
          <!-- Pair and Type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Pair</label>
              <input v-model="pairUpperCase" type="text" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none" 
                required placeholder="BTCUSDT" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Type</label>
              <select v-model="tradeData.type" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none appearance-none" 
                required>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
          </div>

          <!-- Interval and Entry -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Interval</label>
              <select v-model="tradeData.interval" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none appearance-none" 
                required>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Entry Price</label>
              <input v-model.number="tradeData.entry" type="number" step="any" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" 
                required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Stop Loss</label>
              <input v-model.number="tradeData.stop" type="number" step="any" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" 
                required />
            </div>
          </div>

          <!-- Suggest TP Section -->
          <div class="bg-blue-900/10 rounded-xl p-4 border border-blue-500/10">
            <div class="flex flex-wrap items-end gap-4">
              <div class="flex-grow">
                <label class="block text-sm font-medium text-gray-400 mb-2">Suggest TP Interval</label>
                <select v-model="suggestInterval" 
                  class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none appearance-none">
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1d</option>
                </select>
              </div>
              <button type="button" 
                class="px-6 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-[42px]"
                @click="suggestTakeProfits" :disabled="loadingSuggest">
                <span v-if="loadingSuggest" class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                {{ suggestButtonLabel }}
              </button>
            </div>
            <p v-if="suggestError" class="text-red-400 text-sm mt-2">{{ suggestError }}</p>
          </div>

          <!-- Take Profits Grid -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-3">Take Profit Levels</label>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="i in 6" :key="i" class="relative">
                <span class="absolute left-3 top-2.5 text-gray-500 text-xs font-bold">TP{{i}}</span>
                <input v-model.number="tradeData[`tp${i}` as keyof Trade]" type="number" step="any" 
                  class="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all outline-none font-mono text-sm" 
                  :placeholder="`TP ${i}`" />
              </div>
            </div>
          </div>

          <!-- Checkboxes -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/30 rounded-xl border border-white/5">
            <div class="flex items-center gap-3">
              <input v-model="tradeData.volume_required" type="checkbox" id="volumeRequiredCheck"
                class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
              <label class="text-gray-300 cursor-pointer select-none" for="volumeRequiredCheck">Volume Required</label>
            </div>
            <div class="flex items-center gap-3">
              <input v-model="tradeData.volume_adds_margin" type="checkbox" id="volumeMarginCheck"
                class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
              <label class="text-gray-300 cursor-pointer select-none" for="volumeMarginCheck">Volume Adds Margin</label>
            </div>
            <div class="flex items-center gap-3">
              <input v-model="tradeData.sentiment_required" type="checkbox" id="sentimentRequiredCheck"
                class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
              <label class="text-gray-300 cursor-pointer select-none" for="sentimentRequiredCheck">Sentiment Required</label>
            </div>
            <div class="flex items-center gap-3">
              <input v-model="tradeData.sentiment_adds_margin" type="checkbox" id="sentimentMarginCheck"
                class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
              <label class="text-gray-300 cursor-pointer select-none" for="sentimentMarginCheck">Sentiment Adds Margin</label>
            </div>
          </div>

          <!-- Description and URL -->
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Setup Description</label>
              <textarea v-model="tradeData.setup_description" rows="3"
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
                placeholder="Describe the trading setup..."></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Analysis URL</label>
              <div class="relative">
                <span class="absolute left-4 top-3 text-gray-500"><i class="bi bi-link-45deg"></i></span>
                <input v-model="tradeData.url_analysis" type="url" 
                  class="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
                  placeholder="https://www.tradingview.com/symbols/..." />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-4 pt-4 border-t border-white/10">
            <router-link to="/" class="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-all">
              Cancel
            </router-link>
            <button type="submit" class="btn-primary px-8">
              Save Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Trade } from '../../../utils/types';



const route = useRoute()
const router = useRouter()

const tradeData = ref<Trade>({
  entry: 0,
  stop: 0,
  type: 'LONG',
  tp1: 0,
  tp2: null,
  tp3: null,
  tp4: null,
  tp5: null,
  tp6: null,
  symbol: '',
  volume_required: false,
  volume_adds_margin: false,
  sentiment_required: false,
  sentiment_adds_margin: false,
  setup_description: null,
  url_analysis: '',
  interval: '1h'
})

const suggestInterval = ref('1h');

const pairUpperCase = computed({
  get: () => tradeData.value.symbol,
  set: (value: string) => {
    tradeData.value.symbol = value.toUpperCase()
  }
})

const isEditing = computed(() => route.params.id !== undefined)

const errorMessage = ref('')
const loadingSuggest = ref(false)
const suggestError = ref('')

const suggestButtonLabel = computed(() => {
  if (loadingSuggest.value) return 'Suggesting...';
  return 'Suggest TakeProfit';
});

// Load trade data if editing
// Load trade data if editing
const allTrades = ref<Trade[]>([])
const loadingTrades = ref(false)

onMounted(async () => {
  // Load all trades for autofill functionality
  try {
    loadingTrades.value = true
    const response = await fetch('/api/trades')
    if (response.ok) {
      allTrades.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to load trade history:', error)
  } finally {
    loadingTrades.value = false
  }

  if (isEditing.value) {
    try {
      const response = await fetch(`/api/trades/${route.params.id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to load trade')
      }
      const trade = await response.json()
      tradeData.value = trade
    } catch (error) {
      console.error('Failed to load trade:', error)
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load trade'
    }
  }
})

// Watch for symbol changes to autofill data
watch(() => tradeData.value.symbol, (newSymbol) => {
  if (!newSymbol || isEditing.value) return

  const existingTrade = allTrades.value.find(t => t.symbol === newSymbol && t.id !== undefined) // Find last trade (assuming API returns sorted or we just take first match if array is desc)
  
  if (existingTrade) {
    // Flip type
    tradeData.value.type = existingTrade.type === 'LONG' ? 'SHORT' : 'LONG'
    
    // Copy other fields
    tradeData.value.interval = existingTrade.interval
    
    // Checkboxes
    tradeData.value.volume_required = existingTrade.volume_required
    tradeData.value.volume_adds_margin = existingTrade.volume_adds_margin
    tradeData.value.sentiment_required = existingTrade.sentiment_required
    tradeData.value.sentiment_adds_margin = existingTrade.sentiment_adds_margin
    
    // Description and URL
    if (existingTrade.setup_description) {
      tradeData.value.setup_description = existingTrade.setup_description
    }
    if (existingTrade.url_analysis) {
      tradeData.value.url_analysis = existingTrade.url_analysis
    }
  }
})

const sanitizeTradeData = (data: Record<string, any>) => {
  const sanitized: Record<string, any> = { ...data };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string' && sanitized[key].trim() === '') {
      sanitized[key] = null;
    }
  }
  return sanitized;
}

const saveTrade = async () => {
  try {
    errorMessage.value = ''

    // Validate duplicate TPs
    const tps = [
      tradeData.value.tp1,
      tradeData.value.tp2,
      tradeData.value.tp3,
      tradeData.value.tp4,
      tradeData.value.tp5,
      tradeData.value.tp6
    ].filter(tp => tp !== null && tp !== undefined && tp !== 0 && (tp as any) !== '')

    const uniqueTps = new Set(tps)
    if (uniqueTps.size !== tps.length) {
      errorMessage.value = 'Duplicate Take Profit values are not allowed.'
      return
    }

    // Validate TP ordering
    for (let i = 0; i < tps.length - 1; i++) {
      const current = Number(tps[i])
      const next = Number(tps[i + 1])

      if (tradeData.value.type === 'LONG') {
        if (current > next) {
          errorMessage.value = 'For LONG trades, Take Profit values must be increasing.'
          return
        }
      } else {
        if (current < next) {
          errorMessage.value = 'For SHORT trades, Take Profit values must be decreasing.'
          return
        }
      }
    }
    const url = isEditing.value ? `/api/trades/${route.params.id}` : '/api/trades'
    const method = isEditing.value ? 'PUT' : 'POST'

    const sanitizedData = sanitizeTradeData(tradeData.value)
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save trade')
    }

    router.push('/')
  } catch (error) {
    console.error('Failed to save trade:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save trade'
  }
}

const suggestTakeProfits = async () => {
  suggestError.value = ''
  loadingSuggest.value = true
  try {
    const { symbol, type, entry, stop } = tradeData.value
    const interval = suggestInterval.value;
    if (!symbol || !type || !entry || !stop) {
      suggestError.value = 'Fill in symbol, type, entry and stop.'
      loadingSuggest.value = false
      return
    }
    const response = await fetch('/api/takeprofit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, side: type, entry, stop, interval })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error suggesting takeprofits')
    }
    const data = await response.json()
    const tps = data.takeProfits || []
    tradeData.value.tp1 = tps[0] ?? null
    tradeData.value.tp2 = tps[1] ?? null
    tradeData.value.tp3 = tps[2] ?? null
    tradeData.value.tp4 = tps[3] ?? null
    tradeData.value.tp5 = tps[4] ?? null
    tradeData.value.tp6 = tps[5] ?? null
  } catch (error) {
    suggestError.value = error instanceof Error ? error.message : 'Error suggesting takeprofits'
  } finally {
    loadingSuggest.value = false
  }
}
</script> 
