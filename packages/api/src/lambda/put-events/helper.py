# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import time
import json

personalize_events_client= boto3.client('personalize-events')

def send_website_click(user_id, item_id, session_id, event_tracking_id):
    event = {
    "itemId": str(item_id),
    }
    event_json = json.dumps(event)
        
    # Make Call
    response = personalize_events_client.put_events(
            trackingId = event_tracking_id,
            userId= user_id,
            sessionId = session_id,
            eventList = [{
                'sentAt': int(time.time()),
                'eventType': 'View',
                'properties': event_json
                }]
        )
    return response

