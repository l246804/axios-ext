---
'@iel/axios-ext': patch
'@iel/axios-ext-cache': patch
'@iel/axios-ext-cancel-repeat': minor
'@iel/axios-ext-log': patch
'@iel/axios-ext-preset': major
'@iel/axios-ext-response-wrap': patch
'@iel/axios-ext-retry': patch
'@iel/axios-ext-utils': patch
---

chore: optimize

- 优化类型文件生成
- 优化插件模板生成
- 补充说明文档
- 修复 `isPlainObject` 实现方式
- 修改预设插件使用方式
- 优化响应包装器 `getResponseErrorMsg` 实现方式
- `CancelRepeat` 插件增加主动取消未完成接口功能
- 调整示例使用方式
