<template>
  <div v-if="connectionStatus !== 'Disconnected' && connectionStatus !== 'Error'" class="container mx-auto mt-4 px-4">
    <audio ref="alertSound" src="/api/alert" preload="auto"></audio>
    <div class="glass-card">
      <div class="p-4 border-b border-white/10 flex justify-between items-center bg-blue-600/10">
        <div class="flex items-center gap-3">
          <h5 class="text-xl font-semibold text-white mb-0">Trade Notifications</h5>
          <router-link to="/notifications" class="px-3 py-1.5 border border-blue-500 text-blue-400 rounded hover:bg-blue-500/10 transition-colors text-sm flex items-center gap-2">
            <i class="bi bi-clock-history"></i> History
          </router-link>
        </div>
        <span class="px-3 py-1 rounded text-sm font-bold" :class="connectionStatusClass">{{ connectionStatus }}</span>
      </div>
      <div class="p-4">
        <TradeListNotifications :trades="trades" :key="trades.length" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TradeListNotifications from './TradeListNotifications.vue'
import { TradeNotification } from '../../../utils/types'

const router = useRouter()
const trades = ref<TradeNotification[]>([])
const connectionStatus = ref('Connecting...')
const connectionStatusClass = ref('bg-yellow-500/20 text-yellow-500')
let ws: WebSocket | null = null

const alertSound = ref<HTMLAudioElement | null>(null)

const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}`
  
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    connectionStatus.value = 'Connected'
    connectionStatusClass.value = 'bg-green-500/20 text-green-400'
  }

  ws.onclose = () => {
    connectionStatus.value = 'Disconnected'
    connectionStatusClass.value = 'bg-red-500/20 text-red-400'
    // Try to reconnect after 30 seconds
    setTimeout(connectWebSocket, 30000)
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    connectionStatus.value = 'Error'
    connectionStatusClass.value = 'bg-red-500/20 text-red-400'
  }

  ws.onmessage = (event) => {
    try {
      console.log('Received trade notification:', event.data)
      const trade: TradeNotification = JSON.parse(event.data)
      trades.value.unshift(trade) // Add new trade at the beginning
      playAlertSound() // Play alert sound when receiving a trade
      
      // Keep only the last 50 trades
      if (trades.value.length > 50) {
        trades.value = trades.value.slice(0, 50)
      }
    } catch (error) {
      console.error('Error parsing trade notification:', error)
    }
  }
}

const playAlertSound = () => {
  if (alertSound.value) {
    alertSound.value.currentTime = 0 // Reset the audio to start
    alertSound.value.play().catch(error => {
      console.error('Error playing alert sound:', error)
    })
  }
}

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

onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
/* Scoped styles removed */
</style> 