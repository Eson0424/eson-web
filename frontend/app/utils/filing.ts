/**
 * Footer 备案信息。
 *
 * 约束（与既有 ICP 实现保持一致）：
 * - 备案号本身不在仓库里写死，由部署环境注入
 *   （`NUXT_PUBLIC_ICP_BEIAN` / `NUXT_PUBLIC_SECURITY_BEIAN`）；
 * - 这里只放与备案号无关的固定入口地址与静态资源路径，以及一个纯函数，便于单测。
 */

/** 工信部 ICP/IP 地址/域名信息备案管理系统。 */
export const ICP_BEIAN_LINK = 'https://beian.miit.gov.cn/'

/** 公安备案官方图标（`frontend/public/beian.png`，由 Nitro 静态托管）。 */
export const SECURITY_BEIAN_ICON = '/beian.png'

/**
 * 全国公安机关互联网站安全服务平台的备案查询页。
 *
 * 平台给出的标准 HTML 形如
 * `<a href="https://beian.mps.gov.cn/#/query/webSearch?code=<机构代码>">`，
 * 机构代码即备案编号里的数字段（`粤公网安备44030002017573号` → `44030002017573`）。
 */
export const SECURITY_BEIAN_QUERY = 'https://beian.mps.gov.cn/#/query/webSearch'

/** 备案编号中的机构代码（数字段）。 */
const SECURITY_BEIAN_CODE_PATTERN = /\d{8,}/

/**
 * 解析公安备案查询链接。
 *
 * 主备案号本身可能带中文前缀/后缀，只取数字段拼查询参数；
 * 取不到机构代码时退回官方查询页，避免拼出一个无效地址。
 */
export function resolveSecurityBeianLink(beian: string): string {
  const code = SECURITY_BEIAN_CODE_PATTERN.exec(beian)?.[0]

  return code ? `${SECURITY_BEIAN_QUERY}?code=${code}` : SECURITY_BEIAN_QUERY
}
