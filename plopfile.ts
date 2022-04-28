import { NodePlopAPI } from 'plop'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const resolveRoot = (...paths: string[]) => resolve(__dirname, '.', ...paths)
const resolvePackages = (...paths: string[]) => resolveRoot('packages', ...paths)
const resolveTemplates = (...paths: string[]) => resolveRoot('templates', ...paths)

const notEmpty = (name: string) => {
  return (v: string) => {
    if (!v || v.trim() === '') {
      return `${name} is required`
    } else {
      return true
    }
  }
}

const PLUGIN_PREFIX = 'axios-ext-'

export default function (plop: NodePlopAPI) {
  plop.setGenerator('plugin', {
    description: 'Generate plugin template of AxiosExt.',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Plugin name',
        validate: notEmpty('name')
      },
      {
        type: 'input',
        name: 'description',
        message: 'Plugin description'
      },
      {
        type: 'input',
        name: 'version',
        message: 'Plugin version',
        default: '0.0.0',
        validate: notEmpty('version')
      }
    ],
    actions: (data) => {
      const { name = '', description = '', version = '0.0.0' } = data ?? {}

      const pkgName = plop.getHelper('kebabCase')(name).trim().toLowerCase()
      const dirName = PLUGIN_PREFIX + pkgName
      const pluginName = plop.getHelper('pascalCase')(pkgName)

      const actionData = {
        pkgName,
        pluginName,
        description: description.trim(),
        version: version.trim()
      }

      const pkgPath = resolvePackages(dirName, 'package.json')
      const readMePath = resolvePackages(dirName, 'README.md')
      const indexPath = resolvePackages(dirName, 'lib', 'index.ts')
      const tsconfigPath = resolvePackages(dirName, 'tsconfig.json')

      const createAction = (path = '', templateFile = '') => ({
        type: 'add',
        path,
        templateFile,
        data: actionData
      })

      return [
        createAction(pkgPath, resolveTemplates('plugins/package.json.hbs')),
        createAction(readMePath, resolveTemplates('plugins/README.md.hbs')),
        createAction(indexPath, resolveTemplates('plugins/index.ts.hbs')),
        createAction(tsconfigPath, resolveTemplates('plugins/tsconfig.json.hbs'))
      ]
    }
  })
}
