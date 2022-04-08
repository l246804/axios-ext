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
        validate: notEmpty('name'),
        transformer: (value = '') => value.trim()
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
        validate: notEmpty('version'),
        transformer: (value = '') => value.trim()
      }
    ],
    actions: (data) => {
      // eslint-disable-next-line prefer-const
      let { name = '', description = '', version = '0.0.0' } = data ?? {}
      name = plop.getHelper('kebabCase')(name)

      const dirName = PLUGIN_PREFIX + name
      const pluginName = plop.getHelper('pascalCase')(name)

      const actionData = {
        name,
        pluginName,
        description: description.trim(),
        version
      }

      const pkgPath = resolvePackages(dirName, 'package.json')
      const readMePath = resolvePackages(dirName, 'README.md')
      const indexPath = resolvePackages(dirName, 'lib', 'index.ts')

      const createAction = (path = '', templateFile = '', data: any = {}) => ({
        type: 'add',
        path,
        templateFile,
        data
      })

      return [
        createAction(pkgPath, resolveTemplates('plugins/package.json.hbs'), actionData),
        createAction(readMePath, resolveTemplates('plugins/README.md.hbs'), actionData),
        createAction(indexPath, resolveTemplates('plugins/index.ts.hbs'), actionData)
      ]
    }
  })
}
