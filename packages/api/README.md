# API infrastructure
Setup the API infrastructure

Note: To deploy AWS Web Application Firewall (WAF) the setup below will not work unless the whole stack is deployed in us-east-1 region as CLOUDFRONT scope for WAF is only applicable for us-east-1. The workaround for this will be to deploy the website stack + distribution in us-east-1 and use SSM to get the required runtimeConfig parameters from the region where api stack is deployed

## Deploying
* Navigate to the root of the repository `personalize-online-recommendations/`
* Setup the following environment variables in the terminal that you will be using for AWS CDK deployment. Replace the sample values given below with actual values from your AWS Console
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

* Ensure you have a recent version of Node.js installed (v14+)
* Install packages: `npx yarn` 
* Install Docker using instructions for your OS/environment. E.g. `sudo yum install docker` or for mac users `brew install docker`. AWS CDK uses docker for bundling the Python lambda functions. 
* Build the website: `npx nx build demo-website` 
* Navigate to the directory `personalize-online-recommendations/packages/api`
* Note: you will need the AWS account credentials for the AWS account where you are deploying setup in the environment
* Run CDK Bootstrap once, if required 
```
cdk bootstrap
```
* Deploy the infrastucture by running below command
```
cdk deploy
```