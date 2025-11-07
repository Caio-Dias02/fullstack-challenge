import { IsString, IsOptional, IsArray, IsEnum, IsDateString, MaxLength, MinLength, IsUUID, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { TaskStatus, TaskPriority } from './create-task.dto';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDate implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) return true;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }

  defaultMessage() {
    return 'dueDate must be today or in the future';
  }
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  @Validate(IsFutureDate)
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignees?: string[];
}
