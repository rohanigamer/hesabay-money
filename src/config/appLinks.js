/**
 * App store and policy URLs. Set in app.json under extra, or override here.
 * - privacyPolicyUrl: required for store listing
 * - rateAppAndroidUrl: Play Store app page (defaults to id=com.hesabay.money)
 * - rateAppIosUrl: App Store app page (replace id when published)
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};

export const PRIVACY_POLICY_URL = extra.privacyPolicyUrl || 'https://sites.google.com/view/hesabay-money-privacy';

export const RATE_APP_ANDROID_URL = extra.rateAppAndroidUrl || 'https://play.google.com/store/apps/details?id=com.hesabay.money';

export const RATE_APP_IOS_URL = extra.rateAppIosUrl || 'https://apps.apple.com/app/id000000000';

export function getPrivacyPolicyUrl() {
  return PRIVACY_POLICY_URL;
}

export function getRateAppUrl() {
  return Platform.OS === 'ios' ? RATE_APP_IOS_URL : RATE_APP_ANDROID_URL;
}
