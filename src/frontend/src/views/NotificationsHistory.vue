<template>
  <div class="container mx-auto px-4 py-8">
    <button class="mb-6 flex items-center text-gray-400 hover:text-white transition-colors" @click="goBack">
      <span class="mr-2">←</span> Back
    </button>
    <h1 class="text-2xl font-bold text-white mb-6">Notifications History</h1>
    
    <div v-if="loading && notifications.length === 0" class="text-center text-gray-400 py-8">
        Loading...
    </div>

    <div v-else-if="error" class="text-center text-red-500 py-8">
        {{ error }}
    </div>

    <template v-else>
        <TradeListNotifications :trades="notifications" :key="notifications.length" />
        
        <div v-if="hasMore" class="mt-8 flex justify-center">
            <button 
                @click="loadMore" 
                :disabled="loadingMore"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
                <span v-if="loadingMore" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                {{ loadingMore ? 'Loading...' : 'Load More' }}
            </button>
        </div>
        <div v-else-if="notifications.length > 0" class="mt-8 text-center text-gray-500">
            No more notifications to load
        </div>
    </template>
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
    const loadingMore = ref(false)
    const error = ref<string | null>(null)
    const page = ref(1)
    const hasMore = ref(true)
    const PAGE_SIZE = 15

    const fetchNotifications = async (isLoadMore = false) => {
      try {
        if (isLoadMore) {
            loadingMore.value = true
        } else {
            loading.value = true
        }
        
        const response = await axios.get(`/api/notifications?page=${page.value}&limit=${PAGE_SIZE}`)
        const newNotifications = response.data

        if (newNotifications.length < PAGE_SIZE) {
            hasMore.value = false
        }

        if (isLoadMore) {
            notifications.value = [...notifications.value, ...newNotifications]
        } else {
            notifications.value = newNotifications
        }
      } catch (err) {
        error.value = 'Erro ao carregar notificações'
        console.error('Error fetching notifications:', err)
      } finally {
        loading.value = false
        loadingMore.value = false
      }
    }

    const loadMore = () => {
        page.value++
        fetchNotifications(true)
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
      loadingMore,
      error,
      hasMore,
      loadMore,
      goBack
    }
  }
})
</script>

<style>
/* Global styles or minimal overrides if needed */
</style>