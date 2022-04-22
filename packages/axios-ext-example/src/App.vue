<script setup lang="ts">
import { ref, watch } from 'vue'
import * as Base from './services/interfaces/base'
/**
 * 格式化日期
 * @param {string | number | Date} value 指定日期
 * @param {string} format 格式化的规则
 * @example
 * ```js
 * formatDate();
 * formatDate(1603264465956);
 * formatDate(1603264465956, "h:m:s");
 * formatDate(1603264465956, "Y年M月D日");
 * ```
 */
function formatDate(value: any, format = 'Y-M-D h:m:s') {
  if (!value) return ''

  const formatNumber = (n: number) => `0${n}`.slice(-2)
  const date = new Date(value)
  const formatList = ['Y', 'M', 'D', 'h', 'm', 's']
  const resultList = []

  resultList.push(date.getFullYear().toString())
  resultList.push(formatNumber(date.getMonth() + 1))
  resultList.push(formatNumber(date.getDate()))
  resultList.push(formatNumber(date.getHours()))
  resultList.push(formatNumber(date.getMinutes()))
  resultList.push(formatNumber(date.getSeconds()))

  for (let i = 0; i < resultList.length; i++) {
    format = format.replace(formatList[i], resultList[i])
  }

  return format
}

const result = ref('')
const startTime = ref<number>()
const endTime = ref<number>()
const interval = ref(0)

watch([startTime, endTime], ([_startTime, _endTime]) => {
  if (_startTime === undefined || _endTime === undefined) return
  interval.value = _endTime - _startTime
})

const testApi = async (api: any, ...args: any[]) => {
  startTime.value = undefined
  endTime.value = undefined
  result.value = '加载中...'
  startTime.value = Date.now()
  try {
    const [, data] = await api(...args)
    result.value = JSON.stringify(data, null, 2)
  } catch (err: any) {
    result.value = err.message
  }
  endTime.value = Date.now()
}

const rawRequest = () => {
  testApi(Base.rawRequest)
}
const request = () => {
  testApi(Base.request)
}
const withCache = async (forceUpdate = false) => {
  testApi(Base.withCache, forceUpdate)
}
const notAllowRepeat = async () => {
  testApi(Base.notAllowRepeat)
}
const allowRepeat = async () => {
  testApi(Base.allowRepeat)
}
const responseWrap = async () => {
  testApi(Base.responseWrap)
}
const retry = () => {
  testApi(Base.retry)
}
</script>

<template>
  <!-- eslint-disable vue/no-multiple-template-root -->
  <h3>使用 network 控制网速测试扩展功能</h3>
  <div>
    <button @click="rawRequest()">rawRequest</button>
    <button @click="request()">request</button>
    <button @click="withCache(false)">withCache</button>
    <button @click="withCache(true)">withCache(forceUpdate)</button>
    <button @click="notAllowRepeat">notAllowRepeat</button>
    <button @click="allowRepeat">allowRepeat</button>
    <button @click="responseWrap">responseWrap</button>
    <button @click="retry">retry</button>
  </div>
  <div style="margin-top: 20px">
    <textarea style="width: 800px; height: 500px" :value="result"></textarea>
  </div>
  <div>
    <p>
      开始时间：<span style="display: inline-block; width: 200px">{{ formatDate(startTime) }}</span>
    </p>
    <p>
      结束时间：<span style="display: inline-block; width: 200px">{{ formatDate(endTime) }}</span>
    </p>
    <p>
      执行时间：<span style="display: inline-block; width: 200px">{{ interval }}ms</span>
    </p>
  </div>
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
