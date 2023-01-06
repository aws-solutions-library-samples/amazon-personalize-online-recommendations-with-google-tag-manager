# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3

personalize_runtime = boto3.client('personalize-runtime')
dynamodb_resource = boto3.resource('dynamodb')


def batch_get_item_from_db(table_name, item_list):
    key_list = []
    for item in item_list:
        temp = {'id': item}
        key_list.append(temp)

    batch_response = dynamodb_resource.batch_get_item(
        RequestItems={table_name: {
            'Keys': key_list,
            'ConsistentRead': False
        }},
        ReturnConsumedCapacity='TOTAL')

    response_dict = {}
    for res in batch_response['Responses'][table_name]:
        recommended_item_col = res['recommendedItems']
        for item, label in recommended_item_col.items():
            if item not in item_list:  # TO not show selected item in recommended list
                response_dict[item] = label

    return response_dict


def get_available_items_for_store(partition_key_name, table_name, store,
                                  sim_items_list):

    key_list = []

    for item in sim_items_list:
        dict_ = {}
        dict_[partition_key_name] = item
        key_list.append(dict_)

    response = dynamodb_resource.batch_get_item(
        RequestItems={table_name: {
            'Keys': key_list,
            'ConsistentRead': False
        }},
        ReturnConsumedCapacity='TOTAL')
    res = response['Responses'][table_name]

    available_items_list = []

    for row in res:
        if store in row['storeIdsAvailable']:
            available_items_list.append(row[partition_key_name])
    return available_items_list


def rerank_similar_items(user_id, item_list, reranking_campaign_arn):
    response = personalize_runtime.get_personalized_ranking(
        campaignArn=reranking_campaign_arn,
        userId=user_id,
        inputList=item_list)
    return response['personalizedRanking']


def add_labels_to_similar_items(sim_items_list, sim_items_dict):
    res_list = []
    for item_id in sim_items_list:
        label = sim_items_dict[item_id]
        ## getSimilarItems doesn't return any Score so we are setting it to 0.1 default
        dict_ = {'itemId': item_id, 'label': label, 'score': 0.1}
        res_list.append(dict_)
    return res_list


def add_labels_to_ranked_items(reranked_item_list, sim_items_dict):
    for l in reranked_item_list:
        item_id = l['itemId']
        label = sim_items_dict[item_id]
        l['label'] = label
    return reranked_item_list
