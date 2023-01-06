# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
from helper import *


def handler(event, context):
    items_table_name = os.environ['itemsTableName']
    partition_key_name = os.environ['partitionKeyName']
    item_dataset_arn = os.environ['itemsDatasetArn']

    ## Get item_id, store_id and num_of_stocks
    item_id = event['queryStringParameters']['product']
    store = event['queryStringParameters']['store']
    quantity = int(event['queryStringParameters']['quantity'])

    # This is for testing only
    # item_id = 'e1669081-8ffc-4dec-97a6-e9176d7f6651'
    # store_id = 'store11'
    # current_stock = 11

    partition_key_val = item_id

    available_store_response = update_store_inventory_in_ddb(items_table_name, partition_key_name, partition_key_val,  "storeInventory", "storeIdsAvailable", store, quantity)
    item_dict = available_store_response['Attributes']
    set_ = item_dict['storeIdsAvailable']
    print(set_)

    response = put_item_in_dataset(item_dict, item_dataset_arn)

    return {
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        },
        'statusCode': 200,
        'body': json.dumps(response)
    }
