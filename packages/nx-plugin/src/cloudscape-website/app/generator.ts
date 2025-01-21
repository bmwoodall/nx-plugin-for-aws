/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  addDependenciesToPackageJson,
  Tree,
  readProjectConfiguration,
  joinPathFragments,
  generateFiles,
  names,
  updateJson,
  ProjectConfiguration,
  installPackagesTask,
  addProjectConfiguration,
  OverwriteStrategy,
  getPackageManagerCommand,
} from '@nx/devkit';
import { tsquery, ast } from '@phenomnomnominal/tsquery';
import {
  factory,
  ObjectLiteralExpression,
  isPropertyAssignment,
} from 'typescript';
import { AppGeneratorSchema } from './schema';
import { applicationGenerator } from '@nx/react';
import {
  PACKAGES_DIR,
  SHARED_CONSTRUCTS_DIR,
  sharedConstructsGenerator,
} from '../../utils/shared-constructs';
import { getNpmScopePrefix, toScopeAlias } from '../../utils/npm-scope';
import { configureTsProject } from '../../ts/lib/ts-project-utils';
import { withVersions } from '../../utils/versions';
import { getRelativePathToRoot } from '../../utils/paths';
import { formatFilesInSubtree } from '../../utils/format';
import { toClassName, toKebabCase } from '../../utils/names';
import { addStarExport } from '../../utils/ast';
export async function appGenerator(tree: Tree, schema: AppGeneratorSchema) {
  const npmScopePrefix = getNpmScopePrefix(tree);
  const websiteNameClassName = toClassName(schema.name);
  const websiteNameKebabCase = toKebabCase(schema.name);
  const fullyQualifiedName = `${npmScopePrefix}${websiteNameKebabCase}`;
  const websiteContentPath = joinPathFragments(
    schema.directory ?? '.',
    websiteNameKebabCase
  );
  // TODO: consider exposing and supporting e2e tests
  const e2eTestRunner = 'none';
  await applicationGenerator(tree, {
    ...schema,
    name: fullyQualifiedName,
    directory: websiteContentPath,
    routing: false,
    addPlugin: schema.addPlugin ?? true,
    e2eTestRunner,
    linter: 'eslint',
    bundler: 'vite',
    unitTestRunner: 'vitest',
  });
  if (!tree.exists(`${websiteContentPath}/project.json`)) {
    addProjectConfiguration(tree, fullyQualifiedName, {
      root: websiteContentPath,
      name: fullyQualifiedName,
      sourceRoot: `${websiteContentPath}/src`,
      projectType: 'application',
      tags: [],
      targets: {
        'load:runtime-config': {
          executor: 'nx:run-commands',
          metadata: {
            description: `Load runtime config from your deployed stack for dev purposes. You must set the AWS_REGION and CDK_APP_DIR env variables whilst calling i.e: AWS_REGION=ap-southeast-2 CDK_APP_DIR=./dist/packages/infra/cdk.out pnpm exec nx run ${fullyQualifiedName}:load:runtime-config`,
          },
          options: {
            command: `cdk-app WebsiteBucket get --key runtime-config.json './${websiteContentPath}/public/runtime-config.json'`,
          },
        },
      },
    });
  }
  configureTsProject(tree, {
    dir: websiteContentPath,
    fullyQualifiedName,
  });
  await sharedConstructsGenerator(tree);
  if (
    !tree.exists(
      joinPathFragments(
        PACKAGES_DIR,
        SHARED_CONSTRUCTS_DIR,
        'src',
        'app',
        'static-websites',
        `${websiteNameKebabCase}.ts`
      )
    )
  ) {
    const npmScopePrefix = getNpmScopePrefix(tree);
    generateFiles(
      tree,
      joinPathFragments(
        __dirname,
        'files',
        SHARED_CONSTRUCTS_DIR,
        'src',
        'app'
      ),
      joinPathFragments(PACKAGES_DIR, SHARED_CONSTRUCTS_DIR, 'src', 'app'),
      {
        ...schema,
        npmScopePrefix,
        scopeAlias: toScopeAlias(npmScopePrefix),
        websiteContentPath: joinPathFragments('dist', websiteContentPath),
        websiteNameKebabCase,
        websiteNameClassName,
      },
      {
        overwriteStrategy: OverwriteStrategy.KeepExisting,
      }
    );
    const shouldGenerateCoreStaticWebsiteConstruct = !tree.exists(
      joinPathFragments(
        PACKAGES_DIR,
        SHARED_CONSTRUCTS_DIR,
        'src',
        'core',
        'static-website.ts'
      )
    );
    if (shouldGenerateCoreStaticWebsiteConstruct) {
      generateFiles(
        tree,
        joinPathFragments(
          __dirname,
          'files',
          SHARED_CONSTRUCTS_DIR,
          'src',
          'core'
        ),
        joinPathFragments(PACKAGES_DIR, SHARED_CONSTRUCTS_DIR, 'src', 'core'),
        {
          ...schema,
          npmScopePrefix,
          scopeAlias: toScopeAlias(npmScopePrefix),
          websiteContentPath: joinPathFragments('dist', websiteContentPath),
          websiteNameKebabCase,
          websiteNameClassName,
        },
        {
          overwriteStrategy: OverwriteStrategy.KeepExisting,
        }
      );
    }
    addStarExport(
      tree,
      joinPathFragments(
        PACKAGES_DIR,
        SHARED_CONSTRUCTS_DIR,
        'src',
        'app',
        'index.ts'
      ),
      './static-websites/index.js'
    );
    addStarExport(
      tree,
      joinPathFragments(
        PACKAGES_DIR,
        SHARED_CONSTRUCTS_DIR,
        'src',
        'app',
        'static-websites',
        'index.ts'
      ),
      `./${websiteNameKebabCase}.js`
    );
    if (shouldGenerateCoreStaticWebsiteConstruct) {
      addStarExport(
        tree,
        joinPathFragments(
          PACKAGES_DIR,
          SHARED_CONSTRUCTS_DIR,
          'src',
          'core',
          'index.ts'
        ),
        './static-website.js'
      );
    }
  }
  updateJson(
    tree,
    joinPathFragments(PACKAGES_DIR, SHARED_CONSTRUCTS_DIR, 'project.json'),
    (config: ProjectConfiguration) => {
      if (!config.targets) {
        config.targets = {};
      }
      if (!config.targets.build) {
        config.targets.build = {};
      }
      config.targets.build.dependsOn = [
        ...(config.targets.build.dependsOn ?? []),
        `${fullyQualifiedName}:build`,
      ];
      return config;
    }
  );
  const projectConfig = readProjectConfiguration(tree, fullyQualifiedName);
  const libraryRoot = projectConfig.root;
  tree.delete(joinPathFragments(libraryRoot, 'src', 'app'));
  generateFiles(
    tree, // the virtual file system
    joinPathFragments(__dirname, './files/app'), // path to the file templates
    libraryRoot, // destination path of the files
    {
      ...schema,
      fullyQualifiedName,
      pkgMgrCmd: getPackageManagerCommand().exec,
    }, // config object to replace variable in file templates
    {
      overwriteStrategy: OverwriteStrategy.Overwrite,
    }
  );
  if (e2eTestRunner !== 'none') {
    const e2eFullyQualifiedName = `${fullyQualifiedName}-e2e`;
    const e2eRoot = readProjectConfiguration(tree, e2eFullyQualifiedName).root;
    generateFiles(
      tree, // the virtual file system
      joinPathFragments(__dirname, `./files/e2e/${e2eTestRunner}`), // path to the file templates
      e2eRoot, // destination path of the files
      { ...schema, ...names(fullyQualifiedName) },
      {
        overwriteStrategy: OverwriteStrategy.KeepExisting,
      }
    );
    configureTsProject(tree, {
      fullyQualifiedName: e2eFullyQualifiedName,
      dir: e2eRoot,
    });
  }
  const viteConfigPath = joinPathFragments(libraryRoot, 'vite.config.ts');
  const viteConfigContents = tree.read(viteConfigPath)?.toString();
  if (viteConfigContents) {
    let viteConfigUpdatedContents = viteConfigContents;

    viteConfigUpdatedContents = tsquery
      .map(
        ast(viteConfigContents),
        'ObjectLiteralExpression',
        (node: ObjectLiteralExpression) => {
          return factory.createObjectLiteralExpression(
            [
              factory.createPropertyAssignment(
                'define',
                factory.createObjectLiteralExpression(
                  [
                    factory.createPropertyAssignment(
                      'global',
                      factory.createObjectLiteralExpression()
                    ),
                  ],
                  true
                )
              ),
              ...node.properties,
            ],
            true
          );
        }
      )
      .getFullText();

    viteConfigUpdatedContents = tsquery
      .map(
        ast(viteConfigUpdatedContents),
        'ObjectLiteralExpression',
        (node: ObjectLiteralExpression) => {
          const updatedProperties = node.properties.map((prop) => {
            if (isPropertyAssignment(prop) && prop.name.getText() === 'build') {
              const buildConfig = prop.initializer as ObjectLiteralExpression;
              return factory.createPropertyAssignment(
                'build',
                factory.createObjectLiteralExpression(
                  buildConfig.properties.map((buildProp) => {
                    if (
                      isPropertyAssignment(buildProp) &&
                      buildProp.name.getText() === 'outDir'
                    ) {
                      return factory.createPropertyAssignment(
                        'outDir',
                        factory.createStringLiteral(
                          joinPathFragments(
                            getRelativePathToRoot(tree, fullyQualifiedName),
                            'dist',
                            websiteContentPath
                          )
                        )
                      );
                    }
                    return buildProp;
                  }),
                  true
                )
              );
            }
            return prop;
          });
          return factory.createObjectLiteralExpression(updatedProperties, true);
        }
      )
      .getFullText();

    if (viteConfigContents !== viteConfigUpdatedContents) {
      tree.write(viteConfigPath, viteConfigUpdatedContents);
    }
  }
  updateJson(
    tree,
    joinPathFragments(websiteContentPath, 'tsconfig.json'),
    (tsconfig) => ({
      ...tsconfig,
      compilerOptions: {
        ...tsconfig.compilerOptions,
        moduleResolution: 'Bundler',
        module: 'Preserve',
      },
    })
  );
  updateJson(
    tree,
    joinPathFragments(websiteContentPath, 'tsconfig.app.json'),
    (tsconfig) => ({
      ...tsconfig,
      compilerOptions: {
        ...tsconfig.compilerOptions,
        lib: ['DOM'],
      },
    })
  );
  addDependenciesToPackageJson(
    tree,
    withVersions([
      '@cloudscape-design/components',
      '@cloudscape-design/board-components',
      '@cloudscape-design/global-styles',
      'react-router-dom',
    ]),
    withVersions(['cdk-app-cli'])
  );
  await formatFilesInSubtree(tree, websiteContentPath);
  return () => {
    if (!schema.skipInstall) {
      installPackagesTask(tree);
    }
  };
}
export default appGenerator;
