<script setup>
import { onBeforeMount } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
import { httpCache } from './services/http'
import { fetchList } from './services/interfaces/base'

onBeforeMount(() => {
  httpCache.dropStore()
})

fetchList()

const refetch = () => fetchList()
</script>

<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <HelloWorld msg="Hello Vue 3 + Vite" />
  <button @click="refetch">重新请求</button>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
