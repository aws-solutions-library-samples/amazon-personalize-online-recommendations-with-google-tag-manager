# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import json
import urllib
import os
from helper import *

def handler(event, context):
    sim_items_table_name = os.environ['simItemsTableName']
    partition_key_name = os.environ['partitionKeyName']
    s3_ip_bucket = os.environ['inputBucket']
    s3_items_ip_key =  os.environ['inputItemsFileKey']
    
    # Get the object from the event and show its content type
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')

    # Sample S3 bucket for testing    
    # s3_ip_bucket = 'api-similaritemsinputa49dd15f-3va774qtoapp'
    # s3_items_ip_key = 'dataset/uploads/items/items.csv'
    # bucket = 'api-similaritemsoutput8fba22f3-10sfuts1akax5' 
    # key = 'dataset/batched_output/items.jsonl.out'

    items_label_dict = read_csv_from_s3(s3_ip_bucket, s3_items_ip_key, 'ITEM_ID', 'NAME')

    sim_items_dict = read_json_from_s3(bucket, key, items_label_dict)
    # print(sim_items_dict)
    response = dump_dict_in_dynamodb(sim_items_table_name, partition_key_name, sim_items_dict)
    
    print(response)
    return {
        'statusCode': 200,
        'body': json.dumps(response)
    }
