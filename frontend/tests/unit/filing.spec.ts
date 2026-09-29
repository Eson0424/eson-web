import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ICP_BEIAN_LINK,
  SECURITY_BEIAN_ICON,
  SECURITY_BEIAN_QUERY,
  resolveSecurityBeianLink,
} from '~/utils/filing'

// 备案信息是合规展示内容：链接拼错或图标缺失都属于线上事故，用单测锁住。

describe('footer 备案链接', () => {
  it('ICP 指向工信部备案系统', () => {
    expect(ICP_BEIAN_LINK).toBe('https://beian.miit.gov.cn/')
  })

  it('公安备案编号解析为平台标准查询链接', () => {
    expect(resolveSecurityBeianLink('粤公网安备44030002017573号')).toBe(
      'https://beian.mps.gov.cn/#/query/webSearch?code=44030002017573',
    )
  })

  it('取不到机构代码时退回官方查询页', () => {
    expect(resolveSecurityBeianLink('')).toBe(SECURITY_BEIAN_QUERY)
    expect(resolveSecurityBeianLink('公安备案')).toBe(SECURITY_BEIAN_QUERY)
  })

  it('公安备案图标存在于前端静态资源目录', () => {
    expect(SECURITY_BEIAN_ICON).toBe('/beian.png')
    expect(existsSync(join(process.cwd(), 'public', 'beian.png'))).toBe(true)
  })
})
