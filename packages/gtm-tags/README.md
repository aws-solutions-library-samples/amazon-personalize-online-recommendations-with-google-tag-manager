# Google Tagmanager tags for real-time recommendations
Use the following instructions and sample code for setting up the Google Tag Manager tags for your website

* Visit [Google Tagmanager](https://tagmanager.google.com/), and setup, and account, and container for the demo using instructions from [here](https://support.google.com/tagmanager/answer/6103696?hl=en). Copy the Container ID, and update the `gtmId` value in `demo-website/src/main.tsx`
* Create the following triggers
  * name: `Update Cart Event Trigger`, Trigger Type: `Custom Event`, Event name: `update-cart`
  * name `Product Page View Trigger`, Trigger Type: `History Change`, This trigger fires on: `Page Path` `contains` `product``update-cart`
* Create the following variables
  * name: `fetch`, type: `JavaScript Variable`, Global Variable Name: `fetch`
  * name: `setCrossSellRecommendations`, type: `JavaScript Variable`, Global Variable Name: `setCrossSellRecommendations`
  * name: `products`, type: `Data Layer Variable`, Data Layer Variable Name: `products`
  * name: `user`, type: `Data Layer Variable`, Data Layer Variable Name: `user`
* Create the following tags
  * name: `Cross Sell Recommendations`, Tag Type: `Custom HTML`, HTML: Copy the [cross-sell-recommendations.html](cross-sell-recommendations.html) file contents, Firing Triggers: `Update Cart Event Trigger`
  * name: `Product Page Views`, Tag Type: `Custom HTML`, HTML: Copy the [put-events.html](put-events.html) file contents, Firing Triggers: `Product Page View Trigger`
