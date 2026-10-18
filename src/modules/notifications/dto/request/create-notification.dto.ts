import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { NotificationType } from '../../enums/notification-type.enum';

export class CreateNotificationDto {
  @IsUUID('4', { message: 'userId phải là UUID v4' })
  @IsNotEmpty({ message: 'userId không được để trống' })
  userId: string;

  @IsEnum(NotificationType, { message: 'type không hợp lệ' })
  @IsNotEmpty({ message: 'type không được để trống' })
  type: NotificationType;

  @IsString({ message: 'title phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'title không được để trống' })
  @MaxLength(255, { message: 'title tối đa 255 ký tự' })
  title: string;

  @IsString({ message: 'body phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'body không được để trống' })
  body: string;

  @IsOptional()
  @IsString({ message: 'relatedEntityType phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'relatedEntityType tối đa 100 ký tự' })
  relatedEntityType?: string;

  @IsOptional()
  @IsUUID('4', { message: 'relatedEntityId phải là UUID v4' })
  relatedEntityId?: string;
}
