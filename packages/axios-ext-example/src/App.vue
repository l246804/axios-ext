<script setup lang="ts">
import * as Base from './services/interfaces/base'

const withCache = (forceUpdate = false) => Base.withCache(forceUpdate)
</script>

<template>
  <!-- eslint-disable vue/no-multiple-template-root -->
  <button @click="withCache(false)">withCache</button>
  <button @click="withCache(true)">withCache(forceUpdate)</button>
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
