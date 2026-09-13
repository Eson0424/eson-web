import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// 回归守卫：模板里引用的自定义组件必须真的存在（Nuxt 自动导入清单为准）。
// 背景：曾经出现 LoadingState / ErrorState 被大量引用但组件文件缺失，
// 生产构建下 Vue 不会报错，只是静默渲染不出任何内容。

const APP_DIR = join(process.cwd(), 'app')
const MANIFEST = join(process.cwd(), '.nuxt/components.d.ts')

/** Vue 内置组件由运行时提供，不在自动导入清单里。 */
const BUILTIN_COMPONENTS = new Set([
  'Component',
  'KeepAlive',
  'Suspense',
  'Teleport',
  'Transition',
  'TransitionGroup',
])

function listVueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)

    if (statSync(path).isDirectory()) {
      return listVueFiles(path)
    }

    return path.endsWith('.vue') ? [path] : []
  })
}

function templateOf(source: string): string {
  const match = source.match(/<template>([\s\S]*?)<\/template>/)

  return match?.[1] ?? ''
}

function usedComponents(): Map<string, string> {
  const used = new Map<string, string>()

  for (const file of listVueFiles(APP_DIR)) {
    const template = templateOf(readFileSync(file, 'utf8'))

    for (const match of template.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)) {
      const name = match[1]!

      if (!BUILTIN_COMPONENTS.has(name) && !used.has(name)) {
        used.set(name, relative(process.cwd(), file))
      }
    }
  }

  return used
}

function declaredComponents(): Set<string> {
  const source = readFileSync(MANIFEST, 'utf8')
  const declared = new Set<string>()

  for (const match of source.matchAll(/export const (?!Lazy)([A-Za-z0-9]+):/g)) {
    declared.add(match[1]!)
  }

  return declared
}

const hasManifest = existsSync(MANIFEST)

describe.skipIf(!hasManifest)('component resolution', () => {
  it('resolves every component referenced in app templates', () => {
    const declared = declaredComponents()
    const unresolved = [...usedComponents().entries()]
      .filter(([name]) => !declared.has(name))
      .map(([name, file]) => `${name} (${file})`)
      .sort()

    expect(unresolved).toEqual([])
  })
})
