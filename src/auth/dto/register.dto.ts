import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  // Opcional desde jul-2026: el alta pide solo email+contraseña (el nombre se
  // pone después en Ajustes). Si no llega, se deriva del email.
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72) // bcrypt trunca a 72 bytes
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe tener al menos una letra y un número',
  })
  password!: string;

  // Tipo de cuenta elegido en el registro. Solo 'user' (cliente) o 'maker'
  // (taller) — NUNCA 'admin'. Por defecto cliente si no se envía.
  @IsIn(['user', 'maker'])
  @IsOptional()
  accountType?: 'user' | 'maker';
}
