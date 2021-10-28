pipeline {
    agent {
        label 'deployer-slave-amazon-linux'
    }
    
    options {
        timeout(time: 90, unit: 'MINUTES')
    }

    stages {
        stage('Install CDK Packages'){
            steps{
                dir('cdk'){ sh 'npm install'}
            }
        }
       
        stage('CDK Deploy'){
            steps{
                dir('cdk'){ sh 'npm run cdk-deploy'}
            }
        }
    }
}
