#Satellite-Based Disaster Monitoring System

## Project Description
This project detects disaster-related satellite images and stores the information in AWS.

## Technologies Used
- FastAPI
- React
- AWS S3
- AWS Lambda
- DynamoDB
- SNS
- API Gateway
- CloudWatch

   ## AWS Integration
- Amazon S3
- AWS Lambda
- Amazon DynamoDB
- Amazon SNS
- Amazon API Gateway
- Amazon CloudWatch

## Project Flow
1. User uploads an image.
2. Backend uploads the image to Amazon S3.
3. S3 triggers AWS Lambda.
4. Lambda stores details in DynamoDB.
5. Lambda sends an alert using Amazon SNS.
6. User receives an email notification.

## Team Modules
- Frontend: React
- Backend: FastAPI
- AWS: S3, Lambda, DynamoDB, SNS, API Gateway, CloudWatch
