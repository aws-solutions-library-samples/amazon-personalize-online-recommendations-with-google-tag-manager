# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import json
from helper import *


def handler(event, context):
    sim_items_table_name = os.environ['simItemsTableName']
    items_table_name = os.environ['itemsTableName']
    reranking_campaign_arn = os.environ['rankingCampaignArn']
    partition_key_name = os.environ['partitionKeyName']

    # Get user_id and item_list from the event.
    try:
        user_id = event['queryStringParameters']['user']
    except:
        user_id = None
    item_list_str = event['queryStringParameters']['products']
    item_list =  item_list_str.split(",")
    try:
        store = event['queryStringParameters']['store']
    except:
        store = None

## For testing 
    # sim_items_table_name = 'RE-SimilarItemsTable19973610-OYI01F81V04H'
    # items_table_name = 'RE-ItemsTable5AAC2C46-U483L1G6EUB8'
    # reranking_campaign_arn = 'arn:aws:personalize:us-east-2:714508025012:campaign/personalize-demo-campaign-rerank-v2'
    # partition_key_name = "id"

    # user_id = '299880'
    # item_list = [
    #     'f9b60b83-4c16-472d-b579-461ec89eaac2',
    #     '4bcb9dea-5dc0-41b4-b086-382ea577ac96'
    # ]
    # store = "store1"

    sim_items_dict = batch_get_item_from_db(sim_items_table_name, item_list)
    sim_items_list = list(sim_items_dict.keys())
    
    if store == "" or store is None:
        available_items_list = sim_items_list
    else:
        available_items_list = get_available_items_for_store(partition_key_name, items_table_name, store, sim_items_list)

    if user_id == "" or user_id is None:
        response_list = add_labels_to_similar_items(available_items_list[:10], sim_items_dict)
    else:
        reranked_item_list = rerank_similar_items(user_id, available_items_list,
                                                  reranking_campaign_arn)[:10]
        response_list = add_labels_to_ranked_items(reranked_item_list, sim_items_dict)

    print(response_list)

    return {
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        },
        'statusCode': 200,
        'body': json.dumps(response_list)
    }