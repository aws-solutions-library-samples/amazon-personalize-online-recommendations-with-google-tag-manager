# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import json
import os
import base64
from helper import *


def handler(event, context):
    event_tracking_id = os.environ['eventTrackingId']

    kinesis_data_list = event['Records']
    for li in kinesis_data_list:
        data = li['kinesis']['data']
        input_payload = json.loads(base64.b64decode(data))
        user_id = input_payload['user']
        item_id = input_payload['product']
        try:
            session_id = input_payload['session']
        except:
            session_id = user_id

        response = send_website_click(user_id, item_id, session_id,
                                      event_tracking_id)

        print(response)

    return {'statusCode': 200, 'body': response}
