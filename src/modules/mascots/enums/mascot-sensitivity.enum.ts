// src/modules/mascots/enums/mascot-sensitivity.enum.ts

export enum MascotSensitivity {
  /**
   * Phản hồi chủ động sau mỗi giao dịch hoặc khi mở ứng dụng.
   */
  ALL = 'ALL',

  /**
   * Chỉ đưa ra phản hồi / cảnh báo khi chi tiêu bất thường hoặc chạm trần ngân sách / nợ (Mặc định).
   */
  ANOMALIES_ONLY = 'ANOMALIES_ONLY',

  /**
   * Chế độ tĩnh lặng: Chỉ hiển thị linh vật, không tự động bật popup hoặc đưa ra lời khuyên.
   */
  SILENT = 'SILENT',
}
