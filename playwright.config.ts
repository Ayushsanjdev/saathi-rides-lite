import {defineConfig,devices} from '@playwright/test';
const baseURL=`http://127.0.0.1:${process.env.SAATHI_E2E_PORT||'3100'}`;
export default defineConfig({testDir:'./tests',fullyParallel:false,workers:1,timeout:30000,use:{baseURL,trace:'retain-on-failure',channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL},projects:[{name:'mobile',use:{...devices['Pixel 5']}}],webServer:{command:'DEMO_MODE=true pnpm dev',url:baseURL,reuseExistingServer:false,timeout:180000}});
