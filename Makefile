install:
	cd core-resources/cdk && npm install
deploy:
	cd core-resources/cdk && npm run deploy
synth:
	cd core-resources/cdk && npm run synth
update-storage:
	cd core-vpc && aws cloudformation update-stack --stack-name CoreVpc --capabilities CAPABILITY_NAMED_IAM --template-body file://cloudformation.yml --tags Key=service,Value=core-vpc
