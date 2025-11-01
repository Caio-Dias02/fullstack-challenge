import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString({ message: 'Body must be a string' })
  @MinLength(1, { message: 'Comment body must not be empty' })
  @MaxLength(1000, { message: 'Comment body must not exceed 1000 characters' })
  body: string;

  // authorId é extraído do JWT token (req.user.userId)
  // taskId é extraído da URL (/tasks/:taskId/comments)
}
