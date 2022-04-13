import { resolve } from 'path'
import { buildDts, buildPkg, resolvePkgDirs, resolvePkgJson } from './utils.mjs'

const ENTRY_NAME = 'lib/index'
export const OUT_DIR = 'dist'
const OUT_FILE = OUT_DIR + '/index'

const buildSubPkgs = () => {
  resolvePkgDirs().forEach((dir) => {
    const input = resolve(dir, ENTRY_NAME)
    const output = resolve(dir, OUT_DIR)
    const outfile = resolve(dir, OUT_FILE)

    const pkgJson = resolvePkgJson(dir)

    buildPkg({
      pkgJson,
      entryPoints: [input],
      outdir: output
    })

    buildDts(input, outfile)
  })
}

buildSubPkgs()
