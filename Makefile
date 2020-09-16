APP=loader
CONTAINER=infuser-loader

VERSION:=0.1
ENV:=dev #서비스 환경에 따라 dev, stage, prod로 구분

LOADER_PORT = 9093
NETWORK_OPTION=--publish $(LOADER_PORT):$(LOADER_PORT)

ifneq ($(OS),Windows_NT)
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Linux)
		NETWORK_OPTION=--network="host"
	endif
	ifeq ($(UNAME_S),Darwin)
		NETWORK_OPTION=--publish $(LOADER_PORT):$(LOADER_PORT)
	endif
endif

build:
	tsc -p .

docker-build:
	docker build --tag $(CONTAINER):$(VERSION) --build-arg=AUTHOR_ENV=$(ENV) .

run-docker:
	docker run --rm -v /home/ubuntu/designer-dist:/dist --detach $(NETWORK_OPTION) --name $(APP) $(CONTAINER):$(VERSION)

docker-log:
	docker logs --follow $(APP)

.PHONY: build docker run-docker docker-log

stage:
	sudo npm install
	sudo make build
	make docker-build
	-docker container stop $$(docker container ls -q --filter name=${APP}*)
	make run-docker