import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import {
  DeleteMediaDto,
  UploadMediaDto,
  UploadMediaResponseDto,
} from './cloudinary.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ApiResponse } from '../../common/response/api-response';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';

@ApiTags('Cloudinary Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'finora/receipts' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @SwaggerDoc({
    summary: 'Tải tệp đa phương tiện lên Cloudinary',
    description:
      'Hỗ trợ tải ảnh hóa đơn (receipts), ảnh giao dịch, hoặc ảnh đại diện lên Cloudinary.',
    responseType: UploadMediaResponseDto,
    status: 201,
    bearerAuth: true,
  })
  async uploadMedia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    const data = await this.cloudinaryService.uploadMedia(file, dto.folder);
    return ApiResponse.created(data, 'Tải lên media thành công');
  }

  @Delete('media')
  @SwaggerDoc({
    summary: 'Xóa tệp đa phương tiện khỏi Cloudinary',
    description: 'Xóa tệp theo publicId.',
    bearerAuth: true,
  })
  async deleteMedia(@Body() dto: DeleteMediaDto) {
    const data = await this.cloudinaryService.deleteMedia(dto);
    return ApiResponse.success(data, 'Xóa media thành công');
  }
}
