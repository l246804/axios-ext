module.exports = {
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'esnext',
    sourceType: 'module'
  },

  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],

  rules: {
    'prettier/prettier': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-non-null-assertion': 0
  }
}
