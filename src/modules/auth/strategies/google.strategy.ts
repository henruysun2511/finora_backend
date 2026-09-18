import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { GoogleConfig } from '../../../config/google.config';

export interface GoogleProfileDto {
  googleId: string;
  email: string;
  fullName: string;
  avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: GoogleConfig.CLIENT_ID || 'not-configured',
      clientSecret: GoogleConfig.CLIENT_SECRET || 'not-configured',
      callbackURL: GoogleConfig.CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, displayName, emails, photos } = profile;
    const userProfile: GoogleProfileDto = {
      googleId: id,
      email: emails?.[0]?.value ?? '',
      fullName: displayName ?? 'Google User',
      avatar: photos?.[0]?.value,
    };
    done(null, userProfile);
  }
}
