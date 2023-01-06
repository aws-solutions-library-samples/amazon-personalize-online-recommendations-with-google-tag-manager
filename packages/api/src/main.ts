// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { App, Aspects, Tags } from 'aws-cdk-lib';
import { AppStack } from './stacks/app-stack';
import { AwsSolutionsChecks } from 'cdk-nag';

try {
  const app = new App();
  const {
    personalizedRankingCampaignName,
    clickStreamEventTrackingId,
    simSolutionVersion,
    apiUrl,
    prefix = 'RE',
    itemsDataset,
  } = process.env;
  if (!personalizedRankingCampaignName) {
    throw new Error(
      'missing required environment variable: personalizedRankingCampaignName'
    );
  }
  if (!clickStreamEventTrackingId) {
    throw new Error(
      'missing required environment variable: clickStreamEventTrackingId'
    );
  }
  if (!simSolutionVersion) {
    throw new Error(
      'missing required environment variable: simSolutionVersion'
    );
  }
  if (!itemsDataset) {
    throw new Error('missing required environment variable: itemsDataset');
  }
  new AppStack(app, prefix, {
    prefix,
    partitionKeyName: 'id',
    similarItems: '25',
    personalizedRankingCampaignName,
    clickStreamEventTrackingId,
    simSolutionVersion,
    itemsDataset,
    apiUrl,
  });
  Tags.of(app).add('Project', prefix);
  Aspects.of(app).add(new AwsSolutionsChecks({ reports: true }));
} catch (error) {
  console.error(error);
  throw error;
}
