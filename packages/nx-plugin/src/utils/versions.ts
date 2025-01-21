/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const VERSIONS = {
  '@cdklabs/cdk-validator-cfnguard': '^0.0.60',
  '@aws-cdk/aws-cognito-identitypool-alpha': '^2.166.0-alpha.0',
  '@aws-sdk/client-cognito-identity': '^3.721.0',
  '@aws-sdk/credential-provider-cognito-identity': '^3.721.0',
  '@aws-lambda-powertools/logger': '^2.11.0',
  '@aws-lambda-powertools/metrics': '^2.11.0',
  '@aws-lambda-powertools/tracer': '^2.11.0',
  '@cloudscape-design/board-components': '^3.0.84',
  '@cloudscape-design/components': '^3.0.823',
  '@cloudscape-design/global-styles': '^1.0.34',
  '@tanstack/react-query': '^5.59.20',
  '@trpc/react-query': '11.0.0-rc.700',
  '@trpc/client': '11.0.0-rc.700',
  '@trpc/server': '11.0.0-rc.700',
  '@types/aws-lambda': '^8.10.145',
  aws4fetch: '^1.0.20',
  'aws-cdk': '^2.166.0',
  'aws-cdk-lib': '^2.166.0',
  'aws-xray-sdk-core': '^3.10.2',
  'cdk-app-cli': '^0.0.427',
  constructs: '^10.4.2',
  esbuild: '^0.24.0',
  'eslint-plugin-prettier': '^5.2.2',
  'oidc-client-ts': '^3.1.0',
  prettier: '^3.4.2',
  'react-oidc-context': '^3.2.0',
  'react-router-dom': '^7.1.1',
  'source-map-support': '^0.5.21',
  tsx: '^4.19.2',
  zod: '^3.23.8',
} as const;
/**
 * Add versions to the given dependencies
 */
export const withVersions = (deps: (keyof typeof VERSIONS)[]) =>
  Object.fromEntries(deps.map((dep) => [dep, VERSIONS[dep]]));
