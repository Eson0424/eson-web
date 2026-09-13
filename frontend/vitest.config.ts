import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // 与 Nuxt 的 `~` alias 对齐，让 app/** 下的源码可以在单测中直接 import。
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    // 设计令牌测试需要读取 CSS 原文（?raw），因此必须处理 CSS。
    css: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
