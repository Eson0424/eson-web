import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

/** 约束与 docs/API.md §17 一致（name 1–100、subject 1–200、message 1–5000） */
export class CreateContactMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string
}
