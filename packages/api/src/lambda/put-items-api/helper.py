# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import json
from datetime import datetime

dynamodb_resource = boto3.resource('dynamodb')
personalize_events_client = boto3.client('personalize-events')

def update_store_inventory_in_ddb(table_name, partition_key_name, partition_key_val, attribute_name1, attribute_name2 , store_id, stock):

    table = dynamodb_resource.Table(table_name)
    update_expression = "SET #attr_name1.#dict_key = :val1"
    
    if stock != 0:
        update_expression = update_expression+ " " + "ADD #attr_name2 :val2"
    else:
        update_expression = update_expression+ " " + "DELETE #attr_name2 :val2"

    response = table.update_item(
                                    Key={
                                        partition_key_name : partition_key_val
                                    },
                                    UpdateExpression=update_expression,
                                    ExpressionAttributeNames = {
                                           '#attr_name1' : attribute_name1,
                                           '#attr_name2' : attribute_name2,
                                            '#dict_key' : store_id
                                    },
                                    ExpressionAttributeValues={
                                        ':val1': stock,
                                        ':val2': {store_id}
                                    },
                                    ReturnValues = 'ALL_NEW'
                            )
    return response

def put_item_in_dataset(item_dict, item_dataset_arn):
    dict_ = {}
    item_id = item_dict['id']
    dict_['storeIdsAvailable'] = "|".join(item_dict['storeIdsAvailable'])
    dict_['name'] = item_dict['name']
    dict_['categoryL1'] = item_dict['categoryL1']
    dict_['categoryL2'] = item_dict['categoryL2']
    dict_['productDescription'] = item_dict['productDescription']
    dict_['price'] = float(item_dict['price'])
    dict_['creationTimestamp'] = int(datetime.now().strftime('%s'))
    
    response = personalize_events_client.put_items(
            datasetArn=item_dataset_arn,
            items=[
                {
                    'itemId': item_id,
                    'properties': json.dumps(dict_)
                }
            ]
        )
    return response