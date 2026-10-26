import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateMascotStatusDto {
  @ApiProperty({
    example: false,
    description: 'Trạng thái hoạt động của linh vật (true: kích hoạt, false: ẩn/vô hiệu hóa)',
  })
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive: boolean;
}
