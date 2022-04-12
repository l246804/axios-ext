<script setup lang="ts">
import * as Base from './services/interfaces/base'

const rawRequest = async () => {
  Base.rawRequest()
}
const request = () => {
  Base.request()
}
const withCache = (forceUpdate = false) => {
  Base.withCache(forceUpdate)
}
const notAllowRepeat = () => {
  Base.notAllowRepeat()
}
const allowRepeat = () => {
  Base.allowRepeat()
}
const responseWrap = async () => {
  const [error, data] = await Base.responseWrap<{ a: boolean; b: string }>()

  if (error) {
    return alert(data)
  }

  console.log('response wrap data: ', data)
}
</script>

<template>
  <!-- eslint-disable vue/no-multiple-template-root -->
  <button @click="rawRequest()">rawRequest</button>
  <button @click="request()">request</button>
  <button @click="withCache(false)">withCache</button>
  <button @click="withCache(true)">withCache(forceUpdate)</button>
  <button @click="notAllowRepeat">notAllowRepeat</button>
  <button @click="allowRepeat">allowRepeat</button>
  <button @click="responseWrap">responseWrap</button>
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
