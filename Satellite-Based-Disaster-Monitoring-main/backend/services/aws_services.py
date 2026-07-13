import uuid
import boto3
import os
from botocore.exceptions import NoCredentialsError


AWS_ACCESS_KEY = "AKIATQEFB32WLNECHB2G"
AWS_SECRET_KEY = "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"
REGION = "eu-north-1"

# S3 Client
s3_client = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=REGION)

# DynamoDB Resource
dynamodb = boto3.resource('dynamodb', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=REGION)
table = dynamodb.Table('disateralert') # మీ DynamoDB టేబుల్ పేరు

# SNS Client
sns_client = boto3.client('sns', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=REGION)
SNS_TOPIC_ARN = "arn:aws:sns:eu-north-1:240797212332:disasteralerts"

def upload_image_to_s3(file_obj, bucket_name, s3_path):
    try:
        s3_client.upload_fileobj(file_obj, bucket_name, s3_path)
        url = f"https://{bucket_name}.s3.{REGION}.amazonaws.com/{s3_path}"
        return url
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        return None

def save_report_to_dynamodb(report_data):
    try:
        if 'report-id' not in report_data:
            report_data['report-id'] = str(uuid.uuid4())
        table.put_item(Item=report_data)
        return True
    except Exception as e:
        print(f"DynamoDB Error: {e}")
        return False

def send_sns_alert(message):
    try:
        sns_client.publish(TopicArn=SNS_TOPIC_ARN, Message=message, Subject="Disaster Notification")
        return True
    except Exception as e:
        print(f"SNS Error: {e}")
        return False