# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
from helper import *

def handler(event, context):
    s3_input_bucket = os.environ['inputBucket']
    s3_input_key = os.environ['inputKey']
    s3_output_bucket = os.environ['outputBucket']
    s3_output_prefix = os.environ['s3OpPrefix'] + "/"
    sim_solution_version_arn = os.environ['simSolutionVersionARN']
    role_arn = os.environ['roleARN']
    num_similar_items = os.environ['numSimilarItems']
    
    #key = 'dataset/uploads/items/items_sample.jsonl'

    s3_input_path = "s3://{}/{}".format(s3_input_bucket, s3_input_key)
    s3_output_path = "s3://{}/{}".format(s3_output_bucket, s3_output_prefix)
    
    print(s3_input_path)
    print(s3_output_path)
    response = run_batch_inference_job(sim_solution_version_arn, s3_input_path, s3_output_path, role_arn, num_similar_items)
    
    batchInferenceJobArn = response['batchInferenceJobArn']
    print(batchInferenceJobArn)
    
    return {
        'statusCode': 200,
        'batchInferenceJobArn': batchInferenceJobArn
    }
