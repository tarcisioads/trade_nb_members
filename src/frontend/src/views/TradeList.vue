<template>
  <main class="container mx-auto py-4">
    <!-- Custom Toast -->
    <div v-if="toast.show" class="fixed bottom-4 right-4 z-50">
      <div class="glass-card p-4 flex items-center gap-3 border-l-4 border-green-500 animate-slide-up">
        <div class="text-green-400">
          <i class="bi bi-check-circle-fill text-xl"></i>
        </div>
        <div>
          <h6 class="font-bold text-white">Success</h6>
          <p class="text-sm text-gray-300">{{ toast.message }}</p>
        </div>
        <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-white">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
    <div class="sticky top-0 md:top-16 z-40 glass-card p-3 mb-6 flex flex-col lg:flex-row gap-4 justify-between items-center backdrop-blur-md">
      <div class="flex flex-wrap justify-center gap-3 w-full lg:w-auto">
        <router-link to="/trade/new" class="btn-primary flex-1 md:flex-none text-center text-sm md:text-base">
          Add New Trade
        </router-link>
        <button @click="showStats = !showStats" 
          class="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none text-sm md:text-base"
          :title="showStats ? 'Hide Statistics' : 'Show Statistics'">
          <i class="bi" :class="showStats ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
          Statistics
        </button>
        <button @click="showMarketButtons = !showMarketButtons" 
          class="px-4 py-2 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none text-sm md:text-base"
          :title="showMarketButtons ? 'Hide Market Buttons' : 'Show Market Buttons'">
          <i class="bi" :class="showMarketButtons ? 'bi-eye-slash' : 'bi-eye'"></i>
          {{ showMarketButtons ? 'Hide' : 'Show Market Buttons' }}
        </button>
      </div>
      <div class="flex flex-wrap justify-center gap-2 w-full lg:w-auto">
        <span class="px-3 py-1 rounded bg-gray-700 text-gray-200 text-xs md:text-sm font-medium">{{ trades.length }} {{ trades.length === 1 ? 'Trade' : 'Trades' }}</span>
        <span class="px-3 py-1 rounded bg-blue-900/50 text-blue-200 text-xs md:text-sm font-medium">{{ uniquePairs.length }} {{ uniquePairs.length === 1 ? 'Pair' : 'Pairs' }}</span>
        <span class="px-3 py-1 rounded bg-green-900/50 text-green-200 text-xs md:text-sm font-medium">{{ longCount }} LONG</span>
        <span class="px-3 py-1 rounded bg-red-900/50 text-red-200 text-xs md:text-sm font-medium">{{ shortCount }} SHORT</span>
      </div>
    </div>

    <div v-if="showStats" class="glass-card mb-6 animate-fade-in">
      <div class="p-4">
        <h6 class="text-lg font-semibold text-white mb-4">Trade Statistics</h6>
        <div class="grid grid-cols-1 gap-6">
          <!-- Totals -->
          <div>
            <div class="flex flex-wrap gap-2 items-center">
              <span class="text-gray-400">Total:</span>
              <span class="px-2 py-1 bg-gray-700 rounded text-gray-200 text-xs">{{ trades.length }} Trades</span>
              <span class="px-2 py-1 bg-blue-900/50 text-blue-200 rounded text-xs">{{ uniquePairs.length }} Pairs</span>
              <span class="px-2 py-1 bg-green-900/50 text-green-200 rounded text-xs">{{ longCount }} LONG</span>
              <span class="px-2 py-1 bg-red-900/50 text-red-200 rounded text-xs">{{ shortCount }} SHORT</span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-1">
              <span class="text-gray-400 text-sm mr-2">Pairs:</span>
              <span v-for="pair in uniquePairs" :key="pair" 
                class="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-xs cursor-pointer transition-colors"
                @click="scrollToSymbol(pair)">{{ pair }}</span>
            </div>
          </div>

          <!-- By Interval -->
          <div>
            <div class="flex flex-col gap-2">
              <div v-for="interval in ['5m', '15m', '1h']" :key="interval" class="flex gap-2 items-center">
                <span class="text-gray-400 text-sm w-10">{{ interval }}:</span>
                <span class="px-2 py-1 bg-gray-700 rounded text-gray-200 text-xs">{{ getIntervalStats(interval).total }} Trades</span>
                <span class="px-2 py-1 bg-blue-900/50 text-blue-200 rounded text-xs">{{ getIntervalStats(interval).pairs }} Pairs</span>
                <span class="px-2 py-1 bg-green-900/50 text-green-200 rounded text-xs">{{ getIntervalStats(interval).long }} LONG</span>
                <span class="px-2 py-1 bg-red-900/50 text-red-200 rounded text-xs">{{ getIntervalStats(interval).short }} SHORT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs uppercase bg-gray-800 text-gray-400">
            <tr>
              <th class="px-4 py-3">Pair & Setup</th>
              <th class="px-4 py-3">Type & Interval</th>
              <th class="px-4 py-3">Entry</th>
              <th class="px-4 py-3">Stop</th>
              <th class="px-4 py-3">Take Profits</th>
              <th class="px-4 py-3">Volume/Sentiment Flags</th>
              <th class="px-4 py-3">Analysis</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="(trade, index) in trades" :key="index" :id="`symbol-${trade.symbol}`" class="hover:bg-white/5 transition-colors">
              <td class="px-4 py-3">
                <div class="flex flex-col">
                  <strong class="text-white">{{ trade.symbol }}</strong>
                  <small v-if="trade.setup_description" class="text-gray-400 mt-1 max-w-[200px] whitespace-normal">
                    {{ trade.setup_description }}
                  </small>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  <span :class="trade.type === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                    class="px-2 py-1 rounded text-xs font-bold w-fit">
                    {{ trade.type }}
                  </span>
                  <span class="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs w-fit">
                    {{ trade.interval || '-' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 font-mono text-gray-300">{{ trade.entry }}</td>
              <td class="px-4 py-3 font-mono text-gray-300">{{ trade.stop }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <template v-for="(tp, index) in getFormattedTPs(trade)" :key="index">
                    <span class="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                      {{ tp.label }}: {{ tp.value }}
                    </span>
                  </template>
                  <span v-if="getFormattedTPs(trade).length === 0" class="text-gray-500">-</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  <span :class="trade.volume_required ? 'text-green-400' : 'text-gray-500'" class="text-xs">
                    {{ trade.volume_required ? 'Volume Required' : 'Volume Optional' }}
                  </span>
                  <span :class="trade.volume_adds_margin ? 'text-green-400' : 'text-gray-500'" class="text-xs">
                    {{ trade.volume_adds_margin ? 'Volume Adds Margin' : 'No Volume Margin' }}
                  </span>
                  <span :class="trade.sentiment_required ? 'text-green-400' : 'text-gray-500'" class="text-xs">
                    {{ trade.sentiment_required ? 'Sentiment Required' : 'Sentiment Optional' }}
                  </span>
                  <span :class="trade.sentiment_adds_margin ? 'text-green-400' : 'text-gray-500'" class="text-xs">
                    {{ trade.sentiment_adds_margin ? 'Sentiment Adds Margin' : 'No Sentiment Margin' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <a v-if="trade.url_analysis" :href="trade.url_analysis" target="_blank"
                  class="text-blue-400 hover:text-blue-300 underline text-sm">
                  View
                </a>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <router-link :to="`/trade/${index}/edit`" class="px-3 py-1 border border-blue-500 text-blue-400 rounded hover:bg-blue-500/10 transition-colors text-xs">
                    Edit
                  </router-link>
                  <button @click="deleteTrade(index)" class="px-3 py-1 border border-red-500 text-red-400 rounded hover:bg-red-500/10 transition-colors text-xs">
                    Delete
                  </button>
                  <template v-if="showMarketButtons">
                    <button @click="enterMarket(trade)" class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs disabled:opacity-50" :disabled="trade.isLoading">
                      <span v-if="trade.isLoading" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                      {{ trade.isLoading ? 'Entering...' : 'Enter' }}
                    </button>
                    <button @click="enterMarketWithTP1(trade)" class="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-xs disabled:opacity-50"
                      :disabled="trade.isLoadingTP1">
                      <span v-if="trade.isLoadingTP1" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                      {{ trade.isLoadingTP1 ? 'Entering...' : 'Enter TP1' }}
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <TradeNotifications />
  </main>
</template>
  
<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import TradeNotifications from '../components/TradeNotifications.vue'
import { Trade } from '../../../utils/types';
import axios from 'axios'

const toast = reactive({
  show: false,
  message: ''
})


const trades = ref<Trade[]>([])

const uniquePairs = computed(() => {
  const pairs = new Set(trades.value.map(trade => trade.symbol))
  return Array.from(pairs)
})

const longCount = computed(() => {
  return trades.value.filter(trade => trade.type === 'LONG').length
})

const shortCount = computed(() => {
  return trades.value.filter(trade => trade.type === 'SHORT').length
})

// Helper function to get formatted TPs for a trade
const getFormattedTPs = (trade: Trade) => {
  const tps = []
  for (let i = 1; i <= 6; i++) {
    const tp = trade[`tp${i}` as keyof Trade] as number | null
    if (tp !== null && tp !== undefined) {
      tps.push({ label: `TP${i}`, value: tp })
    }
  }
  return tps
}

// Load trades from API
const loadTrades = async () => {
  try {
    const response = await fetch('/api/trades')
    const loadedTrades = await response.json()
    trades.value = loadedTrades.map((trade: Trade) => ({
      ...trade,
      isLoading: false,
      isLoadingTP1: false
    }))
  } catch (error) {
    console.error('Failed to load trades:', error)
  }
}

// Delete trade
const deleteTrade = async (index: number) => {
  if (!confirm('Are you sure you want to delete this trade?')) return

  try {
    await fetch(`/api/trades/${index}`, { method: 'DELETE' })
    await loadTrades()
  } catch (error) {
    console.error('Failed to delete trade:', error)
  }
}

const getIntervalStats = (interval: string) => {
  const intervalTrades = trades.value.filter(trade => trade.interval === interval)
  const pairs = new Set(intervalTrades.map(trade => trade.symbol))

  return {
    total: intervalTrades.length,
    pairs: pairs.size,
    long: intervalTrades.filter(trade => trade.type === 'LONG').length,
    short: intervalTrades.filter(trade => trade.type === 'SHORT').length
  }
}

const showStats = ref(false)
const showMarketButtons = ref(false)

const showSuccessToast = (message = 'Trade executed successfully!') => {
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

const enterMarket = async (trade: Trade) => {
  const tradeIndex = trades.value.findIndex(t => t === trade)
  if (tradeIndex === -1) return

  trades.value[tradeIndex].isLoading = true

  // Transform trade into TradeNotification format
  const tradeNotification = {
    symbol: trade.symbol,
    type: trade.type,
    entry: trade.entry,
    stop: trade.stop,
    takeProfits: {
      tp1: trade.tp1,
      tp2: trade.tp2,
      tp3: trade.tp3,
      tp4: trade.tp4,
      tp5: trade.tp5,
      tp6: trade.tp6
    },
    validation: {
      isValid: true,
      message: 'Trade forced by user',
      volumeAnalysis: {
        color: 'green',
        stdBar: 0,
        currentVolume: 0,
        mean: 0,
        std: 0
      },
      entryAnalysis: {
        currentClose: trade.entry,
        canEnter: true,
        hasClosePriceBeforeEntry: true,
        message: 'Trade forced by user'
      }
    },
    analysisUrl: trade.url_analysis || '',
    volume_adds_margin: trade.volume_adds_margin,
    setup_description: trade.setup_description,
    volume_required: trade.volume_required,
    sentiment_required: trade.sentiment_required,
    sentiment_adds_margin: trade.sentiment_adds_margin,
    interval: trade.interval,
    timestamp: new Date().toISOString()
  }
  console.log(tradeNotification)
  try {
    await axios.post('/api/trade/market', tradeNotification)
    showSuccessToast()
  } catch (error) {
    console.error('Error entering market:', error)
    alert('Failed to enter market. Please try again.')
  } finally {
    trades.value[tradeIndex].isLoading = false
  }
}

const enterMarketWithTP1 = async (trade: Trade) => {
  const tradeIndex = trades.value.findIndex(t => t === trade)
  if (tradeIndex === -1) return

  trades.value[tradeIndex].isLoadingTP1 = true
  try {

    // Transform trade into TradeNotification format
    const tradeNotification = {
      symbol: trade.symbol,
      type: trade.type,
      entry: trade.entry,
      stop: trade.stop,
      takeProfits: {
        tp1: trade.tp1,
        tp2: trade.tp2,
        tp3: trade.tp3,
        tp4: trade.tp4,
        tp5: trade.tp5,
        tp6: trade.tp6
      },
      validation: {
        isValid: true,
        message: 'Trade forced by user (TP1 adjusted)',
        volumeAnalysis: {
          color: 'green',
          stdBar: 0,
          currentVolume: 0,
          mean: 0,
          std: 0
        },
        entryAnalysis: {
          currentClose: trade.entry,
          canEnter: true,
          hasClosePriceBeforeEntry: true,
          message: 'Trade forced by user (TP1 adjusted)'
        }
      },
      analysisUrl: trade.url_analysis || '',
      volume_adds_margin: trade.volume_adds_margin,
      setup_description: trade.setup_description,
      volume_required: trade.volume_required,
      sentiment_required: trade.sentiment_required,
      sentiment_adds_margin: trade.sentiment_adds_margin,
      interval: trade.interval,
      timestamp: new Date().toISOString()
    }
    console.log(tradeNotification)
    await axios.post('/api/trade/market/tp_adjusted', tradeNotification)
    showSuccessToast()
  } catch (error) {
    console.error('Error entering market with modified TP1:', error)
    alert('Failed to enter market with modified TP1. Please try again.')
  } finally {
    trades.value[tradeIndex].isLoadingTP1 = false
  }
}

const scrollToSymbol = (symbol: string) => {
  const el = document.getElementById(`symbol-${symbol}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// Initialize
onMounted(() => {
  loadTrades()
})
</script>

<style scoped>
/* Scoped styles removed */
</style>
