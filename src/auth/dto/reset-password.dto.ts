import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  password!: string;
}
