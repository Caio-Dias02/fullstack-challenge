import { IsString, IsUUID } from "class-validator";

export class CreateCommentDto {
  @IsUUID()
  taskId: string;

  @IsUUID()
  authorId: string;

  @IsString()
  body: string;
}
