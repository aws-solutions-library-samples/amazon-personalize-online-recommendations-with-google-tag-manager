# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import json
import boto3
import time
import csv

s3_resource = boto3.resource('s3')
dynamodb_resource = boto3.resource('dynamodb')

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
    
def read_json_from_s3(bucket, key, items_label_dict):
    response = {}
    obj = s3_resource.Object(bucket, key)
    fileContents = obj.get()['Body'].read().decode("utf-8")
    lines = fileContents.split("\n")
    lines = list(filter(None, lines))
    
    for line in lines:
        # print(line)
        line= json.loads(line)
        item_id = line['input']['itemId']
        sim_items = line['output']['recommendedItems']
        ## Lets get Dict for each item in list
        dict_ = get_labels_for_item_id(sim_items, items_label_dict)
        response[item_id] = dict_
    return response

def get_labels_for_item_id(item_id_list, items_label_dict):
    item_id_dict = {}
    for item_id in item_id_list:
        label = items_label_dict[item_id]    ## read from CSV
        item_id_dict[item_id] = label
    return item_id_dict
    

def dump_dict_in_dynamodb(table_name, partition_key_name, sim_items_dict):
    response = ""
    table = dynamodb_resource.Table(table_name)
    total_items = len(sim_items_dict)
    tic = time.time()
    try:
        with table.batch_writer() as batch:
            for key, val in sim_items_dict.items():
                batch.put_item(
                    Item={
                        partition_key_name: key,
                        'recommendedItems': val
                    }
                )
        toc = time.time()
        exec_time = round((toc-tic)/60, 2)
        response = "time took to put {} items in dynamoDb is {} minutes".format(total_items, exec_time)
            
    except Exception as e:
        response = e
    
    return response
