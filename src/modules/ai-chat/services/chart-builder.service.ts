// src/modules/ai-chat/services/chart-builder.service.ts
import { Injectable } from '@nestjs/common';
import { AI_CHAT_CONFIG } from '../constants';

export interface ChartItem {
  label: string;
  value: number;
}
export interface ChartDatum extends ChartItem {
  percentage: number;
}

/** Dựng payload biểu đồ cho FE (pie / bar / so sánh). Không chứa logic văn phong. */
@Injectable()
export class ChartBuilderService {
  /** Gộp các mục nhỏ thành "Khác" khi vượt quá maxSlices, sắp giảm dần theo giá trị. */
  buildPie(
    items: ChartItem[],
    maxSlices: number = AI_CHAT_CONFIG.PIE_MAX_SLICES,
  ) {
    const sorted = this.clean(items);
    let slices = sorted;
    if (sorted.length > maxSlices) {
      const head = sorted.slice(0, maxSlices - 1);
      const rest = sorted.slice(maxSlices - 1);
      slices = [
        ...head,
        { label: 'Khác', value: rest.reduce((s, i) => s + i.value, 0) },
      ];
    }
    const total = slices.reduce((s, i) => s + i.value, 0);
    return {
      chartType: 'pie' as const,
      total,
      data: this.withPercentages(slices, total),
    };
  }

  buildBar(items: ChartItem[], limit: number) {
    const top = this.clean(items).slice(0, Math.max(1, limit));
    const total = top.reduce((s, i) => s + i.value, 0);
    return {
      chartType: 'bar' as const,
      total,
      data: this.withPercentages(top, total),
    };
  }

  /** Hai cột so sánh kỳ trước / kỳ này + chênh lệch. */
  buildComparison(
    current: { label: string; value: number },
    previous: { label: string; value: number },
  ) {
    const delta = current.value - previous.value;
    const deltaPct =
      previous.value > 0
        ? Math.round((Math.abs(delta) / previous.value) * 100)
        : null;
    return {
      chartType: 'bar' as const,
      data: [
        { label: previous.label, value: previous.value },
        { label: current.label, value: current.value },
      ],
      delta,
      deltaAbs: Math.abs(delta),
      deltaPercent: deltaPct,
      direction:
        delta > 0
          ? ('up' as const)
          : delta < 0
            ? ('down' as const)
            : ('same' as const),
    };
  }

  /** Cộng dồn theo nhãn rồi sắp giảm dần; loại bỏ giá trị <= 0. */
  aggregate(rows: Array<{ label: string; value: number }>): ChartItem[] {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.label, (map.get(r.label) ?? 0) + r.value);
    return this.clean([...map].map(([label, value]) => ({ label, value })));
  }

  private clean(items: ChartItem[]): ChartItem[] {
    return items
      .filter((i) => Number.isFinite(i.value) && i.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  /** Phần trăm làm tròn theo "largest remainder" để tổng luôn đúng 100. */
  private withPercentages(items: ChartItem[], total: number): ChartDatum[] {
    if (total <= 0) return items.map((i) => ({ ...i, percentage: 0 }));
    const raw = items.map((i) => (i.value / total) * 100);
    const floors = raw.map(Math.floor);
    let remaining = 100 - floors.reduce((s, f) => s + f, 0);
    const order = raw
      .map((r, idx) => ({ idx, frac: r - floors[idx] }))
      .sort((a, b) => b.frac - a.frac);
    for (const o of order) {
      if (remaining <= 0) break;
      floors[o.idx] += 1;
      remaining -= 1;
    }
    return items.map((i, idx) => ({ ...i, percentage: floors[idx] }));
  }
}
