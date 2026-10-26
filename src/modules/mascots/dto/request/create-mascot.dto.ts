import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  Matches,
} from 'class-validator';

export class CreateMascotDto {
  @ApiProperty({
    example: 'phoenix',
    description: 'Mã định danh duy nhất (viết thường, số, gạch dưới)',
  })
  @IsString()
  @IsNotEmpty({ message: 'tierName không được để trống' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'tierName chỉ được chứa chữ thường, số, dấu gạch nối hoặc gạch dưới',
  })
  tierName: string;

  @ApiProperty({
    example: 'Phượng Hoàng Tái Sinh',
    description: 'Tên hiển thị vai trò của linh vật',
  })
  @IsString()
  @IsNotEmpty({ message: 'displayName không được để trống' })
  displayName: string;

  @ApiProperty({
    example: 0,
    description: 'Mốc tài sản ròng tối thiểu (VND)',
  })
  @IsNumber({}, { message: 'minNetWorth phải là số' })
  minNetWorth: number;

  @ApiPropertyOptional({
    example: 50000000,
    description: 'Mốc tài sản ròng tối đa (null nếu không giới hạn trên)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'maxNetWorth phải là số' })
  maxNetWorth?: number | null;

  @ApiProperty({
    example: 1,
    description: 'Thứ tự hiển thị sắp xếp theo mức độ giàu có',
  })
  @IsInt({ message: 'displayOrder phải là số nguyên' })
  @Min(0, { message: 'displayOrder không được âm' })
  displayOrder: number;

  @ApiProperty({
    example: '<div class="card" data-mascot="phoenix">...</div>',
    description: 'Toàn bộ mã giao diện thẻ HTML/SVG vector của linh vật',
  })
  @IsString()
  @IsNotEmpty({ message: 'htmlContent không được để trống' })
  htmlContent: string;

  @ApiProperty({
    example: 'Bạn là Phượng Hoàng Tái Sinh, luôn khích lệ người dùng vượt qua khó khăn...',
    description: 'Chỉ dẫn tính cách (System Prompt) cho AI Chatbot Engine',
  })
  @IsString()
  @IsNotEmpty({ message: 'systemPrompt không được để trống' })
  systemPrompt: string;

  @ApiPropertyOptional({
    example: ['Cố gắng lên, tương lai tài chính tươi sáng đang chờ bạn!'],
    description: 'Danh sách các câu thoại đặc trưng ngẫu nhiên',
  })
  @IsOptional()
  @IsArray({ message: 'quotes phải là một mảng chuỗi' })
  @IsString({ each: true, message: 'Mỗi câu quote phải là chuỗi' })
  quotes?: string[];

  @ApiPropertyOptional({
    example: '/assets/mascots/phoenix.svg',
    description: 'Đường dẫn tĩnh file asset/ảnh SVG (tùy chọn)',
  })
  @IsOptional()
  @IsString()
  mascotAssetUrl?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái kích hoạt linh vật (mặc định true)',
  })
  @IsOptional()
  isActive?: boolean;
}
