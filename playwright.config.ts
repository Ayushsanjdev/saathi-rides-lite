import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',fullyParallel:false,workers:1,timeout:30000,use:{baseURL:'http://127.0.0.1:3000',trace:'retain-on-failure'},projects:[{name:'mobile',use:{...devices['Pixel 5']}}],webServer:{command:'DEMO_MODE=true npm run dev',url:'http://127.0.0.1:3000',reuseExistingServer:true,timeout:180000}});
