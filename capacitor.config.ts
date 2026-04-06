import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korutube.app',
  appName: 'KoruTube',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://cocuk-video.vercel.app',
    cleartext: true
  }
};

export default config;
