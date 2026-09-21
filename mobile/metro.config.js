// Metro configuration.
//
// The mobile app deliberately does NOT copy the business logic. It consumes
// ../src directly — the same types, Supabase API layer, reward economy and
// query hooks the web app uses — so the two platforms can never drift apart.
//
// Two things make that work:
//
//   * watchFolders lets Metro read files outside mobile/, which it otherwise
//     refuses to do.
//   * A resolveRequest hook pins the packages that must exist exactly once in
//     the bundle. Shared files under ../src resolve their imports by walking
//     up from their own directory, which reaches the web app's node_modules
//     first. React resolved twice means two copies in one bundle and every
//     hook throwing "invalid hook call"; React Query resolved twice means the
//     provider and the hooks read different caches.
//
// Only that allowlist is redirected. Everything else uses Metro's normal
// resolution, including nested node_modules — blanket-disabling hierarchical
// lookup breaks transitive dependencies such as reanimated's use of semver.
//
// Platform-specific halves are resolved by extension: src/lib/platform/env.ts
// is the web reader, env.native.ts is the Expo one, and Metro prefers
// .native.ts automatically.

const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [path.resolve(workspaceRoot, 'src')]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Packages that must resolve to exactly one copy, no matter which directory
// the importing file lives in.
const SINGLETONS = new Set([
  'react',
  'react-dom',
  'react-native',
  '@tanstack/react-query',
  '@supabase/supabase-js',
])

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pkg = moduleName.startsWith('@')
    ? moduleName.split('/').slice(0, 2).join('/')
    : moduleName.split('/')[0]

  if (SINGLETONS.has(pkg)) {
    const subpath = moduleName.slice(pkg.length)
    return context.resolveRequest(
      context,
      path.join(projectRoot, 'node_modules', pkg) + subpath,
      platform,
    )
  }

  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
