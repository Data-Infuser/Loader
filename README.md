# Loader
> ``Data Infuser`` / Loader 프로젝트 입니다.

Data Infuser 프로젝트에서 원천 데이터를 프로젝트 DB내에 로드하고, 원천 데이터의 Meta data를 읽는 모듈입니다.

Scheduled Queue를 기반으로 작업을 처리합니다.

## 1. Environment
 * nodeJS v12.16.3
 * MySQL 8.0.x

## 2. Installation

 * ormconfig-sample.json을 복사하여 ormconfig.json 설정
 * property-sample.json을 복사하여 property.json 설정
 * typeorm global 설치
   > npm install typeorm -g
 * package 설치
   > npm install

  ### File System 설정
  * 파일 저장은 S3 또는 local file system 두가지가 선택이 가능합니다.

  |타입|설명|
  |-----|------|
  |local|로컬 파일 시스템에 파일을 저장하는 경우 사용합니다. node js 기본 라이브러리인 fs를 사용합니다.|
  |s3|AWS s3 또는 ncloud ObjStrg를 사용하는 경우 사용합니다. aws-sdk를 사용하여 파일 관리를 합니다.|

  * 파일 저장소 사용시 설정 예시
  ```
  "uploadDist": {
    "type": "local",
    "localPath": "/Users/chunghyup/projects/api-gen/api-designer/server/upload",
    "awsConfigPath": "",
    "s3Bucket": ""
  }
  ```

  * S3 저장소 사용시 설정 예시
  ```
  "uploadDist": {
    "type": "s3",
    "localPath": "",
    "awsConfigPath": "./src/config/aws-config.json",
    "s3Bucket": "data-infuser-test"
  }
  ```

  환경 변수를 이용하여 AWS를 설정하는 경우 awsConfigPath를 'aws'로 설정
  
  |환경변수|설명|
  |---|---|
  |AWS_ACCESS_KEY_ID|aws credential access key id|
  |AWS_SECRET_ACCESS_KEY|aws credential secret access key|
  

## 3. Usage

> npm start

ts-node-dev를 이용하여 실행하기 때문에 코드 수정 후 저장을 하는 경우 자동으로 재시작됩니다.

## 4. DEPLOY

> cp property-sample.json property-stage

스테이지용 property 파일 생성 후 값 설정

> npm run deploy-stage

* Stage 서버 접근 권한이 필요합니다.

## 5. Meta

Promptechnology - [@Homepage](http://www.promptech.co.kr/) - [dev@promptech.co.kr](dev@promptech.co.kr)

프로젝트는 GPL 2.0 라이센스로 배포되었습니다. 자세한 사항은 ``LICENSE`` 파일을 확인해주세요.

Distributed under the GPL 2.0 license. See ``LICENSE`` for more information.

## 6. Support
![alt text](http://wisepaip.org/assets/home/promptech-d8574a0910561aaea077bc759b1cf94c07baecc551f034ee9c7e830572d671de.png "Title Text")
