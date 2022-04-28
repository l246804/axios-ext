import { resolve } from 'path'
import { buildPkg, resolvePkgDirs, resolvePkgJson } from './utils.mjs'

const ENTRY_NAME = 'lib/index'
export const OUT_DIR = 'dist'

const buildSubPkgs = () => {
  resolvePkgDirs().forEach((dir) => {
    const input = resolve(dir, ENTRY_NAME)
    const outDir = resolve(dir, OUT_DIR)

    const pkgJson = resolvePkgJson(dir)

    buildPkg({
      pkgJson,
      entryPoints: [input],
      outdir: outDir
    })
  })
}

buildSubPkgs()
