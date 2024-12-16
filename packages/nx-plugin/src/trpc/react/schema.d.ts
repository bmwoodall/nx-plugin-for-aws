/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ReactGeneratorSchema {
  frontendProjectName: string;
  backendProjectName: string;
  auth: 'IAM' | 'None';
}
