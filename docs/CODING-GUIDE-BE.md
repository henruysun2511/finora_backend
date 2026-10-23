# CODING GUIDE — Finora Backend NestJS

Hướng dẫn cách viết code và bày trí code theo đúng quy ước của dự án Finora.
Module **`users`** và **`authorization`** là **mẫu tham chiếu chuẩn** — mọi module
phải bắt chước đúng cấu trúc và pattern của nó. Code mới phải khớp các quy ước bên dưới.

---

## 1. Tổng quan Stack

| Thành phần | Vai trò |
|---|---|
| NestJS 10 | Framework, DI, module system |
| TypeORM 0.3 | ORM, entity, QueryBuilder, soft delete |
| PostgreSQL (Neon) | Database (dùng URL + SSL) |
| class-validator / class-transformer | Validate + transform DTO |
| @nestjs/swagger | OpenAPI docs tại `/docs` |
| TypeScript | Ngôn ngữ |

**Luồng dữ liệu chuẩn (bất biến):**
```
Controller → Service (business logic) → Repository (TypeORM) → DB
                      │
                      └→ Mapper (Entity → Response DTO) → return
```

- Service **không bao giờ** gọi TypeORM `Repository` trực tiếp — qua
  repository layer riêng của module (`XxxRepository`).
- Entity **không bao giờ** được trả thẳng ra khỏi controller — luôn qua
  **Mapper** để chuyển sang Response DTO.
- **Quy tắc ranh giới module (Cross-Module Boundary - BẮT BUỘC):**
  - Service của một module **chỉ được phép gọi Service của module khác**.
  - **TUYỆT ĐỐI CẤM:** Không được phép gọi hay inject `XxxRepository` của module khác.
  - Mọi thao tác truy vấn, kiểm tra dữ liệu hoặc xác thực liên quan đến module khác phải thông qua public methods của Service module đó.
  - Module chỉ được `exports: [XxxService]`, **không bao giờ** export `XxxRepository` ra ngoài.

---

## 2. Cấu trúc thư mục

```
src/
├── main.ts                  # Bootstrap: prefix /api + version v1, CORS, pipe/filter/interceptor, Swagger
├── app.module.ts            # Root module: DatabaseModule + các feature module
├── config/
│   ├── app.config.ts        # AppConfig — đọc env tập trung (PORT, FRONTEND_URL...)
│   ├── database.config.ts   # DatabaseConfig — DATABASE_URL
│   └── validation.schema.ts # validateEnv() — chặn khởi động nếu thiếu env
├── database/data-source.ts  # DataSource riêng cho TypeORM CLI (migration)
├── infrastructures/         # InfrastructuresModule (@Global): database, redis, cloudinary, mailer, logger, jwt
├── common/                  # Dùng chung toàn dự án (không sửa lung tung)
│   ├── entities/base.entity.ts
│   ├── enums/sort-order.enum.ts
│   ├── errors/app.error.ts       # AppError, ErrorCodes, notFound()
│   ├── filters/                  # HttpExceptionFilter, TypeOrmExceptionFilter
│   ├── interceptors/response.interceptor.ts
│   ├── response/api-response.ts  # ApiResponse<T> + PaginatedResponse<T>
│   └── swagger/swagger-doc.ts    # @SwaggerDoc
└── modules/
    └── users/               # ✓ MODULE MẪU — bắt chước đúng cấu trúc
```

**Nguyên tắc:**
- Feature module tự khai báo đủ dependencies của nó (`TypeOrmModule.forFeature`).
- Không nối module bằng import chồng chéo; khi cần service của module khác
  (VD: `AuthService` gọi `UsersService`, `AuthorizationService`) thì
  import **Module** đích vào `imports` — dựa vào `exports` của module đích.
- **Chỉ inject Service, không inject Repository ngoại vi:** Service của module A
  chỉ được inject Service của module B. Tuyệt đối không inject Repository của module B.
- Đăng ký module mới vào `app.module.ts`.

---

## 3. Cấu trúc chuẩn của một feature module

```
src/modules/<tên_module>/
├── <tên_module>.module.ts      # @Module + TypeOrmModule.forFeature([Entity])
├── <tên_module>.controller.ts  # Chỉ khai báo route + SwaggerDoc, gọi service
├── <tên_module>.service.ts     # Business logic (kiểm tra unique, FK, transaction)
├── <tên_module>.constant.ts    # <X>_CONSTANTS (pagination) + <X>_ERROR_CODE
├── entities/<entity>.entity.ts # Entity extends BaseEntity, tên bảng snake_case
├── repository/<entity>.repository.ts  # QueryBuilder, softDelete...
├── mapper/<entity>.mapper.ts   # toResponse(entity) / toResponseList([])
├── exceptions/<tên>.exception.ts      # Exception riêng extends AppError
└── dto/
    ├── request/
    │   ├── create-<entity>.dto.ts     # @ApiProperty + class-validator
    │   ├── update-<entity>.dto.ts     # PartialType(CreateXxxDto)
    │   └── <entity>-query.dto.ts      # page/limit/keyword/sortBy/sortOrder + filters
    └── response/<entity>.dto.ts       # Response DTO (đã qua Mapper)
```

---

## 4. Quy ước tên file & symbol

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| File | kebab-case | `user.repository.ts`, `create-user.dto.ts` |
| Controller / Service / Module | `<tên>` (số nhiều) + hậu tố | `UsersController`, `UsersService`, `UsersModule` |
| Repository / Mapper | `<Tên>` + hậu tố | `UserRepository`, `UserMapper` |
| Entity | PascalCase, số ít | `User`, `Book` |
| DTO request | `CreateXxxDto`, `UpdateXxxDto`, `XxxQueryDto` | `CreateBookDto` |
| DTO response | `XxxResponse` | `BookResponse` |
| Exception | Tên mô tả + `Exception` | `EmailAlreadyExistsException` |
| Constants | `<X>_CONSTANTS` / `<X>_ERROR_CODE` (UPPER) | `USERS_CONSTANTS`, `USER_ERROR_CODE` |
| Hằng số error code | SCREAMING_SNAKE | `EMAIL_ALREADY_EXISTS` |

- Tham số `id` trong controller: `@Param('id', ParseUUIDPipe)`.
- Message/chuỗi UI: **tiếng Việt có dấu**.

---

## 5. Bày trí code trong file

### Thứ tự import

```ts
// 1. Package ngoài: @nestjs/... , typeorm, class-validator, class-transformer, bcrypt...
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

// 2. Module này (./ file cùng thư mục), đúng thứ tự:
//    service/repository/mapper → common (../../common/...) → dto
import { UserRepository } from './repository/user.repository';
import { UserMapper } from './mapper/user.mapper';
import { notFound } from '../../common/errors/app.error';
import { CreateUserDto } from './dto/request/create-user.dto';
```

### Thứ tự trong lớp

- **Controller**: constructor (`private readonly x: XxxService`) → các route
  theo thứ tự `POST → GET (list) → GET :id → PATCH :id → DELETE :id`.
- **Service**: constructor (inject repository, mapper, service khác) → các
  method gom theo nhóm, mỗi nhóm mở đầu bằng comment section:
  ```ts
  // ── CREATE ───────────────────────────────────────────────────────────────
  // ── LIST ─────────────────────────────────────────────────────────────────
  // ── DETAIL ───────────────────────────────────────────────────────────────
  // ── UPDATE ───────────────────────────────────────────────────────────────
  // ── HELPERS ──────────────────────────────────────────────────────────────
  // ── DELETE ───────────────────────────────────────────────────────────────
  ```
- **Repository**: `findById`, `findBy<Field>` (unique check), `create`, `save`,
  `findPaginated`, `softDelete`.

### Comment
- Comment ngăn cách: `// ── TÊN ──` (dùng trong service, main.ts, app.module.ts).
- JSDoc `/** ... */`: cho class quan trọng (BaseEntity, Repository, Mapper,
  AppError) — giải thích **tại sao**, không giải thích code rõ ràng.

### Format chung
- Indent 2 spaces, **không dùng semicolon**, **single quote**, dòng dài xuống
  dòng (~100 ký tự); thụt thẳng hàng khi gán object nhiều field align (xem
  mapper `id: user.id,` thẳng cột).

---

## 6. Lớp nào viết gì

### 6.1 Module (`<module>.module.ts`)

```ts
@Module({
  imports: [TypeOrmModule.forFeature([User])], // entity của chính nó
  controllers: [UsersController],
  providers: [UsersService, UserRepository, UserMapper], // khai báo đủ nội bộ
  exports: [UsersService], // CHỈ export Service cho module khác dùng — KHÔNG export Repository
})
export class UsersModule {}
```

- Module có quan hệ cần tương tác module khác → thêm module đó vào `imports`
  (VD: `AuthModule` import `UsersModule`, `AuthorizationModule`).
- **Quy tắc bảo vệ dữ liệu:** Chỉ export `XxxService` trong mảng `exports`.
  **Tuyệt đối không export Repository** ra ngoài module để đảm bảo tính đóng gói (encapsulation).
- Feature module **không** khai báo `TypeOrmModule.forRoot` — root config đã
  nằm ở `shared/database`.

### 6.2 Controller (`<module>.controller.ts`)

Chỉ làm các việc: khai báo routing, gắn decorator phân quyền `@Permissions(...)`, `@SwaggerDoc`, gọi service và bọc response.

#### 6.2.1 Quy tắc BẮT BUỘC về Phân quyền (Permissions & Authorization)

Toàn bộ hệ thống Finora áp dụng **Dynamic RBAC (Role-Based Access Control dựa trên Permission động)**. Guards toàn cục (`JwtAuthGuard` & `PermissionsGuard`) đã được đăng ký sẵn qua `APP_GUARD` trong `app.module.ts`.

1. **BẮT BUỘC khai báo `@Permissions(...)` trước mọi API nghiệp vụ/quản trị**:
   - Sử dụng decorator `@Permissions(SYSTEM_PERMISSIONS.<RESOURCE>_<ACTION>)`.
   - Tất cả mã quyền hạn phải được lấy từ hằng số tập trung `SYSTEM_PERMISSIONS` trong `src/common/constants/permission.constant.ts`. **TUYỆT ĐỐI KHÔNG** dùng magic string (chuỗi gõ tay tự do).
2. **API công khai (Public API)**:
   - Nếu API mở cho khách vãng lai, không cần đăng nhập (VD: `/auth/login`, `/auth/register`, callback OAuth...), **BẮT BUỘC** gắn decorator `@Public()`.
3. **TUYỆT ĐỐI CẤM HARDCODE ROLE**:
   - **CẤM** sử dụng `@Roles('ADMIN')`, `@Roles('USER')` hoặc kiểm tra chuỗi vai trò cố định trong Controller.
   - Vai trò trong Finora được người dùng/admin tự do tạo mới và phân bổ quyền trên giao diện người dùng (UI). Do đó, backend **chỉ xác thực theo Permission code**. Bất kỳ Role nào có chứa Permission tương ứng đều sẽ tự động được cấp quyền truy cập.
   - Người dùng có cờ quản trị hệ thống (`isSysAdmin === true`) sẽ được `PermissionsGuard` tự động bypass qua mọi kiểm tra quyền.

#### 6.2.2 Quy tắc BẮT BUỘC về Ghi nhận Nhật ký Kiểm toán (@Auditable Decorator)

Toàn bộ các hành động làm thay đổi trạng thái dữ liệu (Create, Update, Delete) hoặc các sự kiện bảo mật, cộng tác quan trọng **BẮT BUỘC** phải được ghi vết kiểm toán (Audit Log) thông qua decorator `@Auditable(...)` đặt tại Controller.

1. **Nguyên tắc "Declarative Auditing" tại Controller Layer**:
   - Hệ thống sử dụng `AuditLogInterceptor` được đăng ký toàn cục (`APP_INTERCEPTOR`). Khi một route handler thực thi thành công, interceptor sẽ tự động trích xuất ngữ cảnh HTTP (bao gồm `ipAddress`, `userAgent`, và `userId` từ JWT Token) và gửi log bất đồng bộ ngầm.
   - **TUYỆT ĐỐI KHÔNG GỌI AUDIT LOG THỦ CÔNG TRONG SERVICE:** Cấm inject `AuditLogsService` vào Service của các feature module để gọi `recordLog`. Việc này gây lặp code (boilerplate), vi phạm nguyên lý Single Responsibility, và làm mất metadata mạng (`ipAddress`, `userAgent`). Service chỉ tập trung vào transaction và business logic.
2. **Cấu trúc cấu hình `@Auditable(options)`**:
   - `action`: Hằng số từ `AUDIT_LOG_ACTION` trong `src/modules/audit-logs/audit-logs.constant.ts` (VD: `CREATE`, `UPDATE`, `DELETE`, `WALLET_UPDATE`, `MEMBER_INVITE`, `MEMBER_ROLE_CHANGE`,...).
   - `entityType`: Hằng số từ `AUDIT_LOG_ENTITY_TYPE` trong `src/modules/audit-logs/audit-logs.constant.ts` (VD: `USER`, `AUTH`, `WALLET`, `WALLET_MEMBER`, `TRANSACTION`, `ACCOUNT`,...).
   - `entityId`: (Tùy chọn) Định danh bản ghi bị tác động.
     - Có thể là tên param URL/body: ví dụ `'id'`, `'userId'`.
     - Hoặc hàm callback: `(req, res) => res?.data?.id || req.params?.id`.
     - *Mặc định*: Interceptor tự fallback tìm `res?.data?.id` -> `res?.id` -> `req.params?.id` -> `req.body?.id`.
   - `walletId`: (Tùy chọn) **BẮT BUỘC** khai báo đối với mọi tài nguyên thuộc phạm vi ví (`TRANSACTION`, `ACCOUNT`, `WALLET`, `WALLET_MEMBER`, `BUDGET`).
     - Có thể là tên param URL/body: ví dụ `'walletId'`, `'id'`.
     - Hoặc callback: `(req, res) => req.params?.walletId || res?.data?.walletId`.
     - *Ý nghĩa*: Cung cấp chỉ mục lọc dữ liệu phân quyền theo ví trực tiếp mà không cần JOIN chậm.
   - `oldValue` & `newValue`: (Tùy chọn) Callback trích xuất dữ liệu trước/sau biến động. Mặc định hệ thống tự động lưu `req.body` (đã mask thông tin nhạy cảm: mật khẩu, token, pin...) làm `newValue`.

#### 6.2.3 Thứ tự chuẩn của Decorator trên API Method

Để code đồng nhất, dễ đọc và bảo trì, các decorator trên mỗi method trong Controller **BẮT BUỘC** tuân theo thứ tự sau:

```ts
// 1. HTTP Method Decorator (@Get, @Post, @Patch, @Delete...)
// 2. Phân quyền: @Permissions(...) hoặc @Public()
// 3. Ghi vết kiểm toán: @Auditable(...) (BẮT BUỘC cho các route thay đổi dữ liệu hoặc bảo mật)
// 4. HttpCode (chỉ khi khác mặc định, VD: @HttpCode(HttpStatus.NO_CONTENT) cho DELETE)
// 5. @SwaggerDoc({ ... })
```

#### Ví dụ mẫu Controller chuẩn:

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserQueryDto } from './dto/request/user-query.dto';
import { UserResponseDto } from './dto/response/user.dto';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { Auditable } from '../audit-logs/decorators/auditable.decorator';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../audit-logs/audit-logs.constant';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(SYSTEM_PERMISSIONS.USERS_CREATE)
  @Auditable({
    action: AUDIT_LOG_ACTION.CREATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.USER,
  })
  @SwaggerDoc({
    summary: 'Tạo người dùng mới',
    bodyType: CreateUserDto,
    responseType: UserResponseDto,
    status: 201,
  })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return ApiResponse.created(user, 'Tạo người dùng thành công');
  }

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.USERS_READ)
  @SwaggerDoc({
    summary: 'Danh sách người dùng',
    responseType: UserResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.USERS_READ)
  @SwaggerDoc({
    summary: 'Chi tiết người dùng',
    responseType: UserResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    return ApiResponse.success(user, 'Lấy thông tin người dùng thành công');
  }

  @Patch(':id')
  @Permissions(SYSTEM_PERMISSIONS.USERS_UPDATE)
  @Auditable({
    action: AUDIT_LOG_ACTION.UPDATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.USER,
    entityId: 'id',
  })
  @SwaggerDoc({
    summary: 'Cập nhật người dùng',
    bodyType: UpdateUserDto,
    responseType: UserResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, dto);
    return ApiResponse.success(user, 'Cập nhật người dùng thành công');
  }

  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.USERS_DELETE)
  @Auditable({
    action: AUDIT_LOG_ACTION.DELETE,
    entityType: AUDIT_LOG_ENTITY_TYPE.USER,
    entityId: 'id',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SwaggerDoc({
    summary: 'Xóa người dùng',
    status: 204,
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }
}
```

- Route theo thứ tự: `POST /` → `GET /` → `GET /:id` → `PATCH /:id` → `DELETE /:id`.
- `Controller` **không** chứa logic nghiệp vụ (không check unique, không `Object.assign`).
- `@SwaggerDoc` bắt buộc cho **mọi** route (kể cả DELETE).
- `@Auditable` bắt buộc cho các route làm biến động dữ liệu (`POST`, `PATCH`, `PUT`, `DELETE`).

### 6.3 Service (`<module>.service.ts`)

Nơi duy nhất chứa business logic. Mẫu từng method chuẩn:

> [!IMPORTANT]
> **QUY TẮC BẢO TOÀN SERVICE & AUDIT LOGS:**
> - Service **tuyệt đối không inject `AuditLogsService`** để gọi thủ công `recordLog`. Mọi hoạt động ghi log phải được cấu hình khai báo tại Controller bằng decorator `@Auditable(...)`.
> - Service chỉ tập trung giải quyết: kiểm tra ràng buộc nghiệp vụ, bảo toàn tính toàn vẹn dữ liệu (ACID transaction, Pessimistic Lock nếu có xung đột số dư), và gọi Repository/Mapper.

```ts
// CREATE: kiểm tra unique → (kiểm tra FK) → tạo → save → mapper
async create(dto: CreateUserDto): Promise<UserResponse> {
  const exists = await this.userRepo.findByEmail(dto.email);
  if (exists) throw new EmailAlreadyExistsException(dto.email);

  const password = await bcrypt.hash(dto.password, 12);
  const user = this.userRepo.create({ name: dto.name, email: dto.email, password });
  const saved = await this.userRepo.save(user);

  return this.userMapper.toResponse(saved);
}

// LIST: repository.findPaginated → PaginatedResponse.of(...)
async findAll(query: UserQueryDto): Promise<PaginatedResponse<UserResponse>> {
  const [users, total] = await this.userRepo.findPaginated(query);
  return PaginatedResponse.of(this.userMapper.toResponseList(users), total, query.page, query.limit);
}

// DETAIL / UPDATE / DELETE: findById → nếu null → throw notFound('<tên tiếng Việt>')
async remove(id: string): Promise<void> {
  const user = await this.userRepo.findById(id);
  if (!user) throw notFound('người dùng');
  await this.userRepo.softDelete(id);
}
```

- Không tìm thấy → `throw notFound('<tên tiếng Việt số ít>')` (trả 404).
- Trùng unique → exception riêng của module (409), không tự bắt DB error.
- Field bổ sung (bcrypt hash, `borrowedAt`, `status`) set **trong service**,
  không phải DTO nhận từ client.
- Update dùng `Object.assign(entity, dto)` rồi `save`.
- Logic dùng lại (VD: validateFK) gom vào method `private` dưới nhóm `HELPERS`.

### 6.3.1 Giao tiếp liên Module (Cross-Module Service Methods)

Khi Service cần cung cấp hàm cho module khác gọi:
1. **Chỉ gọi qua Service:** Module gọi phải inject `XxxService` của module đích (thông qua việc import Module đích). **Không được phép inject hay truy vấn trực tiếp Repository của module đích**.
2. **Quy ước chú thích JSDoc `[CROSS-MODULE]`:** Mọi hàm trong Service được thiết kế để phục vụ module khác gọi **phải có comment JSDoc rõ ràng**, nêu rõ mục đích và module/service nào sử dụng:
   ```ts
   // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

   /**
    * [CROSS-MODULE] Tìm entity User theo ID kèm đầy đủ quan hệ roles & permissions.
    * Dùng cho JwtStrategy validate token hoặc AuthService kiểm tra user hiện tại.
    *
    * @param id - UUID của người dùng
    * @returns User entity hoặc null nếu không tồn tại
    */
   async findById(id: string): Promise<User | null> {
     return this.userRepository.findById(id);
   }
   ```
3. **Chuẩn hóa dữ liệu trả về:** Nếu module khác cần DTO hoặc entity, Service cung cấp method tương ứng (hoặc method chuyển đổi như `toResponseDto`) để module ngoài không cần inject `Mapper` của module này.

### 6.4 Repository (`repository/<entity>.repository.ts`)

```ts
@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findById(id: string): Promise<User | null> { return this.repo.findOne({ where: { id } }); }
  findByEmail(email: string): Promise<User | null> { return this.repo.findOne({ where: { email } }); }
  save(user: User): Promise<User> { return this.repo.save(user); }
  create(data: Partial<User>): User { return this.repo.create(data); }

  async findPaginated(query: UserQueryDto): Promise<[User[], number]> {
    const qb = this.repo.createQueryBuilder('user')
      .where('user.deletedAt IS NULL');          // QueryBuilder KHÔNG tự lọc soft delete

    if (query.keyword) {
      qb.andWhere('(user.name ILIKE :kw OR user.email ILIKE :kw)', { kw: `%${query.keyword}%` });
    }

    return qb
      .orderBy(`user.${query.sortBy ?? 'createdAt'}`, query.sortOrder ?? 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();                        // trả [rows, total]
  }

  softDelete(id: string) { return this.repo.softDelete(id); }
}
```

- **Quan trọng**: `createQueryBuilder` không tự áp soft-delete filter → luôn
  `where('<alias>.deletedAt IS NULL')`.
- Bí danh query builder viết thường: `user`, `book`... tham chiếu cột bằng
  `<alias>.<field>`.
- Mọi query phức tạp nằm ở đây; service chỉ gọi hàm có nghĩa.

### 6.5 Mapper (`mapper/<entity>.mapper.ts`)

```ts
@Injectable()
export class UserMapper {
  toResponse(user: User): UserResponse {
    return {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      createdAt: user.createdAt,
      // KHÔNG map password — response DTO chỉ chứa field an toàn cho client
    };
  }
  toResponseList(users: User[]): UserResponse[] {
    return users.map((u) => this.toResponse(u));
  }
}
```

- Có relation (books/borrows) → map nested: `author: { id, name }`, `category`,
  `user`, `book` theo đúng spec trong `docs/*.md`.
- Không điền field nào mà entity không có; field nhạy cảm tuyệt đối không map.

### 6.6 Entity (`entities/<entity>.entity.ts`)

```ts
@Entity('users')                       // tên bảng snake_case, số nhiều
export class User extends BaseEntity { // luôn kế thừa BaseEntity
  @Column({ length: 150 })
  name: string;

  @Column({ unique: true, length: 150 })
  @Index()
  email: string;

  @Column({ length: 255 })
  @Exclude()                           // field nhạy cảm — ẩn khi serialize
  password: string;
}
```

- `BaseEntity` đã có sẵn: `id` (uuid PK), `created_at`, `updated_at`,
  `deleted_at` → **không** khai báo lại.
- Cột riêng của bảng theo snake_case qua `@Column({ name: '...' })`.
- **@Exclude()** cho field nhạy cảm (password). `ClassSerializerInterceptor`
  trong `app.module.ts` đảm bảo chúng biến mất khỏi response.
- Relation dùng decorator TypeORM:
  ```ts
  @ManyToOne(() => Author)
  @JoinColumn({ name: 'author_id' })
  author: Author;
  ```

### 6.7 Exceptions (`exceptions/<tên>.exception.ts`)

```ts
export class EmailAlreadyExistsException extends AppError {
  constructor(email: string) {
    super({
      code: USER_ERROR_CODE.EMAIL_ALREADY_EXISTS,  // code lấy từ <module>.constant.ts
      message: `Email "${email}" đã được sử dụng`,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}
```

- Luôn `extends AppError` (không extends HttpException trực tiếp).
- `code` là duy nhất, khai báo trong `USER_ERROR_CODE` / `BOOK_ERROR_CODE`.
- Không throw `AppError` generic cho lỗi marketing riêng module — tạo class riêng.

### 6.8 DTO

**Create DTO:** `@ApiProperty` (phục vụ Swagger) + class-validator, message
tiếng Việt khi cần:

```ts
export class CreateUserDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString() @MinLength(2) @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;
}
```

**Update DTO:** luôn `extends PartialType(CreateXxxDto)` từ `@nestjs/swagger`:
```ts
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

**Query DTO:** 5 field cố định + filter riêng:
`page`, `limit` (lấy default/Min/Max từ `<X>_CONSTANTS.PAGINATION`), `keyword`,
`sortBy` (default `'createdAt'`), `sortOrder` (Enum `SortOrder`, default DESC),
thêm getter `get skip()`. Field optional có thêm kiểu `authorId?`, `categoryId?`
cùng `@IsOptional() @IsUUID()`.

**Response DTO:** class thuần với `@ApiProperty()` cho từng field:
```ts
export class UserResponse {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;
}
```

> `main.ts` cấu hình `ValidationPipe` với `whitelist`, `forbidNonWhitelisted`,
> `transform`, `enableImplicitConversion` → field lạ bị chặn, query tự convert
> kiểu. Đừng vô hiệu hóa.

### 6.9 Constants (`<module>.constant.ts`)

```ts
export const USERS_CONSTANTS = {
  PAGINATION: { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 10, MAX_LIMIT: 100 },
} as const;

export const USER_ERROR_CODE = {
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
} as const;
```

- Mọi con số (pagination) đưa vào `<X>_CONSTANTS`, không hard-code trong DTO.
- Error code riêng module đặt SCREAMING_SNAKE, giá trị **duy nhất** trên toàn
  dự án (VD: `BOOK_ISBN_ALREADY_EXISTS` để không đụng `EMAIL_ALREADY_EXISTS`).
- Có thể chứa Enum nghiệp vụ riêng (VD: `BorrowStatus` BORROWED/RETURNED).

---

## 7. Response format (bất biến)

Mọi response đi qua 1 trong 2 đường — kết quả giống nhau:

- **Đường 1 (mẫu `users`)**: controller return `ApiResponse.created(...)`,
  `ApiResponse.success(...)`, `ApiResponse.noContent(...)`.
- **Đường 2 (mẫu `books`)**: controller return data thuần + `@HttpCode(...)`,
  `ResponseInterceptor` (đã đăng ký global trong `main.ts`) tự bọc
  `ApiResponse<T>`.

Hình dạng chung:

```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { ... }, "timestamp": "..." }
```

- Danh sách phân trang → `data.items[]` + `data.pagination`
  `{ page, limit, total, totalPages, hasNext, hasPrev }` (dùng
  `PaginatedResponse.of(items, total, page, limit)`).
- HTTP status: `POST` = **201**, `DELETE` = **204**, còn lại = **200**.

---

## 8. Error handling

- **`AppError`** (`common/errors/app.error.ts`) là base của mọi business
  exception. Body lỗi luôn: `{ success, statusCode, code, message, timestamp }`.
- **Not found**: `throw notFound('<tên tiếng Việt>')` → 404.
- **Giới hạn dùng** `notFound` / `ErrorCodes` chung; lỗi đặc thù module →
  exception class riêng (extends AppError) với `code` riêng.
- **`HttpExceptionFilter`** (global, `@Catch()`) — bắt mọi exception, log
  `[Method] url → status channel`, định dạng lỗi, thêm `path`.
- **`TypeOrmExceptionFilter`** (`@Catch(QueryFailedError)`) — map lỗi Postgres
  theo mã SQLSTATE: `23505` duplicate → 409, `23503` FK violation → 400...
  Không để DB error thô lộ ra client.
- **Không tự thêm filter/pipe global** trong module — global đã setup ở `main.ts`.

---

## 9. Swagger

- Dùng decorator tổng hợp `@SwaggerDoc({ summary, bodyType, responseType,
  status, isArray, description? })` (định nghĩa ở `common/swagger/swagger-doc.ts`).
- Mọi route bắt buộc `@SwaggerDoc`. DTO phải có đủ `@ApiProperty` để Swagger
  render chính xác; field optional dùng `@ApiPropertyOptional`.
- Query DTO nhớ khai `default` + `minimum`/`maximum` trên `@ApiPropertyOptional`.

---

## 10. Quan hệ TypeORM (books, borrows)

Theo spec `docs/books.md`, `docs/borrows.md`:

```ts
// entities/book.entity.ts
@ManyToOne(() => Author)
@JoinColumn({ name: 'author_id' })
author: Author;

@ManyToOne(() => Category)
@JoinColumn({ name: 'category_id' })
category: Category;
```

- Cột FK lưu snake_case (`author_id`, `category_id`); DTO expose camelCase
  (`authorId`, `categoryId`) → mapper chuyển qua lại.
- Khi cần trả thông tin liên quan (VD: `author: { id, name }`), repository
  `findById`/`findPaginated` dùng `relations: ['author', 'category']` hoặc
  `.leftJoinAndSelect('book.author', 'author')`, rồi mapper map nested object.
- Validate FK được thực hiện bằng cách gọi `findOne` của module liên quan
  (VD: `BooksService.validateRefs` gọi `authorsService.findOne` + 
  `categoriesService.findOne`) — không để DB báo FK violation.

---

## 11. Checklist — thêm module mới

1. Tạo đủ thư mục: `entities/ repository/ mapper/ exceptions/ dto/request/
   dto/response/` + 4 file ở root module (`module`, `controller`, `service`,
   `constant`).
2. Entity `extends BaseEntity`, đặt tên bảng + cột snake_case, `@Exclude()`
   field nhạy cảm, relation ManyToOne + `@JoinColumn`.
3. Write DTO: **CreateDto** (validate + ApiProperty), **UpdateDto** =
   `PartialType(CreateDto)`, **QueryDto** (page/limit/keyword/sortBy/sortOrder
   + filter + `skip` getter), **Response**.
4. Repository: `findById`, `findBy<FieldUnique>`, `create`, `save`,
   `findPaginated` (có `.where('alias.deletedAt IS NULL')`), `softDelete`.
5. Service: 5 method CRUD gom theo section comment; unique check → throw
   exception riêng; không thấy → `notFound('...')`.
6. Mapper `toResponse`/`toResponseList` (ẩn field nhạy cảm, map nested
   relation theo spec).
7. Controller: đủ route, đúng thứ tự, **bắt buộc có `@Permissions(SYSTEM_PERMISSIONS...)`** (hoặc `@Public()` nếu API mở công khai), `@SwaggerDoc` mọi nơi, response qua `ApiResponse.*` (hoặc data thuần + `@HttpCode`).
8. `@Module` khai báo đủ `forFeature/controllers/providers/exports`; import
   module phụ thuộc nếu cần; đăng ký vào `app.module.ts`.
9. Kiểm tra: `npm run start:dev` → Swagger `/docs` đầy đủ → test Postman
   (tạo 201, list phân trang, chi tiết, update, xóa mềm 204).
10. Format đúng: 2 spaces, không semicolon, single quote, tiếng Việt có dấu,
    không để `logger.log` rác.

---

## 12. Anti-patterns (tránh làm)

- ❌ **Hardcode role trong controller bằng `@Roles(...)`**: Phân quyền Finora là phân quyền động qua UI, bắt buộc dùng `@Permissions(SYSTEM_PERMISSIONS.<CODE>)`.
- ❌ **Thiếu decorator phân quyền `@Permissions(...)`** trên các API nghiệp vụ/quản trị.
- ❌ **Gõ chuỗi permission tùy tiện (magic string)**: Luôn import và sử dụng hằng số `SYSTEM_PERMISSIONS` từ `src/common/constants/permission.constant.ts`.
- ❌ **Quên gắn `@Public()`** trên các API không yêu cầu xác thực (đăng nhập, đăng ký, OAuth callback...).
- ❌ Service dùng `@InjectRepository` / gọi TypeORM trực tiếp — phải qua
  Repository layer nội bộ của module.
- ❌ **Inject / gọi Repository của module khác**: Service của module này tuyệt đối KHÔNG
  được inject `XxxRepository` của module khác. Mọi giao tiếp giữa các module bắt buộc
  phải thông qua `Service` tương ứng (`ModuleA` inject `ServiceB`, `ServiceB` gọi `RepositoryB`).
- ❌ **Export Repository ra khỏi Module**: Feature module chỉ `exports: [XxxService]`,
  tuyệt đối KHÔNG export `XxxRepository` ra ngoài.
- ❌ Controller return entity trực tiếp — phải qua Mapper.
- ❌ Throw `HttpException` thủ công / exception chung chung — dùng `AppError`
  hoặc exception class riêng.
- ❌ Hard-code `page=1, limit=10, max=100` trong DTO — lấy từ `<X>_CONSTANTS`.
- ❌ Đặt relation mà quên filter soft delete trong QueryBuilder —
  `where('alias.deletedAt IS NULL')`.
- ❌ Map `password` hoặc field nội bộ vào Response DTO.
- ❌ Không `@SwaggerDoc` / thiếu `@ApiProperty` cho DTO.
- ❌ Khai báo thêm `TypeOrmModule.forRoot` trong feature module.
- ❌ Message lỗi để tiếng Anh / không có dấu — toàn bộ project dùng tiếng Việt.
- ❌ `overrideExisting`, `synchronize: true` ở production (root config đã
  quản lý; đừng sửa).
- ❌ Không gọi `TypeOrmModule.forFeature` mà vẫn `@InjectRepository` → lỗi lúc chạy.