<template>
  <div class="container mx-auto px-4 py-8">
    <button class="mb-6 flex items-center text-gray-400 hover:text-white transition-colors" @click="goBack">
      <span class="mr-2">←</span> Back
    </button>
    <h1 class="text-2xl font-bold text-white mb-6">Notifications History</h1>
    <TradeListNotifications :trades="notifications" :key="notifications.length" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import TradeListNotifications from '../components/TradeListNotifications.vue'
import axios from 'axios'
import { TradeNotification } from '../../../utils/types'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'NotificationsHistory',
  components: {
    TradeListNotifications
  },
  setup() {
    const router = useRouter()
    const notifications = ref<TradeNotification[]>([])
    const loading = ref(true)
    const error = ref<string | null>(null)

    const fetchNotifications = async () => {
      try {
        loading.value = true
        const response = await axios.get('/api/notifications')
        notifications.value = response.data
        console.log(notifications.value)
        console.log(notifications)
        console.log(response.data)
      } catch (err) {
        error.value = 'Erro ao carregar notificações'
        console.error('Error fetching notifications:', err)
      } finally {
        loading.value = false
      }
    }

    const goBack = () => {
      router.back()
    }

    onMounted(() => {
      fetchNotifications()
    })

    return {
      notifications,
      loading,
      error,
      goBack
    }
  }
})
</script>

<style>
/* Global styles or minimal overrides if needed */
</style> 