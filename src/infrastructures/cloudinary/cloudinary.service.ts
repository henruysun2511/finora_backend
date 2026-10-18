import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY_CONSTANTS } from './cloudinary.constant';
import {
  IUploadMediaInput,
  DeleteMediaDto,
  UploadMediaResponseDto,
} from './cloudinary.dto';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Upload file đa phương tiện (ảnh, hóa đơn, âm thanh) lên Cloudinary
   */
  async uploadMedia(
    file: IUploadMediaInput,
    customFolder?: string,
  ): Promise<UploadMediaResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Tệp tải lên không hợp lệ');
    }

    const isAudio = file.mimetype.startsWith('audio/');
    const resourceType = isAudio ? 'video' : 'image';
    const folder =
      customFolder ||
      (isAudio
        ? CLOUDINARY_CONSTANTS.FOLDERS.AUDIO
        : CLOUDINARY_CONSTANTS.FOLDERS.GENERAL);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            this.logger.error(`Upload Cloudinary thất bại: ${error.message}`);
            return reject(
              new BadRequestException(`Tải lên Cloudinary thất bại: ${error.message}`),
            );
          }

          if (!result) {
            return reject(
              new BadRequestException('Phản hồi trống từ dịch vụ Cloudinary'),
            );
          }

          const response: UploadMediaResponseDto = {
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            duration: (result as any).duration,
          };

          resolve(response);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Xóa file khỏi Cloudinary theo publicId
   */
  async deleteMedia(dto: DeleteMediaDto): Promise<{ success: boolean; result: string }> {
    try {
      const result = await cloudinary.uploader.destroy(dto.publicId, {
        resource_type: dto.resourceType || 'image',
      });

      if (result.result === 'not_found') {
        throw new BadRequestException('Tệp không tồn tại trên Cloudinary');
      }

      return {
        success: result.result === 'ok',
        result: result.result,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      this.logger.error(`Xóa Cloudinary thất bại: ${message}`);
      throw new BadRequestException(`Xóa media thất bại: ${message}`);
    }
  }
}
