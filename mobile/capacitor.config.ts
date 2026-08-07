import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.foroamigos.app',
  appName: 'Foro Amigos',
  webDir: 'www',
  server: {
    // El backend de desarrollo se sirve por http, no por https
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
