import { OUT_DIR } from '../../../scripts/build.mjs'
import { buildDts, buildPkg, getDirname, resolvePkgJson } from '../../../scripts/utils.mjs'
import { resolve } from 'path'

const __dirname = getDirname(import.meta.url)
const ADAPTOR_DIR = 'adaptors'
const WRAPPER_DIR = 'wrappers'

const resolveRoot = (...paths) => resolve(__dirname, '..', ...paths)
const resolveLib = (...paths) => resolveRoot('lib', ...paths)
const resolveOut = (...paths) => resolveRoot(OUT_DIR, ...paths)

const pkgJson = resolvePkgJson(resolveRoot())

const build = (input, output) => {
  buildPkg({
    pkgJson,
    entryPoints: [input],
    outdir: output
  })

  buildDts(input, output + '/index')
}

build(resolveLib(ADAPTOR_DIR, 'index'), resolveOut(ADAPTOR_DIR))
build(resolveLib(WRAPPER_DIR, 'index'), resolveOut(WRAPPER_DIR))
