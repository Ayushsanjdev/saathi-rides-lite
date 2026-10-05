import {defineConfig} from 'tsup';
export default defineConfig({entry:['src/server.ts','src/provision-operator.ts'],format:['esm'],target:'node24',noExternal:['@saathi/contracts'],clean:true,sourcemap:true});
