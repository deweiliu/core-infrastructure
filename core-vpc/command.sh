aws cloudformation update-stack --stack-name CoreVpc --capabilities CAPABILITY_NAMED_IAM --template-body file://cloudformation.yml --tags Key=service,Value=core-vpc;
