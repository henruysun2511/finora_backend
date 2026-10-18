import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { MailerConfig } from '../../config/mailer.config';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: MailerConfig.HOST,
      port: MailerConfig.PORT,
      secure: MailerConfig.SECURE,
      auth: MailerConfig.USER
        ? {
            user: MailerConfig.USER,
            pass: MailerConfig.PASS,
          }
        : undefined,
    });
  }

  /**
   * Gửi email chung
   */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    if (!MailerConfig.USER) {
      this.logger.warn(`SMTP chưa cấu hình, bỏ qua gửi email đến: ${options.to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"${MailerConfig.FROM_NAME}" <${MailerConfig.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Gửi email thành công tới ${options.to}: "${options.subject}"`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      this.logger.error(`Thất bại khi gửi email tới ${options.to}: ${message}`);
      return false;
    }
  }

  /**
   * Gửi email xác thực tài khoản
   */
  async sendVerificationEmail(
    to: string,
    userName: string,
    verifyUrl: string,
  ): Promise<boolean> {
    const subject = 'FINORA — Xác thực tài khoản của bạn';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; margin-bottom: 16px;">Chào mừng bạn đến với FINORA!</h2>
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại nền tảng quản lý tài chính thông minh <strong>Finora</strong>. Vui lòng bấm vào nút bên dưới để kích hoạt tài khoản của bạn:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #4F46E5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Xác thực tài khoản</a>
        </div>
        <p style="color: #666; font-size: 13px;">Nếu nút trên không hoạt động, bạn có thể sao chép liên kết này vào trình duyệt: <br><a href="${verifyUrl}">${verifyUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Đây là email tự động từ Finora Platform. Vui lòng không trả lời email này.</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  /**
   * Gửi email mã OTP đặt lại mật khẩu
   */
  async sendPasswordResetEmail(
    to: string,
    userName: string,
    otpCode: string,
  ): Promise<boolean> {
    const subject = 'FINORA — Mã xác nhận đặt lại mật khẩu';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #DC2626; margin-bottom: 16px;">Yêu cầu đặt lại mật khẩu</h2>
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Finora của bạn. Đây là mã OTP bảo mật:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1F2937; background: #F3F4F6; padding: 10px 24px; border-radius: 8px; border: 1px dashed #D1D5DB;">${otpCode}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Mã xác nhận này sẽ hết hạn trong vòng <strong>10 phút</strong>. Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email và bảo mật tài khoản.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Finora Financial Platform Team</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  /**
   * Gửi email cảnh báo vượt hạn mức ngân sách
   */
  async sendBudgetAlertEmail(
    to: string,
    userName: string,
    budgetName: string,
    percentage: number,
  ): Promise<boolean> {
    const subject = `FINORA Cảnh báo — Ngân sách "${budgetName}" đã đạt ${percentage}%`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #F59E0B; margin-bottom: 16px;">Cảnh báo chi tiêu ngân sách</h2>
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p>Trợ lý tài chính Finora phát hiện ngân sách <strong>${budgetName}</strong> của bạn đã chi tiêu đạt mức <strong>${percentage}%</strong> hạn mức đặt ra.</p>
        <p>Hãy kiểm tra lại danh sách chi tiêu gần đây để cân đối tài chính cho những ngày còn lại trong kỳ.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Finora Smart Budgeting</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }
}
