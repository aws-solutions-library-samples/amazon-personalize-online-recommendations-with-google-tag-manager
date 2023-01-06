# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import csv

personalize_runtime = boto3.client('personalize-runtime')
s3_resource = boto3.resource('s3')

def read_csv_from_s3(bucket, key, key_col_name, val_col_name):
    s3_object = s3_resource.Object(bucket, key)
    data = s3_object.get()['Body'].read().decode('utf-8').splitlines()

    response = {}
    lines = csv.reader(data)
    headers = next(lines)
    key_col_index = headers.index(key_col_name)
    val_col_index = headers.index(val_col_name)
    for line in lines:
        item_id = line[key_col_index]
        label = line[val_col_index]
        response[item_id] =  label
    return response

def get_recommended_for_you(user_id, recommended_for_you_arn, num_of_results=10):
    response = personalize_runtime.get_recommendations(
            recommenderArn = recommended_for_you_arn,
            userId = user_id,
            numResults = num_of_results
    )
    return response['itemList']

def add_item_label(recomm_list, items_label_dict):
    for l in recomm_list:
        item_id = l['itemId']
        label = items_label_dict[item_id].capitalize()
        l['label'] = label
        
    return recomm_list    
