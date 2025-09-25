<template>
  <main class="container py-4">
    <!-- Add Toast Container -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div id="successToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          <strong class="me-auto">Success</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          Trade executed successfully!
        </div>
      </div>
    </div>
    <div class="sticky-top bg-body-tertiary py-3 mb-4 d-flex justify-content-between align-items-center rounded px-3">
      <div class="d-flex gap-2">
        <router-link to="/trade/new" class="btn btn-primary">
          Add New Trade
        </router-link>
        <button @click="showStats = !showStats" class="btn btn-outline-secondary"
          :title="showStats ? 'Hide Statistics' : 'Show Statistics'">
          <i class="bi" :class="showStats ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
          Statistics
        </button>
        <button @click="showMarketButtons = !showMarketButtons" class="btn btn-outline-info"
          :title="showMarketButtons ? 'Hide Market Buttons' : 'Show Market Buttons'">
          <i class="bi" :class="showMarketButtons ? 'bi-eye-slash' : 'bi-eye'"></i>
          {{ showMarketButtons ? 'Hide Market Buttons' : 'Show Market Buttons' }}
        </button>
      </div>
      <div class="d-flex gap-2">
        <span class="badge bg-secondary">{{ trades.length }} {{ trades.length === 1 ? 'Trade' : 'Trades' }}</span>
        <span class="badge bg-info">{{ uniquePairs.length }} {{ uniquePairs.length === 1 ? 'Pair' : 'Pairs' }}</span>
        <span class="badge bg-success">{{ longCount }} LONG</span>
        <span class="badge bg-danger">{{ shortCount }} SHORT</span>
      </div>
    </div>

    <div v-if="showStats" class="card shadow-sm mb-4">
      <div class="card-body">
        <h6 class="card-title mb-3">Trade Statistics</h6>
        <div class="row g-3">
          <!-- Totals -->
          <div class="col-12">
            <div class="d-flex gap-2 align-items-center">
              <span class="text-muted">Total:</span>
              <span class="badge bg-secondary">{{ trades.length }} Trades</span>
              <span class="badge bg-info">{{ uniquePairs.length }} Pairs</span>
              <span class="badge bg-success">{{ longCount }} LONG</span>
              <span class="badge bg-danger">{{ shortCount }} SHORT</span>
            </div>
            <div class="mt-2">
              <span class="text-muted">Pairs:</span>
              <span v-for="pair in uniquePairs" :key="pair" class="badge bg-light text-dark me-1"
                style="cursor:pointer; text-decoration:underline;" @click="scrollToSymbol(pair)">{{ pair }}</span>
            </div>
          </div>

          <!-- By Interval -->
          <div class="col-12">
            <div class="d-flex flex-column gap-2">
              <div v-for="interval in ['5m', '15m', '1h']" :key="interval" class="d-flex gap-2 align-items-center">
                <span class="text-muted" style="min-width: 40px;">{{ interval }}:</span>
                <span class="badge bg-secondary">{{ getIntervalStats(interval).total }} Trades</span>
                <span class="badge bg-info">{{ getIntervalStats(interval).pairs }} Pairs</span>
                <span class="badge bg-success">{{ getIntervalStats(interval).long }} LONG</span>
                <span class="badge bg-danger">{{ getIntervalStats(interval).short }} SHORT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-dark">
            <tr>
              <th class="px-3 py-2">Pair & Setup</th>
              <th class="px-3 py-2">Type & Interval</th>
              <th class="px-3 py-2">Entry</th>
              <th class="px-3 py-2">Stop</th>
              <th class="px-3 py-2">Take Profits</th>
              <th class="px-3 py-2">Volume/Sentiment Flags</th>
              <th class="px-3 py-2">Analysis</th>
              <th class="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(trade, index) in trades" :key="index" :id="`symbol-${trade.symbol}`">
              <td class="px-3 py-2">
                <div class="d-flex flex-column">
                  <strong>{{ trade.symbol }}</strong>
                  <small v-if="trade.setup_description" class="text-muted"
                    style="max-width: 200px; white-space: normal;">
                    {{ trade.setup_description }}
                  </small>
                </div>
              </td>
              <td class="px-3 py-2">
                <div class="d-flex flex-column gap-1">
                  <span :class="{
                    'badge bg-success': trade.type === 'LONG',
                    'badge bg-danger': trade.type === 'SHORT'
                  }">
                    {{ trade.type }}
                  </span>
                  <span class="badge bg-secondary">
                    {{ trade.interval || '-' }}
                  </span>
                </div>
              </td>
              <td class="px-3 py-2">{{ trade.entry }}</td>
              <td class="px-3 py-2">{{ trade.stop }}</td>
              <td class="px-3 py-2">
                <div class="d-flex flex-wrap gap-1">
                  <template v-for="(tp, index) in getFormattedTPs(trade)" :key="index">
                    <span class="badge bg-info">
                      {{ tp.label }}: {{ tp.value }}
                    </span>
                  </template>
                  <span v-if="getFormattedTPs(trade).length === 0" class="text-muted">-</span>
                </div>
              </td>
              <td class="px-3 py-2">
                <div class="d-flex flex-column gap-1">
                  <span :class="trade.volume_required ? 'badge bg-success' : 'badge bg-secondary'">
                    {{ trade.volume_required ? 'Volume Required' : 'Volume Optional' }}
                  </span>
                  <span :class="trade.volume_adds_margin ? 'badge bg-success' : 'badge bg-secondary'">
                    {{ trade.volume_adds_margin ? 'Volume Adds Margin' : 'No Volume Margin' }}
                  </span>
                  <span :class="trade.sentiment_required ? 'badge bg-success' : 'badge bg-secondary'">
                    {{ trade.sentiment_required ? 'Sentiment Required' : 'Sentiment Optional' }}
                  </span>
                  <span :class="trade.sentiment_adds_margin ? 'badge bg-success' : 'badge bg-secondary'">
                    {{ trade.sentiment_adds_margin ? 'Sentiment Adds Margin' : 'No Sentiment Margin' }}
                  </span>
                </div>
              </td>
              <td class="px-3 py-2">
                <a v-if="trade.url_analysis" :href="trade.url_analysis" target="_blank"
                  class="btn btn-sm btn-outline-info">
                  View
                </a>
                <span v-else>-</span>
              </td>
              <td class="px-3 py-2">
                <div class="d-flex gap-2">
                  <router-link :to="`/trade/${index}/edit`" class="btn btn-sm btn-outline-primary">
                    Edit
                  </router-link>
                  <button @click="deleteTrade(index)" class="btn btn-sm btn-outline-danger">
                    Delete
                  </button>
                  <template v-if="showMarketButtons">
                    <button @click="enterMarket(trade)" class="btn btn-sm btn-success" :disabled="trade.isLoading">
                      <span v-if="trade.isLoading" class="spinner-border spinner-border-sm me-1" role="status"
                        aria-hidden="true"></span>
                      {{ trade.isLoading ? 'Entering...' : 'Enter' }}
                    </button>
                    <button @click="enterMarketWithTP1(trade)" class="btn btn-sm btn-warning"
                      :disabled="trade.isLoadingTP1">
                      <span v-if="trade.isLoadingTP1" class="spinner-border spinner-border-sm me-1" role="status"
                        aria-hidden="true"></span>
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
import { ref, onMounted, computed } from 'vue'
import TradeNotifications from '../components/TradeNotifications.vue'
import { Trade } from '../../../utils/types';
import { Toast } from 'bootstrap'
import axios from 'axios'


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

const showSuccessToast = () => {
  const toastEl = document.getElementById('successToast')
  if (toastEl) {
    const toast = new Toast(toastEl)
    toast.show()
  }
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
.toast-container {
  z-index: 1050;
}

.toast {
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
}

[data-bs-theme="dark"] .toast {
  background-color: #343a40;
  border-color: #495057;
}

.btn-sm {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.gap-2 {
  gap: 0.5rem !important;
}

.btn-outline-info {
  border-color: var(--bs-info);
  color: var(--bs-info);
}

.btn-outline-info:hover {
  background-color: var(--bs-info);
  color: var(--bs-white);
}

[data-bs-theme="dark"] .btn-outline-info {
  color: var(--bs-info);
  border-color: var(--bs-info);
}

[data-bs-theme="dark"] .btn-outline-info:hover {
  background-color: var(--bs-info);
  color: var(--bs-dark);
}
</style>
