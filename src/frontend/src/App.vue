<template>
  <div class="min-h-screen">
    <nav class="glass-header sticky top-0 z-50 mb-8">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between items-center min-h-[4rem] py-2 md:py-0">
          <div class="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
            <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Trade Manager</h1>
            <div class="flex flex-wrap justify-center gap-2 md:gap-4 w-full md:w-auto">
              <router-link to="/" class="nav-link text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/5 text-sm md:text-base" active-class="bg-blue-600/20 text-blue-400">Trades</router-link>
              <router-link to="/dashboard" class="nav-link text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/5 text-sm md:text-base" active-class="bg-blue-600/20 text-blue-400">Dashboard</router-link>
              <router-link to="/notifications" class="nav-link text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/5 text-sm md:text-base" active-class="bg-blue-600/20 text-blue-400">Notificações</router-link>
            </div>
          </div>
        </div>
      </div>
    </nav>


    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>

    
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

// Initialize dark mode
onMounted(() => {
  document.documentElement.classList.add('dark')
})
</script>

 