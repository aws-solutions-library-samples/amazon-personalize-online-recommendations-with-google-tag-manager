# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import json
from helper import *

def handler(event, context):
    recommended_for_you_arn = os.environ['recommendedForYouArn']
    s3_ip_bucket = os.environ['inputBucket']
    s3_items_ip_key =  os.environ['inputItemsFileKey']

    ## Get user_id and item_list from the event.
    user_id = event['queryStringParameters']['user']
    
    # user_id = '299880'
    
    items_label_dict = read_csv_from_s3(s3_ip_bucket, s3_items_ip_key, 'ITEM_ID', 'NAME')
    
    ### Get recommendation from ARN
    recomm_list =get_recommended_for_you(user_id, recommended_for_you_arn)
    
    ### Add item label
    response_list = add_item_label(recomm_list, items_label_dict)
    
    print(response_list)
    return {
        'headers': {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
        'statusCode': 200,
        'body': json.dumps(response_list)
    }
