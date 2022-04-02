import esbuild from 'esbuild'
import { resolve } from 'path'
import { readdirSync } from 'fs-extra'
import { name, description, version, homepage, license } from '../package.json'

const resolveRoot = (...paths: string[]) => resolve(__dirname, '..', ...paths)

const resolveSrc = (...paths: string[]) => resolveRoot('src', ...paths)

const resolveExtensions = () => {
  const extensionsDir = resolveSrc('extensions')
  console.log(extensionsDir)
  return readdirSync(extensionsDir, { encoding: 'utf-8' }).map((dir) => resolve(extensionsDir, dir))
}

const resolveBanner = () => ({
  js: `\
  /*!
  * ${name} v${version}
  * ${description}
  *
  * ${homepage}
  *
  * Licensed under the ${license} license.
  */\
`
})

esbuild.buildSync({
  entryPoints: ([] as string[]).concat(resolveSrc('index'), resolveExtensions()),
  bundle: true,
  outdir: resolveRoot('lib'),
  format: 'esm',
  splitting: true,
  banner: resolveBanner(),
  external: ['axios', 'localforage'],
  tsconfig: resolveRoot('tsconfig.lib.json')
})
