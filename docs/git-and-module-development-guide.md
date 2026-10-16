# 📘 HƯỚNG DẪN QUY TRÌNH GIT & PHÁT TRIỂN MODULE CHUẨN (FINORA BACKEND)

Tài liệu này hướng dẫn chi tiết từ quy trình làm việc với Git, quy tắc đặt tên (branch, module, endpoint, file) cho tới từng bước lập trình một module hoàn chỉnh trong dự án **Finora Backend** (`finora_be`) dựa trên module mẫu ([src/modules/sample](file:///f:/Project/FINORA/finora_be/src/modules/sample)).

---

## PHẦN 1: QUY TRÌNH LÀM VIỆC VỚI GIT & QUY ƯỚC NHÁNH (BRANCHING)

### 1.1 Quy ước đặt tên nhánh (Branch Naming Convention)
Nhánh `main` là nhánh nguồn chứa code ổn định. Mỗi lập trình viên khi nhận một module/tính năng **bắt buộc** phải checkout một nhánh riêng từ `main` mới nhất:

| Loại công việc | Cú pháp đặt tên nhánh | Ví dụ |
|---|---|---|
| Tính năng mới (Module/API) | `feature/<tên-module>` hoặc `feature/<mã-jira>-<tên-chức-năng>` | `feature/wallets`, `feature/accounts`, `feature/FINAPP-77-create-account` |
| Sửa lỗi (Bugfix) | `fix/<vấn-đề-cần-sửa>` | `fix/wallet-duplicate-name-check` |
| Tối ưu / Tái cấu trúc | `refactor/<tên-module>` | `refactor/auth-service` |
| Thêm kiểm thử | `test/<tên-module>` | `test/wallets-service` |

### 1.2 Vòng đời làm việc với Git (Step-by-step Git Workflow)

#### Bước 1: Đồng bộ code mới nhất từ `main`
```bash
git checkout main
git pull origin main
```

#### Bước 2: Tạo nhánh mới cho module cần làm
```bash
# Ví dụ làm module accounts:
git checkout -b feature/accounts
```

#### Bước 3: Tiến hành lập trình & Commit thường xuyên
Tuân thủ chuẩn **Conventional Commits** (`<type>: <mô tả ngắn>`):
- `feat:` Thêm tính năng/API mới (VD: `feat(wallets): implement create wallet api with owner assignment`)
- `fix:` Sửa lỗi (VD: `fix(wallets): resolve transaction rollback when creating member fails`)
- `refactor:` Tối ưu code mà không đổi logic nghiệp vụ
- `test:` Thêm unit test / integration test (VD: `test(wallets): add unit tests for createWallet method`)
- `docs:` Cập nhật tài liệu kỹ thuật

```bash
# Kiểm tra các file thay đổi
git status

# Add các file liên quan
git add src/modules/accounts/ test/accounts/

# Commit với thông điệp rõ ràng
git commit -m "feat(accounts): implement create account api and balance calculation"
```

#### Bước 4: Kiểm tra chất lượng code trước khi đẩy lên remote
Trước khi push, **bắt buộc** chạy 2 lệnh sau ở máy local để đảm bảo không gãy build:
```bash
# 1. Kiểm tra lỗi kiểu dữ liệu TypeScript
npm run typecheck

# 2. Chạy kiểm thử cho module của mình
npm test -- test/accounts/
```

#### Bước 5: Cập nhật nhánh trước khi tạo Pull Request (Rebase)
Nếu nhánh `main` trên remote đã có người khác merge code mới, hãy rebase để code của bạn luôn nằm trên cùng:
```bash
git fetch origin
git rebase origin/main
# Nếu có conflict, giải quyết conflict rồi:
# git add <file-conflict>
# git rebase --continue
```

#### Bước 6: Đẩy code lên Remote & Tạo Pull Request (PR)
```bash
git push -u origin feature/accounts
```
- Vào GitHub/GitLab tạo Pull Request vào nhánh `main`.
- Điền mô tả PR: Những API đã làm, mã lỗi, kèm ảnh chụp kết quả chạy test.

---

## PHẦN 2: QUY CHUẨN ĐẶT TÊN (NAMING CONVENTIONS)

### 2.1 Tên Thư mục & Module
- Tên thư mục module: Danh từ số nhiều, viết bằng **kebab-case** đặt trong `src/modules/`.
  - ✅ Đúng: `src/modules/wallets/`, `src/modules/accounts/`, `src/modules/categories/`, `src/modules/transactions/`
  - ❌ Sai: `src/modules/Wallet/`, `src/modules/user_setting/`

### 2.2 Tên Endpoint RESTful API
- URL bắt đầu bằng tiền tố `/api/v1/`.
- Tài nguyên (Resources) luôn dùng **danh từ số nhiều**, chữ thường (kebab-case).
- Hành động CRUD thể hiện qua **HTTP Method** (không nhét động từ vào URL):

| Hành động | HTTP Method | Endpoint mẫu | Mô tả |
|---|---|---|---|
| Tạo mới | `POST` | `/api/v1/wallets` | Tạo ví mới |
| Danh sách | `GET` | `/api/v1/wallets?page=1&limit=10` | Lấy danh sách ví (phân trang) |
| Chi tiết | `GET` | `/api/v1/wallets/:id` | Xem chi tiết 1 ví theo UUID |
| Cập nhật | `PATCH` | `/api/v1/wallets/:id` | Sửa một phần dữ liệu của ví |
| Xóa | `DELETE` | `/api/v1/wallets/:id` | Xóa (soft delete) ví |
| Tài nguyên con | `POST` | `/api/v1/wallets/:id/members` | Mời thành viên vào ví |
| Tài nguyên con | `GET` | `/api/v1/wallets/:id/accounts` | Lấy danh sách tài khoản trong ví |

### 2.3 Quy chuẩn tên tập tin (File Naming)
Mọi file đều dùng chữ thường **kebab-case** kèm hậu tố định danh vai trò:

| Vai trò | Cú pháp tên file | Ví dụ cho Module Wallets |
|---|---|---|
| **Entity** | `<entity>.entity.ts` | `wallet.entity.ts`, `wallet-member.entity.ts` |
| **Request DTO** | `<action>-<entity>.dto.ts` | `create-wallet.dto.ts`, `update-wallet.dto.ts`, `wallet-query.dto.ts` |
| **Response DTO** | `<entity>-response.dto.ts` hoặc `<entity>.dto.ts` | `wallet-response.dto.ts`, `wallet-detail.dto.ts` |
| **Constants** | `<module>.constant.ts` | `wallets.constant.ts` |
| **Exception** | `<module>.exception.ts` | `wallet.exception.ts` |
| **Mapper** | `<entity>.mapper.ts` | `wallet.mapper.ts` |
| **Repository** | `<entity>.repository.ts` | `wallet.repository.ts`, `wallet-member.repository.ts` |
| **Service** | `<module>.service.ts` | `wallets.service.ts` |
| **Controller** | `<module>.controller.ts` | `wallets.controller.ts` |
| **Module** | `<module>.module.ts` | `wallets.module.ts` |
| **Unit Test** | `<module>.service.spec.ts` | `wallets.service.spec.ts` |

---

## PHẦN 3: HƯỚNG DẪN LẬP TRÌNH MỘT MODULE HOÀN CHỈNH TỪ A - Z

Dưới đây là 9 bước quy chuẩn để hoàn thiện một module trong `finora_be`:

```
src/modules/<tên-module>/
├── dto/
│   ├── request/          # Chứa các DTO validate dữ liệu client gửi lên
│   └── response/         # Chứa DTO dữ liệu trả về cho client
├── entities/             # Chứa thực thể TypeORM
├── exceptions/           # Chứa các lớp lỗi nghiệp vụ riêng của module
├── mapper/               # Chuyển đổi qua lại giữa Entity và DTO
├── repository/           # Tầng truy cập DB chuyên biệt
├── <module>.constant.ts  # Mã lỗi, giá trị mặc định
├── <module>.service.ts   # Xử lý toàn bộ logic nghiệp vụ & transaction
├── <module>.controller.ts# Tiếp nhận HTTP request & gắn tài liệu Swagger
└── <module>.module.ts    # Khai báo dependency injection của module
```

---

### Bước 1: Khai báo Enums & Thực thể (Entity)
Tất cả Entity nghiệp vụ **bắt buộc** kế thừa [`BaseEntity`](file:///f:/Project/FINORA/finora_be/src/common/entities/base.entity.ts) (`id: uuid`, `createdAt`, `updatedAt`, `deletedAt`).

```typescript
// src/modules/wallets/entities/wallet.entity.ts
import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('wallets')
export class Wallet extends BaseEntity {
  @Column({ name: 'owner_id', type: 'uuid' })
  @Index('idx_wallets_owner_id')
  ownerId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 255 })
  icon?: string;

  @Column({ name: 'default_currency', length: 3, default: 'VND' })
  defaultCurrency: string;

  @Column({ name: 'is_shared', default: false })
  isShared: boolean;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;
}
```

---

### Bước 2: Định nghĩa Constants & Exceptions
Mỗi module quản lý mã lỗi riêng kế thừa [`AppError`](file:///f:/Project/FINORA/finora_be/src/common/errors/app.error.ts):

```typescript
// src/modules/wallets/wallets.constant.ts
export const WALLET_ERROR_CODE = {
  NOT_FOUND: 'WALLET_NOT_FOUND',
  NAME_ALREADY_EXISTS: 'WALLET_NAME_ALREADY_EXISTS',
  ACCESS_DENIED: 'WALLET_ACCESS_DENIED',
} as const;
```

```typescript
// src/modules/wallets/exceptions/wallet.exception.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { WALLET_ERROR_CODE } from '../wallets.constant';

export class WalletNotFoundException extends AppError {
  constructor(id: string) {
    super({
      code: WALLET_ERROR_CODE.NOT_FOUND,
      message: `Không tìm thấy ví với mã "${id}"`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { id },
    });
  }
}
```

---

### Bước 3: Xây dựng Request & Response DTOs
- **Request DTO:** Dùng `class-validator` để validate chặt chẽ và `class-transformer` để chuẩn hóa (trim, uppercase).
- **Response DTO:** Trả về chính xác các trường cần thiết, tuyệt đối không trả trực tiếp TypeORM Entity ra API (tránh lộ cột nhạy cảm hoặc dính vòng lặp quan hệ).

```typescript
// src/modules/wallets/dto/request/create-wallet.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateWalletDto {
  @ApiProperty({ example: 'Chi tiêu sinh hoạt' })
  @IsString()
  @IsNotEmpty({ message: 'Tên ví không được để trống' })
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'VND', default: 'VND' })
  @IsOptional()
  @Length(3, 3)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  defaultCurrency?: string = 'VND';

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean = false;
}
```

---

### Bước 4: Xây dựng Mapper Layer
Mapper đảm bảo sự độc lập giữa tầng lưu trữ (Database Entity) và tầng giao tiếp (DTO):

```typescript
// src/modules/wallets/mapper/wallet.mapper.ts
import { Injectable } from '@nestjs/common';
import { Wallet } from '../entities/wallet.entity';
import { CreateWalletDto } from '../dto/request/create-wallet.dto';
import { WalletResponseDto } from '../dto/response/wallet-response.dto';

@Injectable()
export class WalletMapper {
  toEntity(dto: CreateWalletDto, ownerId: string): Partial<Wallet> {
    return {
      ownerId,
      name: dto.name,
      defaultCurrency: dto.defaultCurrency ?? 'VND',
      isShared: dto.isShared ?? false,
      isActive: true,
    };
  }

  toResponse(wallet: Wallet): WalletResponseDto {
    return {
      id: wallet.id,
      name: wallet.name,
      defaultCurrency: wallet.defaultCurrency,
      isShared: wallet.isShared,
      ownerId: wallet.ownerId,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
```

---

### Bước 5: Xây dựng Repository Pattern
Không inject trực tiếp `Repository<T>` vào Service. Hãy bọc quanh một lớp Repository để tái sử dụng query:

```typescript
// src/modules/wallets/repository/wallet.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
  ) {}

  create(data: Partial<Wallet>): Wallet {
    return this.repo.create(data);
  }

  save(wallet: Wallet, manager?: EntityManager): Promise<Wallet> {
    if (manager) {
      return manager.save(Wallet, wallet);
    }
    return this.repo.save(wallet);
  }

  findById(id: string): Promise<Wallet | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByNameAndOwnerId(name: string, ownerId: string): Promise<Wallet | null> {
    return this.repo.findOne({ where: { name, ownerId } });
  }
}
```

---

### Bước 6: Xây dựng Service (Business Logic)
Service kiểm tra nghiệp vụ, mở transaction khi cần thao tác nhiều bảng đồng thời:

```typescript
// src/modules/wallets/wallets.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletRepository } from './repository/wallet.repository';
import { WalletMemberRepository } from './repository/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';
import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { WalletNameAlreadyExistsException } from './exceptions/wallet.exception';
import { WalletMemberRole, WalletMemberStatus } from '../../common/enums/wallet-member-role.enum';

@Injectable()
export class WalletsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletRepo: WalletRepository,
    private readonly walletMemberRepo: WalletMemberRepository,
    private readonly walletMapper: WalletMapper,
  ) {}

  async createWallet(userId: string, dto: CreateWalletDto) {
    const existing = await this.walletRepo.findByNameAndOwnerId(dto.name, userId);
    if (existing) {
      throw new WalletNameAlreadyExistsException(dto.name);
    }

    return this.dataSource.transaction(async (manager) => {
      const wallet = this.walletRepo.create(this.walletMapper.toEntity(dto, userId));
      const savedWallet = await this.walletRepo.save(wallet, manager);

      // Tự động thêm owner vào bảng thành viên ví
      const member = this.walletMemberRepo.create({
        walletId: savedWallet.id,
        userId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
        joinedAt: new Date(),
      });
      await this.walletMemberRepo.save(member, manager);

      return this.walletMapper.toResponse(savedWallet);
    });
  }
}
```

---

### Bước 7: Xây dựng Controller & Swagger Documentation
- Gắn `@UseGuards(JwtAuthGuard)` để bảo vệ API.
- Lấy `userId` từ token thông qua decorator `@CurrentUser('id')`.
- Viết tài liệu Swagger qua decorator `@SwaggerDoc(...)`.
- Bọc toàn bộ kết quả trả về bằng [`ApiResponse.success(...)`](file:///f:/Project/FINORA/finora_be/src/common/response/api-response.ts) hoặc `ApiResponse.created(...)`.

```typescript
// src/modules/wallets/wallets.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @SwaggerDoc({
    summary: 'Tạo ví mới',
    description: 'Tạo ví tài chính mới, người tạo tự động trở thành OWNER.',
    bodyType: CreateWalletDto,
    responseType: WalletResponseDto,
    status: 201,
    bearerAuth: true,
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWalletDto,
  ) {
    const data = await this.walletsService.createWallet(userId, dto);
    return ApiResponse.created(data, 'Tạo ví mới thành công');
  }
}
```

---

### Bước 8: Đăng ký Module & Cập nhật `AppModule`
1. Đăng ký TypeORM entities, Controller, Providers và Exports trong `<module>.module.ts`.
2. Import module mới vào [`src/app.module.ts`](file:///f:/Project/FINORA/finora_be/src/app.module.ts).

---

### Bước 9: Viết Unit Test & Kiểm thử
Tạo file test tại `test/<module>/<module>.service.spec.ts`, mock Repository và DataSource để kiểm tra business logic:

```bash
# Chạy kiểm thử cho module vừa viết
npm test -- test/wallets/wallets.service.spec.ts
```

Đảm bảo:
- Test case thành công (Happy Path).
- Test case ném lỗi khi dữ liệu sai / trùng lặp (Edge Cases / Exceptions).
