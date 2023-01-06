# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import datetime

personalize_client = boto3.client('personalize')

def run_batch_inference_job(sim_solution_version_arn, s3_input_path, s3_output_path, role_arn, num_similar_items):

    time_now = datetime.datetime.now().strftime("%d%m%Y%H%M%S")
    
    response = personalize_client.create_batch_inference_job (
                                                   solutionVersionArn = sim_solution_version_arn,
                                                   jobName = "sim-items-batch-inference-{}".format(time_now),
                                                   roleArn = role_arn,
                                                   jobInput = {"s3DataSource": {"path": s3_input_path}},
                                                   jobOutput = {"s3DataDestination": {"path": s3_output_path}},
                                                   numResults=int(num_similar_items)
                                                   )
    return response
