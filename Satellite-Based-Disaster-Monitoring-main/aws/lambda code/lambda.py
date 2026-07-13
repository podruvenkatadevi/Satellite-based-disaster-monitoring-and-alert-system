import json
import boto3

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

table = dynamodb.Table('DisasterReports')

TOPIC_ARN = "arn:aws:sns:us-east-1:168960485046:DisasterAlerts"

def lambda_handler(event, context):

    bucket = event['Records'][0]['s3']['bucket']['name']
    image = event['Records'][0]['s3']['object']['key']

    print("Bucket :", bucket)
    print("Image :", image)

    table.put_item(
        Item={
            'report-id': image,
            'bucket': bucket,
            'status': 'Uploaded'
        }
    )

    print("Saved to DynamoDB")

    sns.publish(
        TopicArn=TOPIC_ARN,
        Subject="Disaster Alert",
        Message=f"New Disaster Image Uploaded\n\nBucket: {bucket}\nImage: {image}"
    )

    print("SNS Email Sent")

    return {
        'statusCode': 200,
        'body': json.dumps("Success")
    }
