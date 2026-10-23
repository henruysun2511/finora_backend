import { PartialType } from '@nestjs/swagger';
import { CreateMascotDto } from './create-mascot.dto';

export class UpdateMascotDto extends PartialType(CreateMascotDto) {}
