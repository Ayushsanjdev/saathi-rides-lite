import {afterEach,expect,it,vi} from 'vitest';
import {readConfig} from '../src/config';
afterEach(()=>vi.unstubAllEnvs());
it('isolates hosted demos from the configured application database',()=>{
  vi.stubEnv('MONGODB_URI','mongodb+srv://user:password@example.mongodb.net/saathi?retryWrites=true');
  vi.stubEnv('SESSION_SECRET','test-secret-at-least-thirty-two-characters');
  vi.stubEnv('APP_ORIGIN','https://example.com');vi.stubEnv('NODE_ENV','production');
  vi.stubEnv('HOSTED_DEMO','true');
  const config=readConfig();
  expect(new URL(config.mongoUri).pathname).toBe('/saathi_demo');
  expect(new URL(config.mongoUri).searchParams.get('retryWrites')).toBe('true');
  expect(config).toMatchObject({production:true,hostedDemo:true});
  vi.stubEnv('HOSTED_DEMO','false');
  expect(new URL(readConfig().mongoUri).pathname).toBe('/saathi');
});
