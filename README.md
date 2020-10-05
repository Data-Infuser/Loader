# Loader
> ``Data Infuser`` / Loader 프로젝트 입니다.

Data Infuser 프로젝트에서 원천 데이터를 프로젝트 DB내에 로드하고, 원천 데이터의 Meta data를 읽는 모듈입니다.

Scheduled Queue를 기반으로 작업을 처리합니다.

## Environment
 * nodeJS v12.16.3
 * MySQL 8.0.x

## Installation

 * ormconfig-sample.json을 복사하여 ormconfig.json 설정
 * property-sample.json을 복사하여 property.json 설정
 * typeorm global 설치
   > npm install typeorm -g
 * package 설치
   > npm install

## Usage

> npm start

ts-node-dev를 이용하여 실행하기 때문에 코드 수정 후 저장을 하는 경우 자동으로 재시작됩니다.

## DEPLOY

> cp property-sample.json property-stage

스테이지용 property 파일 생성 후 값 설정

> npm run deploy-stage

* Stage 서버 접근 권한이 필요합니다.

## Meta

Promptechnology - [@Homepage](http://www.promptech.co.kr/) - [dev@promptech.co.kr](dev@promptech.co.kr)

프로젝트는 GPL 2.0 라이센스로 배포되었습니다. 자세한 사항은 ``LICENSE`` 파일을 확인해주세요.

Distributed under the GPL 2.0 license. See ``LICENSE`` for more information.

## Support
![alt text](http://wisepaip.org/assets/home/promptech-d8574a0910561aaea077bc759b1cf94c07baecc551f034ee9c7e830572d671de.png "Title Text")
