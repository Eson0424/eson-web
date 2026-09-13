import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: './',
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup.ts'],
    /**
     * e2e 文件共享同一个真实 PostgreSQL：
     * 并行执行时，一个文件创建/删除的数据会与另一个文件的关系测试互相干扰
     * （例如 Media 增删 vs Work/Lab/Writing 的 media 引用）。顺序执行保证确定性。
     */
    fileParallelism: false,
  },
})
