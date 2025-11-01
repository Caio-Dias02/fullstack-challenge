import { IsEmail, IsString, ValidateIf, IsOptional } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  password: string;
}
    