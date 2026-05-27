import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;
}
