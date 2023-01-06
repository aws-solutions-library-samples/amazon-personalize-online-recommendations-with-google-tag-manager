# MuleSoft App for Personalize API
The package includes the API definition (RAML), and MuleSoft app. Note that this is an optional step and the sample code uses Amazon API Gateway by default instead of MuleSoft unless you provide an apiUrl at the time of deployment  

## Setup
* Signup for a MuleSoft AnyPoint platform account 
* Download AnyPoint Studio
* Open this package/project using AnyPoint Studio
* Create a new `config.properties` under `src/main/resources` folder with the following keys
```
https.port=8082
keystore.keypass=***
keystore.storepass=***
keystore.alias=mule
aws.accessKey=***
aws.secretKey=***
aws.region=us-east-2
aws.lambda.crossSellRecommendations=CrossSellRecommendations
aws.lambda.putItems=PutItems
aws.kinesis.eventsStream=PutEventsStream
```
* Create a Java key store with the following command after replacing keypass, and storepass values
```
keytool -genkeypair -keystore keystore.jks -dname "CN=localhost, OU=Unknown, O=Unknown, L=Unknown, ST=Unknown, C=Unknown" -keypass ***  -storepass ***  -keyalg RSA  -keysize 2048  -alias mule  -ext SAN=DNS:localhost,IP:127.0.0.1 -validity 9999
```