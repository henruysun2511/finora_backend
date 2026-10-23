import { ApiProperty } from '@nestjs/swagger';

export class UserGrowthDto {
  @ApiProperty({ example: 1250 })
  totalUsers: number;

  @ApiProperty({ example: 450, nullable: true })
  dau: number | null;

  @ApiProperty({ example: 1100, nullable: true })
  mau: number | null;

  @ApiProperty({ example: 78.5, nullable: true })
  weeklyRetentionRate: number | null;
}

export class PlatformMetricsDto {
  @ApiProperty({ example: 25400 })
  totalTransactionsCount: number;

  @ApiProperty({ example: 320 })
  dailyTransactionsCount: number;

  @ApiProperty({ example: 520000000 })
  grossMerchandiseVolume: number;
}

export class AiClassifierPerformanceDto {
  @ApiProperty({ example: 94.2, nullable: true })
  accuracyPercentage: number | null;

  @ApiProperty({ example: 1520, nullable: true })
  processedReceiptsCount: number | null;

  @ApiProperty({ example: 98.1, nullable: true })
  ocrSuccessRate: number | null;
}

export class SystemHealthDto {
  @ApiProperty({ example: 'UP', nullable: true })
  status: string | null;

  @ApiProperty({ example: 45, nullable: true })
  cpuUsagePercentage: number | null;

  @ApiProperty({ example: 62, nullable: true })
  memoryUsagePercentage: number | null;

  @ApiProperty({ example: 120, nullable: true })
  apiLatencyMs: number | null;
}

export class OperationsDashboardResponseDto {
  @ApiProperty({ type: UserGrowthDto })
  userGrowth: UserGrowthDto;

  @ApiProperty({ type: PlatformMetricsDto })
  platformMetrics: PlatformMetricsDto;

  @ApiProperty({ type: AiClassifierPerformanceDto, nullable: true })
  aiClassifierPerformance: AiClassifierPerformanceDto | null;

  @ApiProperty({ type: SystemHealthDto, nullable: true })
  systemHealth: SystemHealthDto | null;
}
