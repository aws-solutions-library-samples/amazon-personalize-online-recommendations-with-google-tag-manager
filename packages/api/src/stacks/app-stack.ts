/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Stack, App, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import {
  RestApi,
  Cors,
  Period,
  AwsIntegration,
  PassthroughBehavior,
  LambdaIntegration,
  Model,
  MethodLoggingLevel,
  AccessLogFormat,
  LogGroupLogDestination,
} from 'aws-cdk-lib/aws-apigateway';
import {
  PolicyDocument,
  Effect,
  PolicyStatement,
  AnyPrincipal,
  Role,
  ServicePrincipal,
  User,
  AccessKey,
  RoleProps,
} from 'aws-cdk-lib/aws-iam';
import { Stream, StreamMode, StreamEncryption } from 'aws-cdk-lib/aws-kinesis';
import {
  Architecture,
  Runtime,
  StartingPosition,
  Function,
  Code,
} from 'aws-cdk-lib/aws-lambda';
import {
  KinesisEventSource,
  S3EventSource,
} from 'aws-cdk-lib/aws-lambda-event-sources';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  EventType,
} from 'aws-cdk-lib/aws-s3';
import { Distribution, GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
//import { DeliveryStream } from '@aws-cdk/aws-kinesisfirehose-alpha';
//import { S3Bucket } from '@aws-cdk/aws-kinesisfirehose-destinations-alpha';
import {
  AttributeType,
  BillingMode,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
//import { Key } from 'aws-cdk-lib/aws-kms';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
//import { WafwebaclToCloudFront } from '@aws-solutions-constructs/aws-wafwebacl-cloudfront';
import { join } from 'path';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { NagSuppressions } from 'cdk-nag';
import { LogGroup } from 'aws-cdk-lib/aws-logs';

export interface AppStackProps extends StackProps {
  prefix: string;
  personalizedRankingCampaignName: string;
  clickStreamEventTrackingId: string;
  simSolutionVersion: string;
  partitionKeyName: string;
  similarItems: string;
  recommendedForYouName?: string;
  itemsDataset: string;
  apiUrl?: string;
}
export class AppStack extends Stack {
  props: AppStackProps;
  api?: RestApi;
  apiUser?: User;
  simItemsTable: Table;
  itemsTable: Table;
  apiKey: string;
  accessLogsBucket: Bucket;
  inputBucket: Bucket;
  outputBucket: Bucket;
  websiteBucket: Bucket;
  websiteDistribution: Distribution;
  distributionAccessLogsBucket: Bucket;
  domainName: string;

  constructor(scope: App, id: string, props: AppStackProps) {
    super(scope, id, props);
    this.props = props;
    this.setupBuckets();

    this.setupWebsiteDistribution();
    if (props.apiUrl) {
      this.setupApiUser();
    } else {
      this.setupApiGateway();
    }
    this.setupPutEvents();
    this.putItemsWorkFlow();
    this.setupCrossSellRecommendations();
    this.deployWebsite();
    //out of scope for the prototype
    //this.setupUserRecommendations();
    if (this.api) {
      //Add CDK Nag Suppressions for API Gateway
      NagSuppressions.addResourceSuppressions(
        this.api,
        [
          {
            id: 'AwsSolutions-APIG2',
            reason: 'Validation is done at the integration method',
          },
          {
            id: 'AwsSolutions-IAM4',
            reason:
              'API Gateway cloudwatch role is created by CDK with managed policy',
          },
          {
            id: 'AwsSolutions-APIG4',
            reason: 'API needs to be accessed by unauthenticated clients',
          },
          {
            id: 'AwsSolutions-COG4',
            reason: 'API needs to be accessed by unauthenticated clients',
          },
        ],
        true
      );
    }
  }

  setupBuckets() {
    const accessLogsBucket = this.setupBucket('AccessLogs');
    this.accessLogsBucket = accessLogsBucket;
    this.inputBucket = this.setupBucket(
      'SimilarItemsInput',
      accessLogsBucket,
      new PolicyStatement({
        actions: ['s3:GetObject', 's3:ListBucket'],
        principals: [new ServicePrincipal('personalize.amazonaws.com')],
      })
    );
    this.outputBucket = this.setupBucket(
      'SimilarItemsOutput',
      accessLogsBucket,
      new PolicyStatement({
        actions: ['s3:PutObject', 's3:ListBucket'],
        principals: [new ServicePrincipal('personalize.amazonaws.com')],
      })
    );
    this.websiteBucket = this.setupBucket('recommendations', accessLogsBucket);
    this.distributionAccessLogsBucket = this.setupBucket(
      'CloudFrontAccessLogs',
      accessLogsBucket
    );
  }

  setupBucket(
    bucketId: string,
    accessLogsBucket?: Bucket,
    resourcePolicy?: PolicyStatement
  ) {
    const bucket = new Bucket(this, bucketId, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      serverAccessLogsBucket: accessLogsBucket,
    });
    if (!accessLogsBucket) {
      NagSuppressions.addResourceSuppressions(
        bucket,
        [{ id: 'AwsSolutions-S1', reason: 'Access logs bucket' }],
        true
      );
    }
    if (resourcePolicy) {
      resourcePolicy.addResources(bucket.bucketArn, `${bucket.bucketArn}/*`);
      bucket.addToResourcePolicy(resourcePolicy);
    }
    return bucket;
  }

  setupApiGateway() {
    const api = new RestApi(this, 'ApiGateway', {
      restApiName: 'Recommendations',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:4200', `https://${this.domainName}`],
        allowMethods: Cors.ALL_METHODS,
        maxAge: Duration.days(1),
      },
      policy: new PolicyDocument({
        statements: [
          // Open up API to allow browsers to make unauthenticated requests
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [new AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*'],
          }),
        ],
      }),
      defaultMethodOptions: {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': Model.EMPTY_MODEL,
            },
          },
        ],
      },
      cloudWatchRole: true,
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        accessLogDestination: new LogGroupLogDestination(
          new LogGroup(this, 'APIAccessLogs')
        ),
      },
    });
    this.api = api;
    const apiKey = api.addApiKey('RecommendationsApiKey');
    //create, and add a usage plan for this api key
    api
      .addUsagePlan('RecommendationsUsagePlan', {
        name: 'RecommendationsUsagePlan',
        throttle: {
          rateLimit: 100, //starting with low limits for the prototype
          burstLimit: 1000,
        },
        quota: {
          limit: 1000000,
          period: Period.MONTH,
        },
        apiStages: [
          {
            stage: api.deploymentStage,
          },
        ],
      })
      .addApiKey(apiKey);
    //get api key value
    const apiKeyCustomResource = new AwsCustomResource(this, 'GetApiKey', {
      onUpdate: {
        service: 'APIGateway',
        action: 'getApiKey',
        parameters: {
          apiKey: apiKey.keyId,
          includeValue: true,
        },
        physicalResourceId: PhysicalResourceId.of(`APIKey:${apiKey.keyId}`),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [apiKey.keyArn],
          actions: ['apigateway:GET'],
        }),
      ]),
    });
    this.apiKey = apiKeyCustomResource.getResponseField('value');
    //setup WAF
    new WafwebaclToApiGateway(this, 'ApiGatewayWaf', {
      existingApiGatewayInterface: api,
    });

    //suppression for custom resource
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `/${this.props.prefix}/AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource`,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CDK Custom resource for getting API key value',
        },
      ]
    );
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `/${this.props.prefix}/AWS679f53fac002430cb0da5b7982bd2287/Resource`,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'CDK Custom resource for getting API key value',
        },
      ]
    );
  }

  setupLambdaRole(lambdaId: string, policies?: RoleProps['inlinePolicies']) {
    const role = new Role(this, `${lambdaId}Role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        cloudwatch: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [
                `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`,
              ],
            }),
          ],
        }),
        ...policies,
      },
    });
    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'CloudWatch log group',
          appliesTo: [
            {
              regex: '/log-group:/aws/lambda/*/',
            },
          ],
        },
      ],
      true
    );
    return role;
  }

  setupPutEvents() {
    //setup kinesis data stream
    const putEventsStream = new Stream(
      this,
      `${this.props.prefix}PutEventsStream`,
      {
        streamName: `${this.props.prefix}PutEventsStream`,
        streamMode: StreamMode.ON_DEMAND,
        encryption: StreamEncryption.MANAGED,
      }
    );
    if (this.apiUser) {
      putEventsStream.grantWrite(this.apiUser);
    }
    if (this.api) {
      //allow api gateway to write to kinesis data stream
      const apiGatewayRole = new Role(this, 'ApiKdsRole', {
        assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
      });
      putEventsStream.grantWrite(apiGatewayRole);
      //setup api gateway integration
      const eventsResource = this.api.root.addResource('events');
      eventsResource?.addMethod(
        'POST',
        new AwsIntegration({
          service: 'kinesis',
          action: 'PutRecord',
          options: {
            passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
            credentialsRole: apiGatewayRole,
            requestParameters: {
              'integration.request.header.Content-Type': "'application/json'", //x-amz-json-1.1
            },
            requestTemplates: {
              'application/json': `{ 
            "StreamName": "${putEventsStream.streamName}", 
            "Data": "$util.base64Encode($input.json('$.data'))", 
            "PartitionKey": "$input.path('$.partitionKey')" 
          }`,
            },
            integrationResponses: [
              {
                statusCode: '200',
                responseParameters: {
                  'method.response.header.Access-Control-Allow-Origin': "'*'", //TODO: change to specific allowed origin/domain
                  'method.response.header.Content-Type': "'application/json'",
                },
              },
              {
                statusCode: '500',
                responseTemplates: {
                  'text/html': 'Error',
                },
                selectionPattern: '500',
              },
            ],
          },
        }),
        {
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Content-Type': true,
                'method.response.header.Access-Control-Allow-Origin': true,
              },
            },
            {
              statusCode: '500',
            },
          ],
        }
      );
      //Add CDK Nag Suppressions
      NagSuppressions.addResourceSuppressions(
        eventsResource,
        [
          {
            id: 'AwsSolutions-APIG4',
            reason: 'API needs to be accessed by unauthenticated clients',
          },
          {
            id: 'AwsSolutions-COG4',
            reason: 'API needs to be accessed by unauthenticated clients',
          },
        ],
        true
      );
    }
    //setup lambda to read from kinesis, and put events to personalize
    const putEventsLambdaRole = this.setupLambdaRole('PutEventsLambda', {
      personalize: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ['personalize:PutEvents'],
            //resources: [`arn:${this.partition}:personalize:${this.region}:${this.account}:event-tracker/*`]
            resources: ['*'], //FIXME: adding a specific event tracker ARN gets an access denied error
          }),
        ],
      }),
    });
    const putEventsLambda = new Function(this, 'PutEventsLambda', {
      code: Code.fromAsset(join(__dirname, '..', 'lambda', 'put-events')),
      handler: 'index.handler',
      architecture: Architecture.ARM_64,
      runtime: Runtime.PYTHON_3_9,
      environment: {
        eventTrackingId: this.props.clickStreamEventTrackingId,
      },
      role: putEventsLambdaRole,
    });
    putEventsLambda.addEventSource(
      new KinesisEventSource(putEventsStream, {
        startingPosition: StartingPosition.TRIM_HORIZON,
      })
    );
    putEventsStream.grantRead(putEventsLambda.grantPrincipal);
    //uncomment below to setup kinesis data firehose to s3 destination
    /*
    new DeliveryStream(this, 'EventsDeliveryStream', {
      sourceStream: putEventsStream,
      destinations: [new S3Bucket(this.setupBucket('Events'))]
    });
    */
    NagSuppressions.addResourceSuppressions(
      putEventsLambdaRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Personalize event tracker resource cannot be scoped down',
        },
      ],
      true
    );
  }

  setupCrossSellRecommendations() {
    //similar items dynamodb table
    this.simItemsTable = new Table(this, 'SimilarItemsTable', {
      partitionKey: {
        name: this.props.partitionKeyName,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    });
    //setup api gateway resource, and method with lambda resolver
    const crossSellApiLambdaRole = this.setupLambdaRole('CrossSellApiLambda', {
      dynamodb: new PolicyDocument({
        statements: [
          new PolicyStatement({
            resources: [this.simItemsTable.tableArn],
            actions: ['dynamodb:BatchGetItem'],
          }),
        ],
      }),
      personalize: new PolicyDocument({
        statements: [
          new PolicyStatement({
            resources: [
              `arn:${this.partition}:personalize:${this.region}:${this.account}:campaign/${this.props.personalizedRankingCampaignName}`,
            ],
            actions: ['personalize:GetPersonalizedRanking'],
          }),
        ],
      }),
    });
    const crossSellApiLambda = new Function(this, 'CrossSellApiLambda', {
      code: Code.fromAsset(join(__dirname, '..', 'lambda', 'cross-sell-api')),
      handler: 'index.handler',
      architecture: Architecture.ARM_64,
      runtime: Runtime.PYTHON_3_9,
      functionName: `${this.props.prefix}CrossSellRecommendations`, //fixing the name for external references
      environment: {
        rankingCampaignArn: `arn:${this.partition}:personalize:${this.region}:${this.account}:campaign/${this.props.personalizedRankingCampaignName}`, //TODO: change to campaign created using CDK
        simItemsTableName: this.simItemsTable.tableName,
        itemsTableName: this.itemsTable.tableName,
        partitionKeyName: this.props.partitionKeyName,
      },
      role: crossSellApiLambdaRole,
    });
    if (this.apiUser) {
      crossSellApiLambda.grantInvoke(this.apiUser);
    }
    if (this.api) {
      const crossSellResource = this.api.root.addResource(
        'cross-sell-recommendations'
      );
      crossSellResource.addMethod(
        'GET',
        new LambdaIntegration(crossSellApiLambda),
        {
          apiKeyRequired: false, //setting to false to avoid CORS pre-flight
        }
      );
      //Add CDK Nag Suppressions
      NagSuppressions.addResourceSuppressions(
        crossSellResource,
        [
          {
            id: 'AwsSolutions-APIG4',
            reason: 'API needs to be accessed by unauthenticated clients',
          },
          {
            id: 'AwsSolutions-COG4',
            reason: 'API needs to be accessed by unauthenticated clients',
          },
        ],
        true
      );
    }
    //similar items batch job resources
    //role for personalize to assume
    const similarItemsPersonalizeRole = new Role(
      this,
      'SimilarItemsBatchInference',
      {
        assumedBy: new ServicePrincipal('personalize.amazonaws.com'),
        inlinePolicies: {
          s3: new PolicyDocument({
            statements: [
              new PolicyStatement({
                resources: [
                  `arn:aws:s3:::${this.inputBucket.bucketName}`,
                  `arn:aws:s3:::${this.inputBucket.bucketName}/*`,
                  `arn:aws:s3:::${this.outputBucket.bucketName}`,
                  `arn:aws:s3:::${this.outputBucket.bucketName}/*`,
                ],
                actions: ['s3:GetObject', 's3:ListBucket', 's3:PutObject'],
              }),
            ],
          }),
        },
      }
    );
    NagSuppressions.addResourceSuppressions(
      similarItemsPersonalizeRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'S3 objects policies',
          appliesTo: [
            {
              regex: '/Resource::arn:aws:s3/',
            },
          ],
        },
      ],
      true
    );
    //lambda to trigger similar items batch job
    const similarItemsStartBatchJobRole = this.setupLambdaRole(
      'SimilarItemsStartBatchJobLambda',
      {
        personalize: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                `arn:${this.partition}:personalize:${this.region}:${this.account}:batch-inference-job/*`,
              ],
              actions: ['personalize:CreateBatchInferenceJob'],
            }),
          ],
        }),
        iam: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [similarItemsPersonalizeRole.roleArn],
              actions: ['iam:PassRole'],
            }),
          ],
        }),
      }
    );
    NagSuppressions.addResourceSuppressions(
      similarItemsStartBatchJobRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Personalize batch job requires * in resource ARN',
          appliesTo: [
            {
              regex: '/batch-inference-job/',
            },
          ],
        },
      ],
      true
    );
    const similarItemsStartBatchJobLambda = new Function(
      this,
      'SimilarItemsStartBatchJobLambda',
      {
        code: Code.fromAsset(
          join(__dirname, '..', 'lambda', 'similar-items-start-batch-job')
        ),
        handler: 'index.handler',
        architecture: Architecture.ARM_64,
        runtime: Runtime.PYTHON_3_9,
        environment: {
          roleARN: similarItemsPersonalizeRole.roleArn,
          simSolutionVersionARN: `arn:${this.partition}:personalize:${this.region}:${this.account}:solution/${this.props.simSolutionVersion}`, //TODO: change to specific solution version created using CDK
          inputBucket: this.inputBucket.bucketName,
          outputBucket: this.outputBucket.bucketName,
          inputKey: 'items.jsonl',
          s3OpPrefix: 'dataset/batched_output', //TODO: use separate output bucket
          numSimilarItems: this.props.similarItems,
        },
        role: similarItemsStartBatchJobRole,
      }
    );
    //event bridge timer
    new Rule(this, 'SimilarItemsBatchJobScheduleRule', {
      schedule: Schedule.cron({ minute: '0', hour: '0' }), //TODO: change to appropriate frequency. currently set to 12am each day
      targets: [new LambdaFunction(similarItemsStartBatchJobLambda)],
    });
    //lambda to process similar items batch job results
    const similarItemsProcessResultsRole = this.setupLambdaRole(
      'SimilarItemsProcessResultsLambda',
      {
        dynamodb: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [this.simItemsTable.tableArn],
              actions: ['dynamodb:BatchWriteItem'],
            }),
          ],
        }),
        s3: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                `${this.inputBucket.bucketArn}/*`,
                `${this.outputBucket.bucketArn}/*`,
              ],
              actions: ['s3:GetObject'],
            }),
          ],
        }),
      }
    );
    NagSuppressions.addResourceSuppressions(
      similarItemsProcessResultsRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'S3 objects policies',
          appliesTo: [
            {
              regex: '/SimilarItems/',
            },
          ],
        },
      ],
      true
    );
    const similarItemsProcessResultsLambda = new Function(
      this,
      'SimilarItemsProcessResultsLambda',
      {
        code: Code.fromAsset(
          join(__dirname, '..', 'lambda', 'similar-items-process-results')
        ),
        handler: 'index.handler',
        architecture: Architecture.ARM_64,
        runtime: Runtime.PYTHON_3_9,
        memorySize: 512,
        environment: {
          partitionKeyName: this.props.partitionKeyName,
          simItemsTableName: this.simItemsTable.tableName,
          inputBucket: this.inputBucket.bucketName,
          inputItemsFileKey: 'dataset/uploads/items/items.csv',
        },
        role: similarItemsProcessResultsRole,
      }
    );
    //trigger lambda when objects are created in output bucket
    similarItemsProcessResultsLambda.addEventSource(
      new S3EventSource(this.outputBucket, {
        events: [EventType.OBJECT_CREATED],
      })
    );
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/RE/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/Resource',
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CDK created s3 notifications handler',
        },
      ]
    );
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/RE/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy/Resource',
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'CDK created s3 notifications handler',
        },
      ]
    );
  }

  setupUserRecommendations() {
    //setup api gateway resource, and method with lambda resolver
    const userRecommendationsApiLambdaRole = this.setupLambdaRole(
      'UserRecommendationsApiLambda',
      {
        personalize: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['personalize:GetRecommendations'],
              resources: [
                `arn:${this.partition}:personalize:${this.region}:${this.account}:recommender/${this.props.recommendedForYouName}`,
              ],
            }),
          ],
        }),
      }
    );
    const userRecommendationsApiLambda = new Function(
      this,
      'UserRecommendationsApiLambda',
      {
        code: Code.fromAsset(
          join(__dirname, '..', 'lambda', 'user-recommendations-api')
        ),
        handler: 'index.handler',
        architecture: Architecture.ARM_64,
        runtime: Runtime.PYTHON_3_9,
        functionName: `${this.props.prefix}UserRecommendations`, //fixing the name for external references
        environment: {
          inputBucket: this.inputBucket.bucketName,
          inputItemsFileKey: 'dataset/uploads/items/items.csv',
          recommendedForYouArn: `arn:${this.partition}:personalize:${this.region}:${this.account}:recommender/${this.props.recommendedForYouName}`,
        },
        role: userRecommendationsApiLambdaRole,
      }
    );
    this.api?.root
      .addResource('recommendations-for-you')
      .addMethod('GET', new LambdaIntegration(userRecommendationsApiLambda));
  }

  putItemsWorkFlow() {
    //items (Inventory) dynamodb table
    this.itemsTable = new Table(this, 'ItemsTable', {
      partitionKey: {
        name: this.props.partitionKeyName,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    });
    //setup api gateway resource, and method with lambda resolver
    const putItemsApiLambdaRole = this.setupLambdaRole('PutItemsApiLambda', {
      dynamodb: new PolicyDocument({
        statements: [
          new PolicyStatement({
            resources: [this.itemsTable.tableArn],
            actions: ['dynamodb:UpdateItem'],
          }),
        ],
      }),
      personalize: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ['personalize:PutItems'],
            resources: [
              `arn:${this.partition}:personalize:${this.region}:${this.account}:dataset/${this.props.itemsDataset}`,
            ],
          }),
        ],
      }),
    });
    const putItemsApiLambda = new Function(this, 'PutItemsApiLambda', {
      code: Code.fromAsset(join(__dirname, '..', 'lambda', 'put-items-api')),
      handler: 'index.handler',
      architecture: Architecture.ARM_64,
      runtime: Runtime.PYTHON_3_9,
      functionName: `${this.props.prefix}PutItems`, //fixing the name for external references
      environment: {
        itemsTableName: this.itemsTable.tableName,
        partitionKeyName: this.props.partitionKeyName,
        itemsDatasetArn: `arn:${this.partition}:personalize:${this.region}:${this.account}:dataset/${this.props.itemsDataset}`,
      },
      role: putItemsApiLambdaRole,
    });
    this.api?.root
      .addResource('items')
      .addMethod('POST', new LambdaIntegration(putItemsApiLambda));
  }

  setupWebsiteDistribution() {
    //setup cloudfront
    const distribution = new Distribution(this, 'RecommendationsDistribution', {
      defaultBehavior: {
        origin: new S3Origin(this.websiteBucket),
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        //redirect 404 errors to support React Router browser history/deep linking
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      geoRestriction: GeoRestriction.allowlist('US', 'LU', 'IE'), //allow list US, Luxembourg and Ireland
      enableLogging: true,
      logBucket: this.distributionAccessLogsBucket,
    });
    this.websiteDistribution = distribution;
    this.domainName = distribution.distributionDomainName;
    new CfnOutput(this, 'RecommendationsWebsiteDomain', {
      value: distribution.distributionDomainName,
    });
    //TODO: setup WAF
    //Note: the setup below will not work unless the whole stack is deployed in us-east-1 region as CLOUDFRONT scope for WAF is only applicable for us-east-1. The workaround for this will be to deploy the website stack + distribution in us-east-1 and use SSM to get the required runtimeConfig parameters from the region where api stack is deployed
    //new WafwebaclToCloudFront(this, 'WebsiteWaf', {
    //  existingCloudFrontWebDistribution: distribution
    //});
    NagSuppressions.addResourceSuppressions(
      distribution,
      [
        { id: 'AwsSolutions-CFR2', reason: 'Demo website' },
        { id: 'AwsSolutions-CFR3', reason: 'Demo website' },
        { id: 'AwsSolutions-CFR4', reason: 'Demo website' },
      ],
      true
    );
  }

  deployWebsite = () => {
    //deploy files, and config
    new BucketDeployment(this, 'DeployWebsite', {
      sources: [
        Source.asset(
          join(
            __dirname,
            '..',
            '..',
            '..',
            '..',
            'dist',
            'packages',
            'demo-website'
          )
        ),
        Source.data(
          'assets/runtime-config.js',
          `window.runtimeConfig={
          apiUrl: '${this.props.apiUrl || this.api.url}',
          apiKey: '${this.apiKey}'
        }`
        ),
      ],
      destinationBucket: this.websiteBucket,
      distribution: this.websiteDistribution,
      distributionPaths: ['/index.html'], //distribution paths to invalidate
    });
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/RE/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/Resource',
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CDK BucketDeployment L2 construct',
        },
      ],
      true
    );
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/RE/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/DefaultPolicy/Resource',
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'CDK BucketDeployment L2 construct',
        },
      ],
      true
    );
  };

  setupApiUser = () => {
    const user = new User(this, 'ApiUser');
    this.apiUser = user;
    //add actions required by the connector
    user.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'kinesis:ListStreams',
          'dynamodb:ListTables',
          'lambda:ListFunctions',
          'cloudwatch:PutMetricData',
        ],
        resources: ['*'],
      })
    );
    //create an access key
    const accessKey = new AccessKey(this, 'ApiUserAccessKey', {
      user,
    });
    //store secret access key in secrets manager
    const secret = new Secret(this, 'REApiUserSecret', {
      secretStringValue: accessKey.secretAccessKey,
    });
    NagSuppressions.addResourceSuppressions(
      user,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Actions specified do not support resource scoping',
        },
      ],
      true
    );
    NagSuppressions.addResourceSuppressions(
      secret,
      [
        {
          id: 'AwsSolutions-SMG4',
          reason:
            'Secret is used in external application where it cannot be rotated/updated automatically',
        },
      ],
      true
    );
  };
}
