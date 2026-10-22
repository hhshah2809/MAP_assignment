import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/v1/orders': {
        target: process.env.VITE_ORDER_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/v1/shipments': {
        target: process.env.VITE_SHIPMENT_SERVICE_URL || 'http://localhost:3002',
        changeOrigin: true
      },
      '/api/v1/tracking': {
        target: process.env.VITE_TRACKING_SERVICE_URL || 'http://localhost:3003',
        changeOrigin: true
      },
      '/api/v1/predictions': {
        target: process.env.VITE_PREDICTION_SERVICE_URL || 'http://localhost:3004',
        changeOrigin: true
      }
    }
  }
});
