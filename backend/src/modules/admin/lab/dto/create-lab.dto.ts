import { CreateContentDto } from '../../shared/create-content.dto.js'

/** Lab 的字段与公共内容字段一致（labs 没有 start_date / end_date） */
export class CreateLabDto extends CreateContentDto {}
