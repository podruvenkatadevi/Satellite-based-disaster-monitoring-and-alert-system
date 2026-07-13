import boto3
import os

sns_client = boto3.client(
    "sns",
    region_name=os.getenv("AWS_REGION", "eu-north-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
)

SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN")
SNS_TOPIC_ARN = "arn:aws:sns:eu-north-1:240797212332:disasteralerts"  # Replace with your actual SNS topic ARN

def send_high_severity_alert(record: dict) -> None:
    try:
        message = (
            f"Disaster Alert!\n"
            f"Type: {record.get('type')}\n"
            f"Location: {record.get('location')}\n"
            f"Confidence: {record.get('confidence')}%\n"
            f"ID: {record.get('id')}"
        )
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=message,
            Subject="High-Severity Disaster Alert"
        )
        print("[SNS] Real alert dispatched:", message)
    except Exception as e:
        print(f"SNS Error: {e}")
