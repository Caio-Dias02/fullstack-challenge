import { IsString, IsOptional } from "class-validator";

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  body?: string;
}
