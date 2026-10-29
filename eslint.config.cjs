const path = require('path')
const { createRequire } = require('module')

function requireFromAvailable(moduleName) {
  const candidates = [
    createRequire(__filename),
    createRequire(path.join(process.cwd(), 'package.json')),
    createRequire(path.join(process.cwd(), 'apps', 'api', 'package.json'))
  ]

  for (const localRequire of candidates) {
    try {
      return localRequire(moduleName)
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `Cannot resolve "${moduleName}". Install it in root or workspace dependencies.`
  )
}

const tsParser = requireFromAvailable('@typescript-eslint/parser')
const tsPlugin = requireFromAvailable('@typescript-eslint/eslint-plugin')
const prettierPlugin = requireFromAvailable('eslint-plugin-prettier')
const eslintConfigPrettier = requireFromAvailable('eslint-config-prettier')

const commonRules = {
  ...eslintConfigPrettier.rules,
  semi: ['error', 'never'],
  'comma-dangle': ['error', 'never'],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }
  ],
  'prettier/prettier': [
    'error',
    {
      semi: false,
      trailingComma: 'none',
      endOfLine: 'auto'
    }
  ]
}

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**'
    ]
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin
    },
    rules: commonRules
  }
]
