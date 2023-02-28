# API infrastructure
Use this package to deploy the necessary AWS cloud infrastructure for Amazon API Gateway, AWS Lambda functions, and other resources that will serve as the connective tissue between Amazon Personalize and your website. 


Note: To deploy AWS Web Application Firewall (WAF) the setup below will not work unless the whole stack is deployed in us-east-1 region as CLOUDFRONT scope for WAF is only applicable for us-east-1. The workaround for this will be to deploy the website stack + distribution in us-east-1 and use SSM to get the required runtimeConfig parameters from the region where api stack is deployed

## Prerequisites
* A terminal/command window with a recent version of Node.js installed (v14+)
* Install Docker using instructions for your OS/environment. E.g. `sudo yum install docker` or for mac users `brew install docker`. AWS CDK uses docker for bundling the Python lambda functions

## Setting up environment variable
* Follow the instructions for setting up Amazon Personalize in your AWS account, and copy the following values from the AWS console and set them up as environment variables in the terminal/command window from which you will be deploying the API infrastructure
```
#Amazon Personalize > Dataset group > Campaigns > Campaign Name
export personalizedRankingCampaignName="personalized-ranking-campaign-name-sample"

#Amazon Personalize > Dataset group > Event trackers > Tracker name > Tracking ID
export clickStreamEventTrackingId="xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

#Amazon Personalize > Dataset group > Custom resources > Solutions and recipes > solution > Solution versions
export simSolutionVersion="sim-solution-name-sample/xxxxxxxx"

#Amazon Personalize > Dataset group > Datasets > Item dataset
export itemsDataset="dataset-group-name-sample/ITEMS"

#optionally setup an API URL if you are planning to use an external API service such as MuleSoft
#export apiUrl=""
```

## Deploying
* Navigate to the directory where you have checked out this respository: (e.g. `amazon-personalize-online-recommendations-with-google-tag-manager`) 
* Install packages: `npx yarn` 
* Build the website: `npx nx build demo-website` 
* Navigate to the directory `packages/api`
* Note: you will need the AWS account credentials for the AWS account where you are deploying setup in the environment
* Run CDK Bootstrap. This is required if this is the first CDK based application that you are deploying to the account
```
npx cdk bootstrap
```
* Deploy the infrastucture by running below command
```
npx cdk deploy
```