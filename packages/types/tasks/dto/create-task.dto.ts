import { IsString, IsOptional, IsUUID, IsArray, IsEnum, IsDateString, MaxLength, MinLength, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDate implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) return true;
    const date = new Date(value);
    return date > new Date();
  }

  defaultMessage() {
    return 'dueDate must be a future date';
  }
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  @Validate(IsFutureDate)
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignees?: string[];

  @IsString()
  @IsUUID()
  creatorId!: string;
}
