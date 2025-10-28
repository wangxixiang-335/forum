<template>
  <div id="app">
    <ConnectionStatus />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
</script>

<style>
#app {
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>