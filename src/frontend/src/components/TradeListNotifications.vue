<template>
  <div>
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
    <div v-if="trades.length === 0" class="text-center text-muted">
      No trade notifications received yet
    </div>
    <div v-else class="list-group">
      <div v-for="(trade, index) in trades" :key="index" class="list-group-item">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="mb-0">{{ trade.symbol }}</h6>
              <small class="text-muted">{{ formatTimestamp(trade.timestamp) }}</small>
            </div>
            <div class="d-flex gap-3">
              <span class="badge" :class="trade.type === 'LONG' ? 'bg-success' : 'bg-danger'">
                {{ trade.type }}
              </span>
              <span>Entry: {{ trade.entry }}</span>
              <span>Stop: {{ trade.stop }}</span>
              <span>Interval: {{ trade.interval }}</span>
            </div>
            <div class="mt-2">
              <strong>Take Profits:</strong>
              <div class="d-flex flex-wrap gap-3">
                <span v-if="trade.takeProfits.tp1">TP1: {{ trade.takeProfits.tp1 }}</span>
                <span v-if="trade.takeProfits.tp2">TP2: {{ trade.takeProfits.tp2 }}</span>
                <span v-if="trade.takeProfits.tp3">TP3: {{ trade.takeProfits.tp3 }}</span>
                <span v-if="trade.takeProfits.tp4">TP4: {{ trade.takeProfits.tp4 }}</span>
                <span v-if="trade.takeProfits.tp5">TP5: {{ trade.takeProfits.tp5 }}</span>
                <span v-if="trade.takeProfits.tp6">TP6: {{ trade.takeProfits.tp6 }}</span>
              </div>
            </div>
            <div class="mt-2">
              <div class="d-flex gap-2 align-items-center">
                <span class="badge" :class="trade.validation.isValid ? 'bg-success' : 'bg-danger'">
                  {{ trade.validation.isValid ? 'Valid' : 'Invalid' }}
                </span>
                <span v-if="trade.isWarning" class="badge bg-warning text-dark">
                  ⚠️ Warning
                </span>
                <span class="badge" :class="trade.volume_required ? 'bg-danger' : 'bg-success'">
                  {{ trade.volume_required ? 'Volume Required' : 'Volume Optional' }}
                </span>
                <span class="badge" :class="trade.volume_adds_margin ? 'bg-success' : 'bg-secondary'">
                  {{ trade.volume_adds_margin ? 'Adds Margin' : 'No Extra Margin' }}
                </span>
                <span class="badge" :class="trade.manually_generated ? 'bg-info' : 'bg-secondary'">
                  {{ trade.manually_generated ? 'Manual' : 'Auto' }}
                </span>
                <small class="text-muted">{{ trade.validation.message }}</small>
              </div>
              <div class="mt-1">
                <small class="text-muted">Entry Analysis: {{ trade.validation.entryAnalysis.message }}</small>
              </div>
              <div class="mt-1">
                <small class="text-muted">
                  Volume: {{ trade.validation.volumeAnalysis.currentVolume.toFixed(2) }}
                  (std: {{ trade.validation.volumeAnalysis.stdBar.toFixed(2) }})
                  <span class="ms-1" :class="{
                    'text-danger': trade.validation.volumeAnalysis.color === 'RED',
                    'text-warning': trade.validation.volumeAnalysis.color === 'ORANGE',
                    'text-info': trade.validation.volumeAnalysis.color === 'YELLOW',
                    'text-secondary': trade.validation.volumeAnalysis.color === 'WHITE',
                    'text-primary': trade.validation.volumeAnalysis.color === 'BLUE'
                  }">
                    [{{ trade.validation.volumeAnalysis.color }}]
                  </span>
                </small>
              </div>
              <div v-if="trade.setup_description" class="mt-2">
                <div class="card bg-light">
                  <div class="card-body p-2">
                    <h6 class="card-title mb-1">Setup Description</h6>
                    <small class="text-muted">{{ trade.setup_description }}</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Execution Results Section -->
            <div v-if="trade.executionResult" class="mt-2">
              <div class="card bg-light">
                <div class="card-body p-2">
                  <h6 class="card-title mb-2">Execution Results</h6>
                  <div class="d-flex flex-column gap-1">
                    <div class="d-flex justify-content-between">
                      <small>Leverage:</small>
                      <small class="fw-bold">{{ trade.executionResult.leverage }}x</small>
                    </div>
                    <div class="d-flex justify-content-between">
                      <small>Quantity:</small>
                      <small class="fw-bold">{{ trade.executionResult.quantity.toFixed(4) }}</small>
                    </div>
                    <div v-if="trade.volume_adds_margin && trade.executionResult.volumeMarginAdded"
                      class="mt-2 pt-2 border-top">
                      <div class="d-flex justify-content-between">
                        <small>Volume Margin:</small>
                        <small class="fw-bold text-success">+{{ trade.executionResult.volumeMarginAdded.percentage
                        }}%</small>
                      </div>
                    </div>
                    <div v-if="trade.sentiment_adds_margin && trade.executionResult.sentimentMarginAdded"
                      class="mt-2 pt-2 border-top">
                      <div class="d-flex justify-content-between">
                        <small>Sentiment Margin:</small>
                        <small class="fw-bold text-success">+{{ trade.executionResult.sentimentMarginAdded.percentage
                        }}%</small>
                      </div>
                    </div>
                    <div class="d-flex justify-content-between">
                      <small>Entry Order:</small>
                      <small class="text-truncate" style="max-width: 150px;">{{ trade.executionResult.entryOrderId
                      }}</small>
                    </div>
                    <div class="d-flex justify-content-between">
                      <small>Stop Order:</small>
                      <small class="text-truncate" style="max-width: 150px;">{{ trade.executionResult.stopOrderId
                      }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Execution Error Section -->
            <div v-if="trade.executionError" class="mt-2">
              <div class="alert alert-danger p-2 mb-0">
                <small class="d-flex align-items-center">
                  <i class="bi bi-exclamation-triangle-fill me-1"></i>
                  <span>Execution Error: {{ trade.executionError }}</span>
                </small>
              </div>
            </div>

            <div class="mt-2">
              <div class="d-flex gap-2">
                <a :href="trade.analysisUrl" target="_blank" class="btn btn-sm btn-outline-primary">
                  View Analysis
                </a>
                <template v-if="trade.isWarning">
                  <button @click="enterMarket(trade)" class="btn btn-sm btn-success" :disabled="trade.isLoading">
                    <span v-if="trade.isLoading" class="spinner-border spinner-border-sm me-1" role="status"
                      aria-hidden="true"></span>
                    {{ trade.isLoading ? 'Entering...' : 'Enter Market' }}
                  </button>
                  <button @click="enterMarketWithTP1(trade)" class="btn btn-sm btn-warning"
                    :disabled="trade.isLoadingTP1">
                    <span v-if="trade.isLoadingTP1" class="spinner-border spinner-border-sm me-1" role="status"
                      aria-hidden="true"></span>
                    {{ trade.isLoadingTP1 ? 'Entering...' : 'Enter Market (TP1 Adjusted)' }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from 'vue'
import { TradeNotification } from '../../../utils/types'
import axios from 'axios'
import { Toast } from 'bootstrap'

const props = defineProps<{
  trades: TradeNotification[]
}>()

// Add loading states to trades
const trades = ref(props.trades.map(trade => ({
  ...trade,
  isLoading: false,
  isLoadingTP1: false
})))

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const showSuccessToast = () => {
  const toastEl = document.getElementById('successToast')
  if (toastEl) {
    const toast = new Toast(toastEl)
    toast.show()
  }
}

const enterMarket = async (trade: TradeNotification) => {
  const tradeIndex = trades.value.findIndex(t => t === trade)
  if (tradeIndex === -1) return

  trades.value[tradeIndex].isLoading = true
  try {
    await axios.post('/api/trade/market', trade)
    showSuccessToast()
  } catch (error) {
    console.error('Error entering market:', error)
    alert('Failed to enter market. Please try again.')
  } finally {
    trades.value[tradeIndex].isLoading = false
  }
}

const enterMarketWithTP1 = async (trade: TradeNotification) => {
  const tradeIndex = trades.value.findIndex(t => t === trade)
  if (tradeIndex === -1) return

  trades.value[tradeIndex].isLoadingTP1 = true
  try {
    await axios.post('/api/trade/market/tp_adjusted', trade)
    showSuccessToast()
  } catch (error) {
    console.error('Error entering market with modified TP1:', error)
    alert('Failed to enter market with modified TP1. Please try again.')
  } finally {
    trades.value[tradeIndex].isLoadingTP1 = false
  }
}
</script>

<style scoped>
.list-group-item {
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color);
}

[data-bs-theme="dark"] .list-group-item {
  background-color: #343a40;
  border-color: #495057;
}

/* Execution Results Styles */
.card.bg-light {
  background-color: rgba(var(--bs-light-rgb), 0.1) !important;
  border: 1px solid rgba(var(--bs-border-color-rgb), 0.2);
}

[data-bs-theme="dark"] .card.bg-light {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.1);
}

.card-title {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin-bottom: 0.5rem;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-danger {
  background-color: rgba(var(--bs-danger-rgb), 0.1);
  border-color: rgba(var(--bs-danger-rgb), 0.2);
}

[data-bs-theme="dark"] .alert-danger {
  background-color: rgba(220, 53, 69, 0.2);
  border-color: rgba(220, 53, 69, 0.3);
}

.bi-exclamation-triangle-fill {
  color: var(--bs-danger);
}

/* Volume color styles */
.text-danger {
  color: var(--bs-danger) !important;
}

.text-warning {
  color: var(--bs-warning) !important;
}

.text-info {
  color: var(--bs-info) !important;
}

.text-secondary {
  color: var(--bs-secondary) !important;
}

.text-primary {
  color: var(--bs-primary) !important;
}

/* Setup description card styles */
.card.bg-light .card-title {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin-bottom: 0.5rem;
}

[data-bs-theme="dark"] .card.bg-light {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.1);
}

[data-bs-theme="dark"] .card.bg-light .card-title {
  color: var(--bs-light);
}

.btn-sm {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.gap-2 {
  gap: 0.5rem !important;
}

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
</style> 
