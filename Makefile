install:
	cd core-resources/cdk && npm install
deploy:
	cd core-resources/cdk && npm run deploy
synth:
	cd core-resources/cdk && npm run synth
update-storage:
	cd core-storage && aws cloudformation update-stack --stack-name CoreStorage --capabilities CAPABILITY_NAMED_IAM --template-body file://cloudformation.yml --tags Key=service,Value=core-storage
